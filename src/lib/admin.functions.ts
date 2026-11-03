import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const accountSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional().default(""),
  vehicle: z.enum(["car", "motorcycle"]).optional().default("car"),
  role: z.enum(["admin", "restaurant", "courier", "customer"]),
});

const updateAccountSchema = z.object({
  id: z.string().uuid(),
  email: z.string().trim().email().max(255),
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional().default(""),
  vehicle: z.enum(["car", "motorcycle"]).optional(),
  password: z.string().min(8).max(72).optional().or(z.literal("")),
});

const approvalSchema = z.object({
  user_id: z.string().uuid(),
  application_id: z.string().uuid().optional().nullable(),
  approve: z.boolean(),
  reason: z.string().trim().max(500).optional().default(""),
});

type AuthedContext = {
  userId: string;
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
};

async function assertAdmin(context: AuthedContext) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => accountSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        phone: data.phone,
        vehicle: data.vehicle,
        role: data.role,
        status: "approved",
      },
    });
    if (error) throw new Error(error.message);
    if (!created.user) throw new Error("User creation failed");
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: created.user.id, role: data.role }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: created.user.id, full_name: data.full_name, phone: data.phone || null });
    return { id: created.user.id, email: data.email, role: data.role };
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateAccountSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.auth.admin.getUserById(data.id);
    const prevMeta = (existing?.user?.user_metadata ?? {}) as Record<string, unknown>;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      email: data.email,
      ...(data.password && data.password.length >= 8 ? { password: data.password } : {}),
      user_metadata: {
        ...prevMeta,
        full_name: data.full_name,
        phone: data.phone,
        ...(data.vehicle ? { vehicle: data.vehicle } : {}),
      },
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: data.id, full_name: data.full_name, phone: data.phone || null });

    await supabaseAdmin
      .from("staff_applications")
      .update({
        full_name: data.full_name,
        ...(data.vehicle ? { vehicle: data.vehicle } : {}),
      })
      .eq("user_id", data.id);

    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("order_live_locations").delete().eq("courier_id", data.id);
    await supabaseAdmin
      .from("orders")
      .update({ courier_id: null, courier_accepted_at: null })
      .eq("courier_id", data.id)
      .in("status", ["pending", "accepted", "preparing", "ready"]);
    await supabaseAdmin.from("courier_shifts").delete().eq("courier_id", data.id);
    await supabaseAdmin.from("staff_applications").delete().eq("user_id", data.id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    await supabaseAdmin.from("profiles").delete().eq("id", data.id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCourierApprovalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => approvalSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
    const prevMeta = (existing?.user?.user_metadata ?? {}) as Record<string, unknown>;

    if (data.approve) {
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: "courier" }, { onConflict: "user_id,role" });
      if (roleErr) throw new Error(roleErr.message);

      await supabaseAdmin
        .from("staff_applications")
        .update({
          status: "approved",
          rejection_reason: null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("user_id", data.user_id);

      await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        user_metadata: {
          ...prevMeta,
          role: "courier",
          status: "approved",
          rejection_reason: null,
          identity_violation_locked: false,
          identity_violation_pending: false,
          identity_violation_reason: null,
        },
      });
    } else {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", "courier");

      await supabaseAdmin
        .from("staff_applications")
        .update({
          status: "rejected",
          rejection_reason: data.reason || "تم رفض/إيقاف الحساب من الإدارة",
          reviewed_at: new Date().toISOString(),
        })
        .eq("user_id", data.user_id);

      await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        user_metadata: {
          ...prevMeta,
          status: "rejected",
          rejection_reason: data.reason || "تم رفض/إيقاف الحساب من الإدارة",
        },
      });
    }

    return { ok: true };
  });

