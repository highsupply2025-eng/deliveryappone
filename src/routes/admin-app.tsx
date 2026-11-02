import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Users, Bike, Store, ClipboardList, LogOut, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createAccount, listAccounts } from "@/lib/admin.functions";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { AdminCourierShifts, AdminOrderRouting, ShiftFields, emptyShift, shiftPayload } from "@/components/courier/admin-shifts";
import { assignCourierShift } from "@/lib/courier-shifts.functions";
import { useRealtime } from "@/lib/realtime";
import { LiveOrderMap } from "@/components/apps/live-order-map";
import { AdminApplications } from "@/components/apps/admin-applications";
import { AdminEmailLogin } from "@/components/auth/admin-email-login";

export const Route = createFileRoute("/admin-app")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "FoodHub Admin | تطبيق الإدارة" },
      { name: "description", content: "تطبيق إدارة مستقل لحسابات العملاء والمناديب والمطاعم والطلبات في FoodHub." },
      { property: "og:title", content: "FoodHub Admin | تطبيق الإدارة" },
      { property: "og:description", content: "إدارة العملاء والمناديب والمطاعم من تطبيق واحد بسيط." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminApp,
});

type Tab = "orders" | "customer" | "courier" | "restaurant";

const STATUS_AR: Record<string, string> = {
  pending: "جديد", accepted: "مقبول", preparing: "تحضير", ready: "جاهز",
  on_the_way: "في الطريق", delivered: "تم التوصيل", cancelled: "ملغي",
};

function AdminApp() {
  const { user, role, loading } = useSession();
  useEffect(() => {
    try { localStorage.setItem("foodhub_native_app", "admin"); } catch { /* ignore */ }
  }, []);

  if (loading) return <Screen><p className="text-muted-foreground">جارِ التحميل…</p></Screen>;
  if (!user) return <Login />;
  if (role !== "admin")
    return (
      <Screen>
        <p className="mb-4 text-center">هذا الحساب ليس حساب أدمن.</p>
        <Button variant="outline" onClick={() => void supabase.auth.signOut()}>تسجيل الخروج</Button>
      </Screen>
    );
  return <Panel />;
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="foodhub-staff flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
      {children}
    </div>
  );
}

function Login() {
  return (
    <Screen>
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-xl font-bold">FoodHub Admin</h1>
          <p className="text-sm text-muted-foreground">تسجيل دخول الإدارة</p>
        </div>
        <AdminEmailLogin />
      </div>
    </Screen>
  );
}

