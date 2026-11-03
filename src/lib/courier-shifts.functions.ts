import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  shiftAssignmentSchema,
  WORK_SECONDS,
  workedSeconds,
  salaryDayEligible,
} from "./courier-shift-rules";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const assignCourierShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => shiftAssignmentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !admin) throw new Error("غير مصرح");
    const { data: row, error } = await context.supabase
      .from("courier_shifts")
      .insert({ ...data, created_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const courierShiftAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        shift_id: z.string().uuid(),
        action: z.enum(["start", "sync", "request_break", "reject", "accept", "pickup"]),
        order_id: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("courier_shift_action", {
      p_shift_id: data.shift_id,
      p_action: data.action,
      ...(data.order_id ? { p_order_id: data.order_id } : {}),
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const reviewCourierBreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ shift_id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("review_courier_break", {
      p_shift_id: data.shift_id,
      p_approve: data.approve,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function lockCourierAccountNow(userId: string, photo?: string | null, reason?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin.auth.admin.getUserById(userId);
  const prevMeta = (existing?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const nowIso = new Date().toISOString();

  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...prevMeta,
      status: "rejected",
      identity_violation_locked: true,
      identity_violation_pending: false,
      identity_violation_reason:
        reason || "إخلال بالنظام: اختلاف الصورة الحية للمندوب أثناء الشيفت",
      ...(photo ? { identity_violation_photo: photo } : {}),
      identity_violation_at: (prevMeta["identity_violation_at"] as string) || nowIso,
    },
  });

  const { data: activeShifts } = await supabaseAdmin
    .from("courier_shifts")
    .select("*")
    .eq("courier_id", userId)
    .eq("status", "active");

  for (const s of activeShifts ?? []) {
    const worked = s.started_at
      ? workedSeconds(
          Date.parse(s.started_at),
          Date.now(),
          s.break_started_at ? Date.parse(s.break_started_at) : undefined,
          s.break_ends_at ? Date.parse(s.break_ends_at) : undefined,
        )
      : 0;
    await supabaseAdmin
      .from("courier_shifts")
      .update({
        status: "incomplete",
        ended_at: nowIso,
        worked_seconds: worked,
        salary_day_eligible: false,
      })
      .eq("id", s.id);
  }
}

export const courierDeliverOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        code: z
          .string()
          .trim()
          .regex(/^\d{4}$/, "الكود 4 أرقام"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("courier_deliver_order", {
      p_order_id: data.order_id,
      p_code: data.code,
    });
    if (error) throw new Error(error.message);
    const res = result as { ok: boolean; remaining?: number };

    if (res.ok) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: existing } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      const meta = (existing?.user?.user_metadata ?? {}) as Record<string, unknown>;
      if (meta["identity_violation_pending"]) {
        await lockCourierAccountNow(
          context.userId,
          (meta["identity_violation_photo"] as string) || null,
          "إخلال بالنظام: اختلاف الصورة الحية للمندوب — تم إغلاق الحساب نهائياً بعد إتمام توصيل الطلب",
        );
        return { ...res, lockedAfterDelivery: true };
      }
    }

    return res;
  });

export const courierSetOnline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ online: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const meta = (existing?.user?.user_metadata ?? {}) as Record<string, unknown>;

    if (meta["identity_violation_locked"]) {
      throw new Error(
        "تم إغلاق حسابك نهائياً بسبب إخلال بالنظام (عدم تطابق الصورة الحية). لا يعمل الحساب إلا بعد مراجعة الإدارة وفتحه.",
      );
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    const { data: activeShift } = await supabaseAdmin
      .from("courier_shifts")
      .select("*")
      .eq("courier_id", context.userId)
      .eq("status", "active")
      .order("scheduled_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data.online) {
      if (activeShift) {
        return { online: true, shift_id: activeShift.id };
      }
      const { data: createdShift, error: insertError } = await supabaseAdmin
        .from("courier_shifts")
        .insert({
          courier_id: context.userId,
          created_by: context.userId,
          scheduled_start: nowIso,
          started_at: nowIso,
          status: "active",
          neighborhoods: ["الأقرب للمطعم", "تغطية GPS", "مباشر"],
          adjacent_confirmed: true,
          break_status: "none",
          break_request_used: false,
          worked_seconds: 0,
          salary_day_eligible: false,
        })
        .select()
        .single();
      if (insertError) throw new Error(insertError.message);
      return { online: true, shift_id: createdShift.id };
    } else {
      if (activeShift) {
        const worked = activeShift.started_at
          ? workedSeconds(
              Date.parse(activeShift.started_at),
              nowMs,
              activeShift.break_started_at ? Date.parse(activeShift.break_started_at) : undefined,
              activeShift.break_ends_at ? Date.parse(activeShift.break_ends_at) : undefined,
            )
          : 0;
        const eligible = salaryDayEligible(worked);
        await supabaseAdmin
          .from("courier_shifts")
          .update({
            status: eligible ? "completed" : "incomplete",
            ended_at: nowIso,
            worked_seconds: worked,
            salary_day_eligible: eligible,
          })
          .eq("id", activeShift.id);
      }
      return { online: false };
    }
  });