export const approveJoinRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error: reqError } = await supabaseAdmin
      .from("join_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (reqError) throw new Error(reqError.message);
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error("Request already reviewed");

    const payload = (req.data ?? {}) as Record<string, string>;
    const email = (payload["email"] ?? "").trim();
    if (!email) throw new Error("Request has no email");
    const role = req.type === "restaurant" ? "restaurant" : "courier";
    const password = `${Math.random().toString(36).slice(-10)}Aa1!${Math.random().toString(36).slice(-4)}`;

    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: payload["full_name"] ?? payload["contact_name"] ?? "",
        phone: payload["phone"] ?? payload["contact_phone"] ?? "",
        role,
      },
    });
    if (authError) throw new Error(authError.message);
    const userId = created.user?.id;
    if (!userId) throw new Error("User creation failed");

    await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });

    if (role === "restaurant") {
      const { error: restError } = await supabaseAdmin.from("restaurants").insert({
        name_ar: payload["business_name_ar"] ?? payload["business_name_en"] ?? "",
        name_en: payload["business_name_en"] ?? payload["business_name_ar"] ?? "",
        owner_id: userId,
      });
      if (restError) throw new Error(restError.message);
    }

    const { error: updateError } = await supabaseAdmin
      .from("join_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", req.id);
    if (updateError) throw new Error(updateError.message);

    return { email, tempPassword: password };
  });

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [usersRes, rolesRes, appsRes, profilesRes, deliveredRes, shiftsRes] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("staff_applications").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("profiles").select("id, full_name, phone"),
      supabaseAdmin.from("orders").select("courier_id").eq("status", "delivered").not("courier_id", "is", null),
      supabaseAdmin.from("courier_shifts").select("courier_id, neighborhoods, scheduled_start").order("scheduled_start", { ascending: false }),
    ]);

    const shiftNeighborhoodsMap = new Map<string, string[]>();
    for (const s of shiftsRes.data ?? []) {
      if (
        !shiftNeighborhoodsMap.has(s.courier_id) &&
        Array.isArray(s.neighborhoods) &&
        s.neighborhoods.length === 3 &&
        !s.neighborhoods.includes("الأقرب للمطعم")
      ) {
        shiftNeighborhoodsMap.set(s.courier_id, s.neighborhoods);
      }
    }

    const roleMap = new Map<string, string>();
    for (const r of rolesRes.data ?? []) {
      const prev = roleMap.get(r.user_id);
      if (!prev || r.role === "admin" || r.role === "restaurant" || r.role === "courier") {
        roleMap.set(r.user_id, r.role);
      }
    }

    const deliveredCountMap = new Map<string, number>();
    for (const o of deliveredRes.data ?? []) {
      if (o.courier_id) {
        deliveredCountMap.set(o.courier_id, (deliveredCountMap.get(o.courier_id) ?? 0) + 1);
      }
    }

    const appMap = new Map<
      string,
      {
        id: string;
        type: string;
        status: string;
        full_name: string;
        business_name: string | null;
        vehicle: string | null;
        documents: Record<string, string>;
        rejection_reason: string | null;
      }
    >();
    for (const a of appsRes.data ?? []) {
      if (!appMap.has(a.user_id)) {
        appMap.set(a.user_id, {
          id: a.id,
          type: a.type,
          status: a.status,
          full_name: a.full_name,
          business_name: a.business_name,
          vehicle: a.vehicle,
          documents: (a.documents ?? {}) as Record<string, string>,
          rejection_reason: a.rejection_reason,
        });
      }
    }

    const profileMap = new Map<string, { full_name: string; phone: string | null }>();
    for (const p of profilesRes.data ?? []) {
      profileMap.set(p.id, { full_name: p.full_name, phone: p.phone });
    }

    return (usersRes.data?.users ?? []).map((u) => {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const app = appMap.get(u.id);
      const prof = profileMap.get(u.id);
      const storedRole = roleMap.get(u.id);
      const metaRole = typeof meta["role"] === "string" ? meta["role"] : undefined;
      const effectiveRole =
        storedRole && storedRole !== "customer"
          ? storedRole
          : app?.type === "courier" || app?.type === "restaurant"
            ? app.type
            : metaRole || storedRole || "customer";

      const isCourierRoleActive = storedRole === "courier";
      const violationLocked = Boolean(meta["identity_violation_locked"]);
      const violationPending = Boolean(meta["identity_violation_pending"]);
      const status =
        violationLocked
          ? "rejected"
          : app?.status === "pending"
            ? "pending"
            : app?.status === "rejected" || meta["status"] === "rejected"
              ? "rejected"
              : isCourierRoleActive || storedRole === "restaurant" || storedRole === "admin"
                ? "approved"
                : (meta["status"] as string) || "approved";

      const metaNeighborhoods = Array.isArray(meta["neighborhoods"])
        ? (meta["neighborhoods"] as string[]).filter((x) => typeof x === "string" && x.trim().length > 0)
        : [];
      const courierNeighborhoods =
        metaNeighborhoods.length === 3
          ? metaNeighborhoods
          : shiftNeighborhoodsMap.get(u.id) ?? [];

      return {
        id: u.id,
        email: u.email ?? "",
        full_name:
          (meta["full_name"] as string) ||
          app?.full_name ||
          prof?.full_name ||
          "",
        phone: (meta["phone"] as string) || prof?.phone || "",
        role: effectiveRole,
        status: status as "approved" | "pending" | "rejected",
        vehicle: (app?.vehicle || (meta["vehicle"] as string) || null) as "car" | "motorcycle" | null,
        business_name: app?.business_name ?? null,
        application_id: app?.id ?? null,
        documents: app?.documents ?? {},
        rejection_reason: app?.rejection_reason || (meta["rejection_reason"] as string) || null,
        identity_violation_locked: violationLocked,
        identity_violation_pending: violationPending,
        identity_violation_reason: (meta["identity_violation_reason"] as string) || null,
        identity_violation_photo: (meta["identity_violation_photo"] as string) || null,
        identity_violation_at: (meta["identity_violation_at"] as string) || null,
        completed_orders_count: deliveredCountMap.get(u.id) ?? 0,
        neighborhoods: courierNeighborhoods,
        created_at: u.created_at,
      };
    });
  });