function Panel() {
  useRealtime(["orders","restaurants","courier_shifts"],["admin-app-orders","admin-app-restaurants","admin-app-shifts"],"admin-app");
  const [tab, setTab] = useState<Tab>("orders");
  const qc = useQueryClient();
  const accounts = useQuery({ queryKey: ["admin-app-accounts"], enabled:tab!=="orders", queryFn: () => listAccounts() });
  const orders = useQuery({
    queryKey: ["admin-app-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("id,status,total,address,created_at,pickup_address,delivery_neighborhood").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });
  const restaurants = useQuery({
    enabled:tab==="restaurant",
    queryKey: ["admin-app-restaurants"],
    queryFn: async () => {
      const { data } = await supabase.from("restaurants").select("id,name_ar,is_active,owner_id").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const refresh = () => void qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("admin-app") });
  const count = (r: string) => (accounts.data ?? []).filter((a) => a.role === r).length;

  const toggleRestaurant = async (id: string, active: boolean) => {
    const { error } = await supabase.from("restaurants").update({ is_active: !active }).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };

  const tabs = [
    { id: "orders" as Tab, label: "الطلبات", icon: ClipboardList, n: orders.data?.length ?? 0 },
    { id: "customer" as Tab, label: "العملاء", icon: Users, n: count("customer") },
    { id: "courier" as Tab, label: "المناديب", icon: Bike, n: count("courier") },
    { id: "restaurant" as Tab, label: "المطاعم", icon: Store, n: count("restaurant") },
  ];

  return (
    <div dir="rtl" className="foodhub-staff min-h-screen bg-background pb-20 text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 font-bold"><ShieldCheck className="size-5 text-primary" /> FoodHub Admin</div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={refresh} aria-label="تحديث"><RefreshCw className="size-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => void supabase.auth.signOut()} aria-label="خروج"><LogOut className="size-4" /></Button>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-3 p-4">
        {tab === "orders" ? (
          (orders.data ?? []).length === 0 ? <Empty /> :
          (orders.data ?? []).map((o) => (
            <div key={o.id} className="rounded-xl border bg-card p-3">
              <div className="flex justify-between text-sm font-semibold">
                <span>#{o.id.slice(0, 6)}</span>
                <span className="rounded-md bg-secondary px-2 text-xs leading-6">{STATUS_AR[o.status] ?? o.status}</span>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{o.address}</p>
              <p className="mt-1 text-sm">{Number(o.total).toFixed(2)} ر.س</p>
              {["ready","on_the_way"].includes(o.status)&&<LiveOrderMap orderId={o.id}/>}
              {false && <AdminOrderRouting orderId={o.id} pickup={o.pickup_address} neighborhood={o.delivery_neighborhood} onDone={refresh} />}
            </div>
          ))
        ) : (
          <>
            {(tab === "courier" || tab === "restaurant") && <AdminApplications type={tab} />}
            <NewAccount role={tab} onDone={refresh} />
            {(accounts.data ?? []).filter((a) => a.role === tab).map((a) => (
              <div key={a.id} className="rounded-xl border bg-card p-3">
                <p className="font-semibold">{a.full_name || a.email}</p>
                <p className="text-xs text-muted-foreground">{a.email}{a.phone ? ` · ${a.phone}` : ""}</p>
                {tab === "courier" && <AdminCourierShifts courierId={a.id} />}
              </div>
            ))}
            {tab === "restaurant" && (restaurants.data ?? []).length > 0 ? (
              <>
                <h2 className="pt-2 text-sm font-bold">المتاجر</h2>
                {(restaurants.data ?? []).map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border bg-card p-3">
                    <span>{r.name_ar}</span>
                    <Button size="sm" variant={r.is_active ? "outline" : "default"} onClick={() => void toggleRestaurant(r.id, r.is_active)}>
                      {r.is_active ? "إيقاف" : "تفعيل"}
                    </Button>
                  </div>
                ))}
              </>
            ) : null}
          </>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t bg-card pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t) => (
          <Button variant="ghost" key={t.id} onClick={() => setTab(t.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${tab === t.id ? "text-primary font-bold" : "text-muted-foreground"}`}>
            <t.icon className="size-5" />
            <span>{t.label} ({t.n})</span>
          </Button>
        ))}
      </nav>
    </div>
  );
}

function Empty() {
  return <p className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات بعد</p>;
}

function NewAccount({ role, onDone }: { role: "customer" | "courier" | "restaurant"; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const label = role === "customer" ? "عميل" : role === "courier" ? "مندوب" : "مطعم";
  const [shift, setShift] = useState(emptyShift);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const create = useServerFn(createAccount);
  const assign = useServerFn(assignCourierShift);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (role === "courier") shiftPayload("11111111-1111-4111-8111-111111111111", shift);
      const id = createdId ?? (await create({ data: { ...f, role } })).id;
      if (role === "courier") {
        setCreatedId(id);
        await assign({ data: shiftPayload(id, shift) });
      }
      toast.success(`تمت إضافة ${label}`);
      setF({ full_name: "", email: "", phone: "", password: "" });
      setOpen(false);
      setCreatedId(null);
      setShift(emptyShift);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الإنشاء");
    } finally { setBusy(false); }
  };
  if (!open)
    return <Button className="w-full" onClick={() => setOpen(true)}><Plus className="size-4" /> إضافة {label}</Button>;
  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border bg-card p-3">
      <Input placeholder="الاسم" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required />
      <Input type="email" placeholder="البريد الإلكتروني" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
      <Input placeholder="الجوال" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <Input type="password" placeholder="كلمة المرور (8 أحرف على الأقل)" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
      {role === "courier" && <ShiftFields value={shift} onChange={setShift} />}
      {createdId && <p className="text-sm text-muted-foreground">تم إنشاء الحساب؛ أكمل حفظ الشيفت</p>}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={busy}>حفظ</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
      </div>
    </form>
  );
}