export const courierBreakAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        shift_id: z.string().uuid(),
        action: z.enum(["start_break", "end_break"]),
        minutes: z.number().min(15).max(60).optional().default(15),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: shift, error } = await supabaseAdmin
      .from("courier_shifts")
      .select("*")
      .eq("id", data.shift_id)
      .eq("courier_id", context.userId)
      .maybeSingle();

    if (error || !shift || shift.status !== "active") {
      throw new Error("لا يوجد شيفت نشط حالياً");
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    if (data.action === "start_break") {
      if (shift.break_request_used) {
        throw new Error("لقد استخدمت البريك المتاح خلال هذا الشيفت");
      }
      const endsIso = new Date(nowMs + data.minutes * 60 * 1000).toISOString();
      const { error: updateErr } = await supabaseAdmin
        .from("courier_shifts")
        .update({
          break_status: "approved",
          break_request_used: true,
          break_started_at: nowIso,
          break_ends_at: endsIso,
        })
        .eq("id", shift.id);
      if (updateErr) throw new Error(updateErr.message);
      return { ok: true, break_ends_at: endsIso };
    } else {
      const { error: updateErr } = await supabaseAdmin
        .from("courier_shifts")
        .update({
          break_ends_at: nowIso,
        })
        .eq("id", shift.id);
      if (updateErr) throw new Error(updateErr.message);
      return { ok: true };
    }
  });

export const submitCourierLiveVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        live_photo_data_url: z.string().min(20),
        matched: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const prevMeta = (existing?.user?.user_metadata ?? {}) as Record<string, unknown>;
    const today = new Date().toISOString().slice(0, 10);

    if (data.matched) {
      await supabaseAdmin.auth.admin.updateUserById(context.userId, {
        user_metadata: {
          ...prevMeta,
          identity_verified_date: today,
          last_live_photo: data.live_photo_data_url,
        },
      });
      return { status: "verified" as const };
    }

    // Mismatch! Check if the courier has an active order currently being delivered
    const { data: activeOrders } = await supabaseAdmin
      .from("orders")
      .select("id,status")
      .eq("courier_id", context.userId)
      .in("status", ["accepted", "preparing", "ready", "on_the_way"])
      .limit(1);

    const hasActiveOrder = (activeOrders ?? []).length > 0;

    if (hasActiveOrder) {
      await supabaseAdmin.auth.admin.updateUserById(context.userId, {
        user_metadata: {
          ...prevMeta,
          identity_violation_pending: true,
          identity_violation_locked: false,
          identity_violation_photo: data.live_photo_data_url,
          identity_violation_at: new Date().toISOString(),
          identity_violation_reason:
            "إخلال بالنظام: اختلاف الصورة الحية للمندوب — ينتظر التطبيق توصيل الطلب الحالي ثم يغلق الحساب نهائياً",
        },
      });
      return { status: "pending_lock_after_delivery" as const };
    }

    await lockCourierAccountNow(
      context.userId,
      data.live_photo_data_url,
      "إخلال بالنظام: اختلاف الصورة الحية للمندوب أثناء الشيفت — تم إغلاق الحساب نهائياً لحين مراجعة الإدارة",
    );
    return { status: "locked_now" as const };
  });