export const setCourierNeighborhoods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        courier_id: z.string().uuid(),
        neighborhoods: z
          .array(z.string().trim().min(2, "اسم الحي قصير جداً").max(100))
          .length(3, "يجب تحديد 3 أحياء للمندوب")
          .refine((areas) => new Set(areas).size === 3, "الأحياء الثلاثة يجب أن تكون مختلفة"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(
      data.courier_id,
    );
    if (fetchError || !existing?.user) throw new Error("المندوب غير موجود");

    const prevMeta = (existing.user.user_metadata ?? {}) as Record<string, unknown>;
    const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(data.courier_id, {
      user_metadata: {
        ...prevMeta,
        neighborhoods: data.neighborhoods,
      },
    });
    if (metaError) throw new Error(metaError.message);

    // Also update any active/scheduled shift in courier_shifts or create a scheduled row
    // so both web and native RPCs find the 3 neighborhoods immediately
    const { data: currentShifts } = await supabaseAdmin
      .from("courier_shifts")
      .select("id, status")
      .eq("courier_id", data.courier_id)
      .in("status", ["active", "scheduled"])
      .order("scheduled_start", { ascending: false });

    if (currentShifts && currentShifts.length > 0) {
      for (const s of currentShifts) {
        await supabaseAdmin
          .from("courier_shifts")
          .update({
            neighborhoods: data.neighborhoods,
            adjacent_confirmed: true,
          })
          .eq("id", s.id);
      }
    } else {
      await supabaseAdmin.from("courier_shifts").insert({
        courier_id: data.courier_id,
        created_by: context.userId,
        scheduled_start: new Date().toISOString(),
        neighborhoods: data.neighborhoods,
        adjacent_confirmed: true,
        status: "scheduled",
      });
    }

    return { ok: true, neighborhoods: data.neighborhoods };
  });

export const markOrderCompletedByAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        completed: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        status: data.completed ? "delivered" : "pending",
        updated_at: nowIso,
      })
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true, updated_at: nowIso };
  });
