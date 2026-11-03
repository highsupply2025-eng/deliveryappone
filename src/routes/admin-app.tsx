import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck,
  Users,
  Bike,
  Store,
  ClipboardList,
  LogOut,
  Plus,
  RefreshCw,
  Check,
  X,
  Pencil,
  Trash2,
  ChevronRight,
  FileText,
  Phone,
  Mail,
  Car,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  createAccount,
  listAccounts,
  updateAccount,
  deleteAccount,
  setCourierApprovalStatus,
} from "@/lib/admin.functions";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { AdminOrderRouting } from "@/components/courier/admin-shifts";
import { useRealtime } from "@/lib/realtime";
import { LiveOrderMap } from "@/components/apps/live-order-map";
import { AdminApplications } from "@/components/apps/admin-applications";
import { AdminEmailLogin } from "@/components/auth/admin-email-login";
import { documentLabels } from "@/lib/phone-onboarding";

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

type AccountRow = Awaited<ReturnType<typeof listAccounts>>[number];

const STATUS_AR: Record<string, string> = {
  pending: "بانتظار أقرب مندوب",
  accepted: "تحضير",
  preparing: "تحضير",
  ready: "جاهز للاستلام",
  on_the_way: "في الطريق",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

function AdminApp() {
  const { user, role, loading } = useSession();
  useEffect(() => {
    try {
      localStorage.setItem("foodhub_native_app", "admin");
    } catch {
      /* ignore */
    }
  }, []);

  if (loading)
    return (
      <Screen>
        <p className="text-muted-foreground">جارِ التحميل…</p>
      </Screen>
    );
  if (!user) return <Login />;
  if (role !== "admin")
    return (
      <Screen>
        <p className="mb-4 text-center">هذا الحساب ليس حساب أدمن.</p>
        <Button variant="outline" onClick={() => void supabase.auth.signOut()}>
          تسجيل الخروج
        </Button>
      </Screen>
    );
  return <Panel />;
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div
      dir="rtl"
      className="foodhub-staff flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground"
    >
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
  useRealtime(
    ["orders", "restaurants", "staff_applications"],
    ["admin-app-orders", "admin-app-restaurants", "admin-app-accounts"],
    "admin-app",
  );
  const [tab, setTab] = useState<Tab>("orders");
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const qc = useQueryClient();

  const accounts = useQuery({
    queryKey: ["admin-app-accounts"],
    queryFn: () => listAccounts(),
  });

  const orders = useQuery({
    queryKey: ["admin-app-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,status,total,address,created_at,pickup_address,delivery_neighborhood,courier_id")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const restaurants = useQuery({
    enabled: tab === "restaurant",
    queryKey: ["admin-app-restaurants"],
    queryFn: async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("id,name_ar,is_active,owner_id")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const refresh = () =>
    void qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("admin-app") });

  const count = (r: string) => (accounts.data ?? []).filter((a) => a.role === r).length;

  const toggleRestaurant = async (id: string, active: boolean) => {
    const { error } = await supabase.from("restaurants").update({ is_active: !active }).eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };

  const tabs = [
    { id: "orders" as Tab, label: "الطلبات", icon: ClipboardList, n: orders.data?.length ?? 0 },
    { id: "customer" as Tab, label: "العملاء", icon: Users, n: count("customer") },
    { id: "courier" as Tab, label: "المناديب", icon: Bike, n: count("courier") },
    { id: "restaurant" as Tab, label: "المطاعم", icon: Store, n: count("restaurant") },
  ];

  const selectedCourier =
    tab === "courier" && selectedCourierId
      ? (accounts.data ?? []).find((a) => a.id === selectedCourierId) ?? null
      : null;

  return (
    <div dir="rtl" className="foodhub-staff min-h-screen bg-background pb-20 text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 font-bold">
          <ShieldCheck className="size-5 text-primary" /> FoodHub Admin
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={refresh} aria-label="تحديث">
            <RefreshCw className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => void supabase.auth.signOut()} aria-label="خروج">
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-3 p-4">
        {tab === "orders" ? (
          (orders.data ?? []).length === 0 ? (
            <Empty />
          ) : (
            (orders.data ?? []).map((o) => (
              <div key={o.id} className="rounded-xl border bg-card p-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span>#{o.id.slice(0, 6)}</span>
                  <span className="rounded-md bg-secondary px-2 text-xs leading-6">
                    {STATUS_AR[o.status] ?? o.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{o.address}</p>
                <p className="mt-1 text-sm">{Number(o.total).toFixed(2)} ر.س</p>
                {["ready", "on_the_way"].includes(o.status) && <LiveOrderMap orderId={o.id} />}
                {["pending", "accepted", "preparing", "ready"].includes(o.status) && (
                  <AdminOrderRouting
                    orderId={o.id}
                    pickup={o.pickup_address}
                    neighborhood={o.delivery_neighborhood}
                    onDone={refresh}
                  />
                )}
              </div>
            ))
          )
        ) : tab === "courier" ? (
          selectedCourier ? (
            <CourierDetailPage
              courier={selectedCourier}
              orders={(orders.data ?? []).filter((o) => o.courier_id === selectedCourier.id)}
              onBack={() => setSelectedCourierId(null)}
              onChanged={refresh}
            />
          ) : (
            <CourierListSection
              couriers={(accounts.data ?? []).filter((a) => a.role === "courier")}
              onSelect={(id) => setSelectedCourierId(id)}
              onChanged={refresh}
            />
          )
        ) : (
          <>
            {tab === "restaurant" && <AdminApplications type="restaurant" />}
            <NewAccount role={tab} onDone={refresh} />
            {(accounts.data ?? [])
              .filter((a) => a.role === tab)
              .map((a) => (
                <div key={a.id} className="rounded-xl border bg-card p-3">
                  <p className="font-semibold">{a.full_name || a.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.email}
                    {a.phone ? ` · ${a.phone}` : ""}
                  </p>
                </div>
              ))}
            {tab === "restaurant" && (restaurants.data ?? []).length > 0 ? (
              <>
                <h2 className="pt-2 text-sm font-bold">المتاجر</h2>
                {(restaurants.data ?? []).map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border bg-card p-3">
                    <span>{r.name_ar}</span>
                    <Button
                      size="sm"
                      variant={r.is_active ? "outline" : "default"}
                      onClick={() => void toggleRestaurant(r.id, r.is_active)}
                    >
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
          <Button
            variant="ghost"
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setSelectedCourierId(null);
            }}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              tab === t.id ? "font-bold text-primary" : "text-muted-foreground"
            }`}
          >
            <t.icon className="size-5" />
            <span>
              {t.label} ({t.n})
            </span>
          </Button>
        ))}
      </nav>
    </div>
  );
}

function CourierListSection({
  couriers,
  onSelect,
  onChanged,
}: {
  couriers: AccountRow[];
  onSelect: (id: string) => void;
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const decideFn = useServerFn(setCourierApprovalStatus);
  const removeFn = useServerFn(deleteAccount);

  const handleApproval = async (c: AccountRow, approve: boolean) => {
    setBusyId(c.id);
    try {
      await decideFn({
        data: {
          user_id: c.id,
          application_id: c.application_id,
          approve,
          reason: approve ? "" : "تم الرفض أو الإيقاف من الإدارة",
        },
      });
      toast.success(approve ? "تم اعتماد وتفعيل المندوب" : "تم رفض/إيقاف المندوب");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تحديث حالة المندوب");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (c: AccountRow) => {
    if (!window.confirm(`هل أنت متأكد من حذف حساب المندوب (${c.full_name || c.email}) نهائياً؟`)) return;
    setBusyId(c.id);
    try {
      await removeFn({ data: { id: c.id } });
      toast.success("تم حذف حساب المندوب");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر حذف الحساب");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <NewAccount role="courier" onDone={onChanged} />

      <div className="flex items-center justify-between pt-1">
        <h2 className="text-sm font-bold">قائمة المناديب (اضغط على المندوب لفتح صفحته المستقلة)</h2>
        <span className="text-xs text-muted-foreground">{couriers.length} مندوب</span>
      </div>

      {couriers.length === 0 ? (
        <Empty />
      ) : (
        couriers.map((c) => {
          const isBusy = busyId === c.id;
          return (
            <article
              key={c.id}
              className="rounded-2xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className="min-w-0 flex-1 text-start"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-base truncate">{c.full_name || c.email}</h3>
                    <StatusBadge status={c.status} />
                    {(c.identity_violation_locked || c.identity_violation_pending) && (
                      <span className="rounded-full bg-destructive px-2.5 py-0.5 text-[11px] font-bold text-destructive-foreground">
                        🚨 إخلال بالنظام (اختلاف الصورة)
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground truncate" dir="ltr">
                    {c.email}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {c.phone && <span>📱 {c.phone}</span>}
                    <span>🛵 {c.vehicle === "motorcycle" ? "دباب" : "سيارة"}</span>
                    <span>• أنجز {c.completed_orders_count ?? 0} طلب</span>
                  </div>
                </button>

                {/* Quick Action Icons: Approve, Reject, Edit/Open, Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant={c.status === "approved" ? "default" : "outline"}
                    className="size-8"
                    disabled={isBusy}
                    title="موافقة / تفعيل"
                    aria-label="موافقة"
                    onClick={() => void handleApproval(c, true)}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={c.status === "rejected" ? "destructive" : "outline"}
                    className="size-8"
                    disabled={isBusy}
                    title="رفض / إيقاف"
                    aria-label="رفض"
                    onClick={() => void handleApproval(c, false)}
                  >
                    <X className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8"
                    disabled={isBusy}
                    title="تعديل وعرض صفحة المندوب"
                    aria-label="تعديل"
                    onClick={() => onSelect(c.id)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8 text-destructive hover:bg-destructive/10"
                    disabled={isBusy}
                    title="حذف المندوب"
                    aria-label="حذف"
                    onClick={() => void handleDelete(c)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}

function CourierDetailPage({
  courier,
  orders,
  onBack,
  onChanged,
}: {
  courier: AccountRow;
  orders: { id: string; status: string; total: number; address: string }[];
  onBack: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState(courier.rejection_reason ?? "");
  const [form, setForm] = useState({
    full_name: courier.full_name || "",
    email: courier.email || "",
    phone: courier.phone || "",
    vehicle: (courier.vehicle ?? "car") as "car" | "motorcycle",
    password: "",
  });

  const updateFn = useServerFn(updateAccount);
  const deleteFn = useServerFn(deleteAccount);
  const decideFn = useServerFn(setCourierApprovalStatus);

  const viewDocument = async (path: string) => {
    const { data, error } = await supabase.storage.from("onboarding-documents").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast.error("تعذر فتح المستند");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateFn({
        data: {
          id: courier.id,
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          vehicle: form.vehicle,
          password: form.password.trim(),
        },
      });
      toast.success("تم حفظ تعديلات بيانات المندوب");
      setEditing(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر حفظ التعديلات");
    } finally {
      setBusy(false);
    }
  };

  const handleDecision = async (approve: boolean) => {
    setBusy(true);
    try {
      await decideFn({
        data: {
          user_id: courier.id,
          application_id: courier.application_id,
          approve,
          reason: approve ? "" : reason.trim() || "تم رفض/إيقاف الحساب من الإدارة",
        },
      });
      toast.success(approve ? "تمت الموافقة وتفعيل حساب المندوب" : "تم رفض/إيقاف حساب المندوب");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر تحديث الحالة");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`هل أنت متأكد من حذف حساب المندوب (${courier.full_name || courier.email}) نهائياً؟`)) {
      return;
    }
    setBusy(true);
    try {
      await deleteFn({ data: { id: courier.id } });
      toast.success("تم حذف المندوب نهائياً");
      onChanged();
      onBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر حذف المندوب");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ChevronRight className="size-4" />
          رجوع إلى قائمة المناديب
        </Button>
        <StatusBadge status={courier.status} />
      </div>

      {/* System Violation Alert Banner for Admin when Live Selfie Mismatch Occurred */}
      {(courier.identity_violation_locked || courier.identity_violation_pending) && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-destructive bg-destructive/10 p-4 space-y-3"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-destructive">
              🚨 تنبيه إخلال بالنظام — اختلاف الصورة الحية للمندوب
            </h3>
            <p className="text-xs text-muted-foreground">
              {courier.identity_violation_reason ||
                "تم إغلاق حساب المندوب تلقائياً بسبب عدم تطابق الصورة الحية أثناء الشيفت. يمكنك مراجعة الصورة وفتح الحساب أو حذفه نهائياً."}
            </p>
          </div>
          {courier.identity_violation_photo && (
            <div className="space-y-1">
              <span className="text-xs font-semibold">الصورة الحية المرصودة وقت المخالفة:</span>
              <img
                src={courier.identity_violation_photo}
                alt="صورة المخالفة"
                className="h-36 w-36 rounded-xl border object-cover"
              />
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void handleDecision(true)}
              className="flex-1 gap-1.5"
            >
              <Check className="size-4" />
              فتح حساب المندوب وإلغاء الإغلاق
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => void handleDelete()}
              className="flex-1 gap-1.5"
            >
              <Trash2 className="size-4" />
              حذف حساب المندوب نهائياً
            </Button>
          </div>
        </div>
      )}

      {/* Courier Header & Action Icons Bar */}
      <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Bike className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{courier.full_name || "مندوب توصيل"}</h2>
              <p className="text-xs text-muted-foreground" dir="ltr">
                {courier.email}
              </p>
            </div>
          </div>
        </div>

        {/* 4 Action Icon Buttons: Approve, Reject, Edit, Delete */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t">
          <Button
            type="button"
            variant={courier.status === "approved" ? "default" : "outline"}
            size="sm"
            disabled={busy}
            onClick={() => void handleDecision(true)}
            className="flex items-center justify-center gap-1.5"
          >
            <Check className="size-4" />
            <span>موافقة</span>
          </Button>

          <Button
            type="button"
            variant={courier.status === "rejected" ? "destructive" : "outline"}
            size="sm"
            disabled={busy}
            onClick={() => void handleDecision(false)}
            className="flex items-center justify-center gap-1.5"
          >
            <X className="size-4" />
            <span>رفض</span>
          </Button>

          <Button
            type="button"
            variant={editing ? "default" : "outline"}
            size="sm"
            disabled={busy}
            onClick={() => setEditing((v) => !v)}
            className="flex items-center justify-center gap-1.5"
          >
            <Pencil className="size-4" />
            <span>تعديل</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void handleDelete()}
            className="flex items-center justify-center gap-1.5 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" />
            <span>حذف</span>
          </Button>
        </div>

        {/* Optional Rejection Reason Input */}
        <div className="space-y-1.5 pt-1">
          <Input
            aria-label="سبب الرفض أو الملاحظة"
            placeholder="سبب الرفض أو الإيقاف (اختياري عند الضغط على رفض)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {courier.rejection_reason && courier.status === "rejected" && (
            <p className="text-xs text-destructive">سبب الرفض المسجل: {courier.rejection_reason}</p>
          )}
        </div>
      </div>

      {/* Edit Form (when Edit icon is clicked) */}
      {editing ? (
        <form onSubmit={saveEdit} className="rounded-2xl border bg-card p-5 space-y-3 shadow-xs">
          <h3 className="font-bold text-sm">تعديل بيانات المندوب</h3>
          <label className="block space-y-1 text-xs">
            <span>الاسم الكامل</span>
            <Input
              required
              minLength={2}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span>البريد الإلكتروني</span>
            <Input
              type="email"
              dir="ltr"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span>رقم الجوال</span>
            <Input
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span>وسيلة التوصيل</span>
            <select
              value={form.vehicle}
              onChange={(e) => setForm({ ...form, vehicle: e.target.value as "car" | "motorcycle" })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="car">سيارة</option>
              <option value="motorcycle">دباب</option>
            </select>
          </label>
          <label className="block space-y-1 text-xs">
            <span>كلمة مرور جديدة (اتركها فارغة لعدم التغيير)</span>
            <Input
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </label>
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" disabled={busy}>
              حفظ التعديلات
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      ) : (
        /* Courier Full Details Card */
        <div className="rounded-2xl border bg-card p-5 space-y-3 shadow-xs">
          <h3 className="font-bold text-sm border-b pb-2">البيانات الخاصة بالمندوب</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">الاسم:</span>
              <span className="font-semibold">{courier.full_name || "غير محدد"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">الإيميل:</span>
              <span className="font-semibold truncate" dir="ltr">
                {courier.email}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">الجوال:</span>
              <span className="font-semibold" dir="ltr">
                {courier.phone || "غير مسجل"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Car className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">المركبة:</span>
              <span className="font-semibold">{courier.vehicle === "motorcycle" ? "دباب" : "سيارة"}</span>
            </div>
          </div>

          <div className="rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground space-y-1">
            <p>
              إجمالي الطلبات المنجزة: <strong className="text-foreground">{courier.completed_orders_count ?? 0} طلب مكتمل</strong>
            </p>
            <p>
              نظام العمل: <strong className="text-foreground">شيفت تلقائي 10 ساعات عند الضغط على أونلاين + توجيه للطلب الأقرب للمطعم</strong>
            </p>
          </div>

          {/* Attached Documents */}
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-xs font-bold flex items-center gap-1.5">
              <FileText className="size-4 text-primary" />
              المستندات والوثائق المرفقة
            </h4>
            {Object.keys(courier.documents ?? {}).length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد مستندات مرفقة لهذا الحساب</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(courier.documents).map(([key, path]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => void viewDocument(path)}
                  >
                    {documentLabels[key as keyof typeof documentLabels] ?? key}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Courier Active/Recent Orders */}
      <div className="rounded-2xl border bg-card p-5 space-y-3 shadow-xs">
        <h3 className="font-bold text-sm">الطلبات المسندة للمندوب ({orders.length})</h3>
        {orders.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد طلبات مسندة حالياً لهذا المندوب</p>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-xl border p-3 text-xs">
              <div>
                <p className="font-bold">طلب #{o.id.slice(0, 6)}</p>
                <p className="text-muted-foreground">{o.address}</p>
              </div>
              <div className="text-end">
                <span className="rounded-md bg-secondary px-2 py-0.5 font-semibold">
                  {STATUS_AR[o.status] ?? o.status}
                </span>
                <p className="mt-1 font-bold">{Number(o.total).toFixed(2)} ر.س</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: "approved" | "pending" | "rejected" }) {
  if (status === "pending") {
    return (
      <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-700">
        قيد المراجعة
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-bold text-destructive">
        مرفوض / موقوف
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
      معتمد
    </span>
  );
}

function Empty() {
  return <p className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات بعد</p>;
}

function NewAccount({ role, onDone }: { role: "customer" | "courier" | "restaurant"; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    vehicle: "car" as "car" | "motorcycle",
  });
  const [busy, setBusy] = useState(false);
  const label = role === "customer" ? "عميل" : role === "courier" ? "مندوب" : "مطعم";
  const create = useServerFn(createAccount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ data: { ...f, role } });
      toast.success(`تمت إضافة ${label}`);
      setF({ full_name: "", email: "", phone: "", password: "", vehicle: "car" });
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الإنشاء");
    } finally {
      setBusy(false);
    }
  };

  if (!open)
    return (
      <Button className="w-full" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> إضافة {label}
      </Button>
    );

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border bg-card p-3">
      <Input
        placeholder="الاسم الكامل"
        value={f.full_name}
        onChange={(e) => setF({ ...f, full_name: e.target.value })}
        required
      />
      <Input
        type="email"
        placeholder="البريد الإلكتروني"
        value={f.email}
        onChange={(e) => setF({ ...f, email: e.target.value })}
        required
      />
      <Input placeholder="رقم الجوال" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      {role === "courier" && (
        <select
          value={f.vehicle}
          onChange={(e) => setF({ ...f, vehicle: e.target.value as "car" | "motorcycle" })}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="car">سيارة</option>
          <option value="motorcycle">دباب</option>
        </select>
      )}
      <Input
        type="password"
        placeholder="كلمة المرور (8 أحرف على الأقل)"
        minLength={8}
        value={f.password}
        onChange={(e) => setF({ ...f, password: e.target.value })}
        required
      />
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={busy}>
          حفظ
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}