export const getCourierDashboardData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        latitude: z.number().min(-90).max(90).nullable().optional(),
        longitude: z.number().min(-180).max(180).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [userRes, appRes, profRes, shiftsRes, activeOrdersRes, pastOrdersRes] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(context.userId),
      supabaseAdmin
        .from("staff_applications")
        .select("*")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      supabaseAdmin
        .from("courier_shifts")
        .select("*")
        .eq("courier_id", context.userId)
        .order("scheduled_start", { ascending: false })
        .limit(25),
      supabaseAdmin
        .from("orders")
        .select(
          "id,status,address,pickup_address,pickup_latitude,pickup_longitude,delivery_latitude,delivery_longitude,courier_id,courier_accepted_at,total,delivery_fee,created_at,restaurants(name_ar,address,latitude,longitude)",
        )
        .in("status", ["pending", "accepted", "preparing", "ready", "on_the_way"])
        .or(`courier_id.eq.${context.userId},courier_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(30),
      supabaseAdmin
        .from("orders")
        .select("id,status,address,pickup_address,total,delivery_fee,created_at,updated_at,restaurants(name_ar)")
        .eq("courier_id", context.userId)
        .eq("status", "delivered")
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);

    const u = userRes.data?.user;
    const meta = (u?.user_metadata ?? {}) as Record<string, unknown>;
    const app = appRes.data;
    const prof = profRes.data;
    const docs = ((app?.documents ?? {}) as Record<string, string>) || {};

    let portraitUrl: string | null = (meta["last_live_photo"] as string) || null;
    if (docs["portrait"]) {
      const { data: signed } = await supabaseAdmin.storage
        .from("onboarding-documents")
        .createSignedUrl(docs["portrait"], 3600);
      if (signed?.signedUrl) portraitUrl = signed.signedUrl;
    }

    const shifts = shiftsRes.data ?? [];
    const activeShift = shifts.find((s) => s.status === "active") ?? null;

    const enrichedActive = (activeOrdersRes.data ?? [])
      .filter((o) => activeShift?.rejected_order_id !== o.id)
      .map((o) => {
        const rest = o.restaurants as {
          name_ar?: string;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
        } | null;
        const pLat = o.pickup_latitude ?? rest?.latitude ?? null;
        const pLng = o.pickup_longitude ?? rest?.longitude ?? null;
        const distance_km =
          data.latitude != null && data.longitude != null && pLat != null && pLng != null
            ? haversineKm(data.latitude, data.longitude, pLat, pLng)
            : null;

        return {
          id: o.id,
          status: o.status,
          address: o.address,
          pickup_address: o.pickup_address ?? rest?.address ?? null,
          pickup_latitude: pLat,
          pickup_longitude: pLng,
          delivery_latitude: o.delivery_latitude,
          delivery_longitude: o.delivery_longitude,
          courier_id: o.courier_id,
          courier_accepted_at: o.courier_accepted_at,
          total: o.total,
          delivery_fee: o.delivery_fee,
          created_at: o.created_at,
          restaurant_name: rest?.name_ar ?? "المطعم",
          distance_km,
        };
      });

    enrichedActive.sort((a, b) => {
      const aMine = a.courier_id === context.userId ? 0 : 1;
      const bMine = b.courier_id === context.userId ? 0 : 1;
      if (aMine !== bMine) return aMine - bMine;
      const aDist = a.distance_km ?? 999999;
      const bDist = b.distance_km ?? 999999;
      if (aDist !== bDist) return aDist - bDist;
      return Date.parse(b.created_at) - Date.parse(a.created_at);
    });

    const pastOrders = (pastOrdersRes.data ?? []).map((o) => {
      const rest = o.restaurants as { name_ar?: string } | null;
      return {
        id: o.id,
        status: o.status,
        address: o.address,
        pickup_address: o.pickup_address,
        total: o.total,
        delivery_fee: o.delivery_fee,
        created_at: o.created_at,
        updated_at: o.updated_at,
        restaurant_name: rest?.name_ar ?? "المطعم",
      };
    });

    return {
      profile: {
        id: context.userId,
        full_name: (meta["full_name"] as string) || app?.full_name || prof?.full_name || "كابتن توصيل",
        email: u?.email ?? "",
        phone: (meta["phone"] as string) || prof?.phone || "",
        vehicle: ((app?.vehicle || (meta["vehicle"] as string) || "car") as "car" | "motorcycle"),
        portrait_url: portraitUrl,
        documents: docs,
        identity_verified_date: (meta["identity_verified_date"] as string) || null,
        identity_violation_locked: Boolean(meta["identity_violation_locked"]),
        identity_violation_pending: Boolean(meta["identity_violation_pending"]),
        identity_violation_reason: (meta["identity_violation_reason"] as string) || null,
      },
      activeShift,
      shiftHistory: shifts.filter((s) => s.status !== "active"),
      activeOrders: enrichedActive,
      pastOrders,
      completedCount: pastOrders.length,
    };
  });

export const listCourierAvailableOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        latitude: z.number().min(-90).max(90).nullable().optional(),
        longitude: z.number().min(-180).max(180).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id,status,address,pickup_address,pickup_latitude,pickup_longitude,courier_id,courier_accepted_at,total,delivery_fee,created_at,restaurants(name_ar,address,latitude,longitude)",
      )
      .in("status", ["pending", "accepted", "preparing", "ready", "on_the_way"])
      .or(`courier_id.eq.${context.userId},courier_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw new Error(error.message);

    const enriched = (rows ?? []).map((o) => {
      const rest = o.restaurants as {
        name_ar?: string;
        address?: string | null;
        latitude?: number | null;
        longitude?: number | null;
      } | null;
      const pLat = o.pickup_latitude ?? rest?.latitude ?? null;
      const pLng = o.pickup_longitude ?? rest?.longitude ?? null;
      const distance_km =
        data.latitude != null && data.longitude != null && pLat != null && pLng != null
          ? haversineKm(data.latitude, data.longitude, pLat, pLng)
          : null;

      return {
        id: o.id,
        status: o.status,
        address: o.address,
        pickup_address: o.pickup_address ?? rest?.address ?? null,
        courier_id: o.courier_id,
        courier_accepted_at: o.courier_accepted_at,
        total: o.total,
        delivery_fee: o.delivery_fee,
        created_at: o.created_at,
        restaurant_name: rest?.name_ar ?? "المطعم",
        distance_km,
      };
    });

    enriched.sort((a, b) => {
      const aMine = a.courier_id === context.userId ? 0 : 1;
      const bMine = b.courier_id === context.userId ? 0 : 1;
      if (aMine !== bMine) return aMine - bMine;
      const aDist = a.distance_km ?? 999999;
      const bDist = b.distance_km ?? 999999;
      if (aDist !== bDist) return aDist - bDist;
      return Date.parse(b.created_at) - Date.parse(a.created_at);
    });

    return enriched;
  });

