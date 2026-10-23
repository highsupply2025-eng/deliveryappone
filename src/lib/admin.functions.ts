import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const accountSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional().default(""),
  role: z.enum(["admin", "restaurant", "courier", "customer"]),
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
      user_metadata: { full_name: data.full_name, phone: data.phone, role: data.role },
    });
    if (error) throw new Error(error.message);
    return { id: created.user?.id ?? "", email: data.email, role: data.role };
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
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string>();
    for (const r of roles ?? []) roleMap.set(r.user_id, r.role);
    return (users?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      full_name: (u.user_metadata?.["full_name"] as string) ?? "",
      phone: (u.user_metadata?.["phone"] as string) ?? "",
      role: roleMap.get(u.id) ?? "customer",
      created_at: u.created_at,
    }));
  });