export const courierOrderAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        action: z.enum(["accept", "pickup", "reject"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const meta = (existing?.user?.user_metadata ?? {}) as Record<string, unknown>;
    if (meta["identity_violation_locked"]) {
      throw new Error("تم إغلاق حسابك بسبب إخلال بالنظام — راجع الإدارة");
    }

    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select(
        "id,status,courier_id,pickup_address,pickup_latitude,pickup_longitude,restaurants(address,latitude,longitude)",
      )
      .eq("id", data.order_id)
      .maybeSingle();

    if (fetchError || !order) throw new Error("الطلب غير موجود");

    const { data: activeShift } = await supabaseAdmin
      .from("courier_shifts")
      .select("*")
      .eq("courier_id", context.userId)
      .eq("status", "active")
      .order("scheduled_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data.action === "accept") {
      if (order.courier_id && order.courier_id !== context.userId) {
        throw new Error("تم استلام هذا الطلب من مندوب آخر أقرب");
      }
      const rest = order.restaurants as {
        address?: string | null;
        latitude?: number | null;
        longitude?: number | null;
      } | null;
      const nextStatus =
        order.status === "pending" || order.status === "accepted" ? "preparing" : order.status;
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          courier_id: context.userId,
          courier_accepted_at: new Date().toISOString(),
          status: nextStatus,
          pickup_address: order.pickup_address ?? rest?.address ?? null,
          pickup_latitude: order.pickup_latitude ?? rest?.latitude ?? null,
          pickup_longitude: order.pickup_longitude ?? rest?.longitude ?? null,
        })
        .eq("id", data.order_id);
      if (updateError) throw new Error(updateError.message);
      return { ok: true, status: nextStatus };
    }

    if (data.action === "pickup") {
      if (order.courier_id !== context.userId) throw new Error("هذا الطلب غير مسند إليك");
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "on_the_way" })
        .eq("id", data.order_id);
      if (updateError) throw new Error(updateError.message);
      return { ok: true, status: "on_the_way" };
    }

    if (data.action === "reject") {
      if (order.status === "on_the_way") {
        throw new Error("لا يمكن رفض الطلب بعد استلامه من المطعم");
      }
      if (activeShift && activeShift.rejected_order_id) {
        throw new Error("لديك الحق في رفض طلب واحد فقط خلال الشيفت وقد استنفدته");
      }
      if (activeShift) {
        await supabaseAdmin
          .from("courier_shifts")
          .update({ rejected_order_id: data.order_id })
          .eq("id", activeShift.id);
      }
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          courier_id: null,
          courier_accepted_at: null,
          status: order.status === "preparing" || order.status === "accepted" ? "pending" : order.status,
        })
        .eq("id", data.order_id);
      if (updateError) throw new Error(updateError.message);
      return { ok: true };
    }

    return { ok: true };
  });
