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
  MapPin,
  Search,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  createAccount,
  listAccounts,
  updateAccount,
  deleteAccount,
  setCourierApprovalStatus,
  setCourierNeighborhoods,
  markOrderCompletedByAdmin,
} from "@/lib/admin.functions";
import {
  ADMIN_COMPLETED_ORDER_RETENTION_MS,
  ADMIN_INCOMPLETE_ORDER_RETENTION_MS,
  isAdminOrderVisible,
  getAdminOrderNonArrivalReason,
} from "@/lib/courier-shift-rules";
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
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<"all" | "active" | "completed" | "delayed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const qc = useQueryClient();
  const markCompletedFn = useServerFn(markOrderCompletedByAdmin);
  const deleteAccountFn = useServerFn(deleteAccount);

  const accounts = useQuery({
    queryKey: ["admin-app-accounts"],
    queryFn: () => listAccounts(),
    placeholderData: (prev) => prev,
  });

  const orders = useQuery({
    queryKey: ["admin-app-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "id,status,total,address,notes,created_at,updated_at,pickup_address,delivery_neighborhood,courier_id",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      const nowMs = Date.now();
      return (data ?? []).filter((o) => isAdminOrderVisible(o, nowMs));
    },
    refetchInterval: 30000,
    placeholderData: (prev) => prev,
  });

  const handleMarkOrderCompleted = async (orderId: string, completed: boolean) => {
    setBusyOrderId(orderId);
    try {
      await markCompletedFn({ data: { order_id: orderId, completed } });
      toast.success(
        completed
          ? "تم وضع علامة «اكتملت» على الطلب — سيُحذف تلقائياً من لوحة الأدمن بعد 24 ساعة"
          : "تم إعادة الطلب للمتابعة (يبقى لمدة 48 ساعة لمعرفة سبب عدم الوصول)",
      );
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تحديث حالة الطلب");
    } finally {
      setBusyOrderId(null);
    }
  };

  const restaurants = useQuery({
    queryKey: ["admin-app-restaurants"],
    queryFn: async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("id,name_ar,is_active,owner_id,address")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    placeholderData: (prev) => prev,
  });

  const refresh = () =>
    void qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("admin-app") });

  const allAccounts = accounts.data ?? [];
  const allOrders = orders.data ?? [];
  const allRestaurants = restaurants.data ?? [];

  const couriers = allAccounts.filter((a) => a.role === "courier");
  const customers = allAccounts.filter((a) => a.role === "customer");
  const restaurantAccounts = allAccounts.filter((a) => a.role === "restaurant");

  const completedOrders = allOrders.filter((o) => o.status === "delivered");
  const incompleteOrders = allOrders.filter((o) => o.status !== "delivered");
  const totalSales = allOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const violatedCouriers = couriers.filter(
    (c) => c.identity_violation_locked || c.identity_violation_pending,
  );
  const couriersMissingAreas = couriers.filter(
    (c) => !c.neighborhoods || c.neighborhoods.length < 3,
  );

  const count = (r: string) => allAccounts.filter((a) => a.role === r).length;

  const toggleRestaurant = async (id: string, active: boolean) => {
    const { error } = await supabase.from("restaurants").update({ is_active: !active }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(!active ? "تم تفعيل المتجر" : "تم إيقاف المتجر مؤقتاً");
      refresh();
    }
  };

  const handleDeleteUserAccount = async (u: AccountRow) => {
    if (!window.confirm(`هل أنت متأكد من حذف الحساب (${u.full_name || u.email}) نهائياً؟`)) return;
    try {
      await deleteAccountFn({ data: { id: u.id } });
      toast.success("تم حذف الحساب بنجاح");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر حذف الحساب");
    }
  };

  const tabs = [
    { id: "orders" as Tab, label: "الطلبات", icon: ClipboardList, n: allOrders.length },
    { id: "courier" as Tab, label: "المناديب", icon: Bike, n: count("courier") },
    { id: "restaurant" as Tab, label: "المطاعم", icon: Store, n: count("restaurant") },
    { id: "customer" as Tab, label: "العملاء", icon: Users, n: count("customer") },
  ];

  const selectedCourier =
    tab === "courier" && selectedCourierId
      ? couriers.find((a) => a.id === selectedCourierId) ?? null
      : null;

  const filteredOrders = allOrders.filter((o) => {
    if (orderFilter === "completed" && o.status !== "delivered") return false;
    if (orderFilter === "active" && (o.status === "delivered" || o.status === "cancelled")) return false;
    if (orderFilter === "delayed" && o.status === "delivered") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchId = o.id.toLowerCase().includes(q);
      const matchAddr = (o.address ?? "").toLowerCase().includes(q);
      const matchArea = (o.delivery_neighborhood ?? "").toLowerCase().includes(q);
      const matchPickup = (o.pickup_address ?? "").toLowerCase().includes(q);
      if (!matchId && !matchAddr && !matchArea && !matchPickup) return false;
    }
    return true;
  });

  return (
    <div dir="rtl" className="foodhub-staff min-h-screen bg-background pb-24 text-foreground">
      {/* Top Professional Command Header */}
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-xs">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold leading-tight">FoodHub Admin</h1>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  متصل مباشر
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                مركز القيادة وإدارة الطلبات والمناديب والمطاعم والعملاء
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={refresh} aria-label="تحديث" title="تحديث البيانات">
              <RefreshCw className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => void supabase.auth.signOut()}
              aria-label="خروج"
              title="تسجيل الخروج"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        {/* Global Alert if any courier has an Identity Violation */}
        {violatedCouriers.length > 0 && !selectedCourier && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-destructive bg-destructive/10 p-3.5 text-xs"
          >
            <div className="flex items-center gap-2 text-destructive font-bold">
              <AlertTriangle className="size-5 shrink-0" />
              <span>
                🚨 يوجد {violatedCouriers.length} مندوب لديه إخلال بالنظام (اختلاف الصورة الحية) ينتظر مراجعة الإدارة!
              </span>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setTab("courier");
                setSelectedCourierId(violatedCouriers[0]!.id);
              }}
              className="h-7 text-xs"
            >
              مراجعة حساب المندوب فوراً
            </Button>
          </div>
        )}

        {/* Executive KPI Summary Strip */}
        {!selectedCourier && (
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setTab("orders");
                setOrderFilter("all");
              }}
              className="rounded-2xl border bg-card p-3.5 text-start shadow-xs transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>إجمالي المبيعات</span>
                <TrendingUp className="size-4 text-primary" />
              </div>
              <p className="mt-1.5 text-lg font-bold tabular-nums">{totalSales.toFixed(0)} ر.س</p>
              <p className="text-[11px] text-muted-foreground">
                {completedOrders.length} مكتمل (24س) · {incompleteOrders.length} قيد الفحص (48س)
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab("orders");
                setOrderFilter("delayed");
              }}
              className="rounded-2xl border bg-card p-3.5 text-start shadow-xs transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>متابعة الطلبات</span>
                <Clock className="size-4 text-amber-600" />
              </div>
              <p className="mt-1.5 text-lg font-bold tabular-nums">{incompleteOrders.length} طلب</p>
              <p className="text-[11px] text-muted-foreground">
                تبقى 48 ساعة لمعرفة سبب عدم الوصول
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTab("courier")}
              className="rounded-2xl border bg-card p-3.5 text-start shadow-xs transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>المناديب والأحياء</span>
                <Bike className="size-4 text-primary" />
              </div>
              <p className="mt-1.5 text-lg font-bold tabular-nums">{couriers.length} مندوب</p>
              <p className="text-[11px] text-muted-foreground">
                {couriersMissingAreas.length > 0
                  ? `${couriersMissingAreas.length} مندوب بانتظار تحديد 3 أحياء`
                  : "جميع المناديب محددة لهم 3 أحياء ✓"}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTab("restaurant")}
              className="rounded-2xl border bg-card p-3.5 text-start shadow-xs transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>المطاعم والعملاء</span>
                <Store className="size-4 text-emerald-600" />
              </div>
              <p className="mt-1.5 text-lg font-bold tabular-nums">
                {allRestaurants.filter((r) => r.is_active).length} مطعم نشط
              </p>
              <p className="text-[11px] text-muted-foreground">{customers.length} عميل مسجل</p>
            </button>
          </section>
        )}

        {/* TAB 1: ORDERS MANAGEMENT (24h Completed / 48h Non-Arrival Diagnostics) */}
        {tab === "orders" ? (
          <section className="space-y-3">
            {/* Retention Policy & Filter Bar */}
            <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold text-sm">إدارة ومراقبة الطلبات الحية</h2>
                  <p className="text-[11px] text-muted-foreground">
                    • الطلبات المكتملة (<strong>اكتملت ✓</strong>) تُحذف تلقائياً بعد <strong>24 ساعة</strong> · باقي الطلبات تبقى <strong>48 ساعة</strong> لمعرفة أسباب عدم وصولها
                  </p>
                </div>
              </div>

              {/* Search & Quick Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-2.5 start-3 size-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث برقم الطلب، العنوان، أو الحي..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-9 text-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ["all", `الكل (${allOrders.length})`],
                      ["active", `قيد التنفيذ (${incompleteOrders.length})`],
                      ["completed", `اكتملت 24س (${completedOrders.length})`],
                      ["delayed", `تحقيق عدم الوصول 48س (${incompleteOrders.length})`],
                    ] as const
                  ).map(([key, label]) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={orderFilter === key ? "default" : "outline"}
                      onClick={() => setOrderFilter(key)}
                      className="h-8 text-xs px-2.5"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <Empty />
            ) : (
              filteredOrders.map((o) => {
                const isCompleted = o.status === "delivered";
                const refIso = isCompleted ? o.updated_at || o.created_at : o.created_at;
                const elapsedMs = Math.max(0, Date.now() - Date.parse(refIso));
                const maxMs = isCompleted
                  ? ADMIN_COMPLETED_ORDER_RETENTION_MS
                  : ADMIN_INCOMPLETE_ORDER_RETENTION_MS;
                const remainingHours = Math.max(
                  0,
                  Math.ceil((maxMs - elapsedMs) / (60 * 60 * 1000)),
                );
                const nonArrivalReason = getAdminOrderNonArrivalReason(o);
                const assignedCourier = o.courier_id
                  ? couriers.find((c) => c.id === o.courier_id)
                  : null;

                return (
                  <article key={o.id} className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base">#{o.id.slice(0, 6)}</span>
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="size-3.5" />
                            اكتملت (وصلت للعميل)
                          </span>
                        ) : (
                          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold">
                            {STATUS_AR[o.status] ?? o.status}
                          </span>
                        )}
                        {o.delivery_neighborhood && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold">
                            <MapPin className="size-3 text-primary" />
                            {o.delivery_neighborhood}
                          </span>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant={isCompleted ? "outline" : "default"}
                        disabled={busyOrderId === o.id}
                        onClick={() => void handleMarkOrderCompleted(o.id, !isCompleted)}
                        className="h-8 gap-1.5 px-3 text-xs font-bold"
                      >
                        <Check className="size-3.5" />
                        {isCompleted ? "مكتمل ✓ (إلغاء العلامة)" : "وضع علامة اكتملت ✓"}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-xl bg-secondary/40 p-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">عنوان التسليم: </span>
                        <strong className="text-foreground">{o.address}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">المندوب المسند: </span>
                        <strong className="text-foreground">
                          {assignedCourier
                            ? assignedCourier.full_name || assignedCourier.email
                            : "لم يُسند لمندوب بعد"}
                        </strong>
                      </div>
                      <div className="sm:text-end">
                        <span className="text-muted-foreground">الإجمالي: </span>
                        <strong className="text-sm text-foreground">{Number(o.total).toFixed(2)} ر.س</strong>
                      </div>
                    </div>

                    {isCompleted ? (
                      <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-800">
                        ✓ تم وصول الطلب واكتماله — يُحذف تلقائياً من لوحة الأدمن بعد{" "}
                        <strong>{remainingHours} ساعة</strong> (مهلة 24 ساعة للطلبات المكتملة)
                      </div>
                    ) : (
                      <div className="space-y-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs">
                        <p className="font-bold text-amber-900">
                          سبب عدم الوصول حتى الآن: <span className="font-medium">{nonArrivalReason}</span>
                        </p>
                        <p className="text-muted-foreground">
                          يبقى هذا الطلب في لوحة الأدمن لمدة 48 ساعة لمعرفة أسباب عدم وصوله (المتبقي{" "}
                          <strong>{remainingHours} ساعة</strong> قبل الحذف التلقائي)
                        </p>
                      </div>
                    )}

                    {["ready", "on_the_way"].includes(o.status) && <LiveOrderMap orderId={o.id} />}
                    {["pending", "accepted", "preparing", "ready"].includes(o.status) && (
                      <AdminOrderRouting
                        orderId={o.id}
                        pickup={o.pickup_address}
                        neighborhood={o.delivery_neighborhood}
                        onDone={refresh}
                      />
                    )}
                  </article>
                );
              })
            )}
          </section>
        ) : tab === "courier" ? (
          selectedCourier ? (
            <CourierDetailPage
              courier={selectedCourier}
              orders={allOrders.filter((o) => o.courier_id === selectedCourier.id)}
              onBack={() => setSelectedCourierId(null)}
              onChanged={refresh}
            />
          ) : (
            <CourierListSection
              couriers={couriers}
              onSelect={(id) => setSelectedCourierId(id)}
              onChanged={refresh}
            />
          )
        ) : (
          <section className="space-y-3">
            {tab === "restaurant" && <AdminApplications type="restaurant" />}
            <NewAccount role={tab} onDone={refresh} />

            {tab === "restaurant" && allRestaurants.length > 0 && (
              <div className="rounded-2xl border bg-card p-4 space-y-2.5 shadow-xs">
                <h2 className="text-sm font-bold flex items-center gap-1.5">
                  <Store className="size-4 text-primary" />
                  المتاجر والمطاعم المسجلة ({allRestaurants.length})
                </h2>
                {allRestaurants.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border bg-background p-3"
                  >
                    <div>
                      <p className="font-bold text-sm">{r.name_ar}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.address || "لم يُحدد العنوان على الخريطة بعد"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={r.is_active ? "outline" : "default"}
                      onClick={() => void toggleRestaurant(r.id, r.is_active)}
                    >
                      {r.is_active ? "إيقاف مؤقت" : "تفعيل المتجر"}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl border bg-card p-4 space-y-2.5 shadow-xs">
              <h2 className="text-sm font-bold">
                {tab === "customer"
                  ? `حسابات العملاء (${customers.length})`
                  : `حسابات مدراء المطاعم (${restaurantAccounts.length})`}
              </h2>
              {allAccounts.filter((a) => a.role === tab).length === 0 ? (
                <Empty />
              ) : (
                allAccounts
                  .filter((a) => a.role === tab)
                  .map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{a.full_name || a.email}</p>
                        <p className="text-xs text-muted-foreground truncate" dir="ltr">
                          {a.email}
                          {a.phone ? ` · ${a.phone}` : ""}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-8 shrink-0 text-destructive hover:bg-destructive/10"
                        title="حذف الحساب"
                        aria-label="حذف"
                        onClick={() => void handleDeleteUserAccount(a)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))
              )}
            </div>
          </section>
        )}
      </main>

      <nav
        aria-label="شريط التنقل السفلي للإدارة"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-card/95 backdrop-blur-md px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.06)]"
      >
        <div className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-1">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  setTab(t.id);
                  setSelectedCourierId(null);
                }}
                className="group relative flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 transition-all"
              >
                {active && (
                  <span className="absolute top-0 h-1 w-8 rounded-full bg-primary" />
                )}
                <span
                  className={`relative flex h-8 w-12 items-center justify-center rounded-2xl transition-all duration-200 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-xs scale-105"
                      : "text-muted-foreground group-hover:bg-secondary group-hover:text-foreground"
                  }`}
                >
                  <t.icon className={`size-5 ${active ? "stroke-[2.4]" : "stroke-[1.9]"}`} />
                  {t.n > 0 && (
                    <span
                      className={`absolute -top-1 -start-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black ${
                        active
                          ? "bg-foreground text-background"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {t.n}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[11px] leading-tight transition-colors ${
                    active ? "font-extrabold text-foreground" : "font-medium text-muted-foreground"
                  }`}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
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
  const [quickAreaCourierId, setQuickAreaCourierId] = useState<string | null>(null);
  const [quickAreas, setQuickAreas] = useState<[string, string, string]>(["", "", ""]);
  const [courierSearch, setCourierSearch] = useState("");
  const [courierFilter, setCourierFilter] = useState<"all" | "approved" | "pending" | "violation" | "no_areas">(
    "all",
  );
  const decideFn = useServerFn(setCourierApprovalStatus);
  const removeFn = useServerFn(deleteAccount);
  const saveNeighborhoodsFn = useServerFn(setCourierNeighborhoods);

  const openQuickAreas = (c: AccountRow) => {
    if (quickAreaCourierId === c.id) {
      setQuickAreaCourierId(null);
      return;
    }
    setQuickAreaCourierId(c.id);
    setQuickAreas([
      c.neighborhoods?.[0] ?? "",
      c.neighborhoods?.[1] ?? "",
      c.neighborhoods?.[2] ?? "",
    ]);
  };

  const handleSaveQuickAreas = async (courierId: string) => {
    const cleaned = quickAreas.map((a) => a.trim()) as [string, string, string];
    if (cleaned.some((a) => a.length < 2)) {
      toast.error("يرجى إدخال أسماء الأحياء الثلاثة للمندوب");
      return;
    }
    if (new Set(cleaned).size !== 3) {
      toast.error("الأحياء الثلاثة يجب أن تكون مختلفة");
      return;
    }
    setBusyId(courierId);
    try {
      await saveNeighborhoodsFn({
        data: {
          courier_id: courierId,
          neighborhoods: cleaned,
        },
      });
      toast.success("تم حفظ الأحياء الثلاثة للمندوب بنجاح ويمكنه الآن الدخول أونلاين");
      setQuickAreaCourierId(null);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر حفظ الأحياء الثلاثة");
    } finally {
      setBusyId(null);
    }
  };

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

  const filteredCouriers = couriers.filter((c) => {
    if (courierFilter === "approved" && c.status !== "approved") return false;
    if (courierFilter === "pending" && c.status !== "pending") return false;
    if (
      courierFilter === "violation" &&
      !c.identity_violation_locked &&
      !c.identity_violation_pending
    )
      return false;
    if (courierFilter === "no_areas" && c.neighborhoods && c.neighborhoods.length === 3) return false;
    if (courierSearch.trim()) {
      const q = courierSearch.trim().toLowerCase();
      const matchName = (c.full_name ?? "").toLowerCase().includes(q);
      const matchEmail = (c.email ?? "").toLowerCase().includes(q);
      const matchPhone = (c.phone ?? "").toLowerCase().includes(q);
      const matchArea = (c.neighborhoods ?? []).some((a) => a.toLowerCase().includes(q));
      if (!matchName && !matchEmail && !matchPhone && !matchArea) return false;
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <NewAccount role="courier" onDone={onChanged} />

      {/* Search & Filter Bar for Couriers */}
      <div className="rounded-2xl border bg-card p-3.5 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">إدارة المناديب وتحديد الأحياء الثلاثة</h2>
          <span className="text-xs text-muted-foreground">{filteredCouriers.length} مندوب</span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 start-3 size-4 text-muted-foreground" />
          <Input
            placeholder="ابحث باسم المندوب، الإيميل، الجوال، أو الحي..."
            value={courierSearch}
            onChange={(e) => setCourierSearch(e.target.value)}
            className="ps-9 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["all", "الكل"],
              ["approved", "معتمد"],
              ["pending", "قيد المراجعة"],
              ["no_areas", "بانتظار تحديد 3 أحياء"],
              ["violation", "مخالفة الهوية 🚨"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={courierFilter === key ? "default" : "outline"}
              onClick={() => setCourierFilter(key)}
              className="h-7 text-xs px-2.5"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {filteredCouriers.length === 0 ? (
        <Empty />
      ) : (
        filteredCouriers.map((c) => {
          const isBusy = busyId === c.id;
          const isQuickAreasOpen = quickAreaCourierId === c.id;
          return (
            <article
              key={c.id}
              className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/50"
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
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    {c.neighborhoods && c.neighborhoods.length === 3 ? (
                      <>
                        <span className="inline-flex items-center gap-1 font-semibold text-primary">
                          <MapPin className="size-3.5" />
                          أحياء العمل:
                        </span>
                        {c.neighborhoods.map((area) => (
                          <span
                            key={area}
                            className="rounded-md bg-secondary px-2 py-0.5 font-medium text-foreground"
                          >
                            {area}
                          </span>
                        ))}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-700">
                        <MapPin className="size-3.5" />
                        لم تحدد الأحياء الثلاثة بعد — اضغط زر «+ إضافة الأحياء (3)»
                      </span>
                    )}
                  </div>
                </button>

                {/* Quick Action Icons: Approve, Reject, Add Neighborhoods, Edit/Open, Delete */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-1">
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
                      title="فتح صفحة المندوب المستقلة والتعديل"
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
                  <Button
                    size="sm"
                    variant={
                      isQuickAreasOpen
                        ? "default"
                        : c.neighborhoods && c.neighborhoods.length === 3
                          ? "outline"
                          : "default"
                    }
                    className="h-7 gap-1 px-2.5 text-xs font-bold"
                    onClick={() => openQuickAreas(c)}
                  >
                    <MapPin className="size-3.5" />
                    {c.neighborhoods && c.neighborhoods.length === 3 ? "تعديل الأحياء (3)" : "+ إضافة الأحياء (3)"}
                  </Button>
                </div>
              </div>

              {/* Inline Quick 3-Neighborhood Assignment Drawer right on the Courier Card */}
              {isQuickAreasOpen && (
                <div className="space-y-3 rounded-xl border bg-background p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-primary" />
                      تحديد الأحياء الثلاثة للمندوب ({c.full_name || c.email})
                    </p>
                    <button
                      type="button"
                      onClick={() => setQuickAreaCourierId(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      إغلاق ✕
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {[
                      "العزيزية",
                      "الخالدية",
                      "المنصورة",
                      "النرجس",
                      "الياسمين",
                      "العارض",
                      "الملقا",
                      "العليا",
                      "الروضة",
                    ].map((suggested) => {
                      const selected = quickAreas.includes(suggested);
                      return (
                        <button
                          key={suggested}
                          type="button"
                          onClick={() => {
                            if (selected) return;
                            const emptyIdx = quickAreas.findIndex((a) => !a.trim());
                            const targetIdx = emptyIdx !== -1 ? emptyIdx : 2;
                            const next: [string, string, string] = [
                              quickAreas[0],
                              quickAreas[1],
                              quickAreas[2],
                            ];
                            next[targetIdx] = suggested;
                            setQuickAreas(next);
                          }}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "bg-card hover:border-primary"
                          }`}
                        >
                          + {suggested}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {([0, 1, 2] as const).map((idx) => (
                      <Input
                        key={idx}
                        placeholder={`الحي رقم ${idx + 1}`}
                        value={quickAreas[idx]}
                        onChange={(e) => {
                          const next: [string, string, string] = [
                            quickAreas[0],
                            quickAreas[1],
                            quickAreas[2],
                          ];
                          next[idx] = e.target.value;
                          setQuickAreas(next);
                        }}
                        className="text-xs"
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 font-bold"
                      disabled={isBusy}
                      onClick={() => void handleSaveQuickAreas(c.id)}
                    >
                      <Check className="size-4" />
                      حفظ الأحياء الثلاثة للمندوب
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelect(c.id)}
                    >
                      فتح صفحة المندوب الكاملة
                    </Button>
                  </div>
                </div>
              )}
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
  const [editingNeighborhoods, setEditingNeighborhoods] = useState(
    !courier.neighborhoods || courier.neighborhoods.length < 3,
  );
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState(courier.rejection_reason ?? "");
  const [areas, setAreas] = useState<[string, string, string]>([
    courier.neighborhoods?.[0] ?? "",
    courier.neighborhoods?.[1] ?? "",
    courier.neighborhoods?.[2] ?? "",
  ]);
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
  const saveNeighborhoodsFn = useServerFn(setCourierNeighborhoods);

  const saveNeighborhoods = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = areas.map((a) => a.trim()) as [string, string, string];
    if (cleaned.some((a) => a.length < 2)) {
      toast.error("يرجى إدخال أسماء الأحياء الثلاثة للمندوب");
      return;
    }
    if (new Set(cleaned).size !== 3) {
      toast.error("الأحياء الثلاثة يجب أن تكون مختلفة");
      return;
    }
    setBusy(true);
    try {
      await saveNeighborhoodsFn({
        data: {
          courier_id: courier.id,
          neighborhoods: cleaned,
        },
      });
      toast.success("تم حفظ الأحياء الثلاثة للمندوب بنجاح ويمكنه الآن الدخول أونلاين");
      setEditingNeighborhoods(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر حفظ الأحياء الثلاثة");
    } finally {
      setBusy(false);
    }
  };

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

        {/* Add/Edit 3 Neighborhoods Button */}
        <Button
          type="button"
          variant={editingNeighborhoods ? "default" : "outline"}
          className="w-full gap-2 font-bold"
          onClick={() => setEditingNeighborhoods((v) => !v)}
        >
          <MapPin className="size-4" />
          {courier.neighborhoods && courier.neighborhoods.length === 3
            ? "تعديل أحياء عمل المندوب الثلاثة"
            : "+ إضافة أحياء عمل المندوب الثلاثة (مطلوب للعمل أونلاين)"}
        </Button>

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

      {/* 3 Neighborhoods Card (Admin-Assigned) */}
      <div className="rounded-2xl border bg-card p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-bold text-sm flex items-center gap-1.5">
            <MapPin className="size-4 text-primary" />
            أحياء عمل المندوب الثلاثة (تحدد عن طريق الأدمن)
          </h3>
          <Button
            type="button"
            size="sm"
            variant={editingNeighborhoods ? "outline" : "default"}
            onClick={() => setEditingNeighborhoods((v) => !v)}
            className="h-7 gap-1 text-xs"
          >
            <Plus className="size-3.5" />
            {editingNeighborhoods
              ? "إغلاق النموذج"
              : courier.neighborhoods && courier.neighborhoods.length === 3
                ? "تعديل الأحياء"
                : "إضافة الأحياء الثلاثة"}
          </Button>
        </div>

        {courier.neighborhoods && courier.neighborhoods.length === 3 ? (
          <div className="flex flex-wrap gap-2">
            {courier.neighborhoods.map((area, idx) => (
              <span
                key={area}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold"
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {idx + 1}
                </span>
                {area}
              </span>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 font-medium">
            ⚠️ لم يتم تحديد الأحياء الثلاثة لهذا المندوب بعد. يرجى إدخال الأحياء الثلاثة بالأسفل وحفظها ليتمكن المندوب من الدخول «أونلاين».
          </div>
        )}

        {editingNeighborhoods && (
          <form onSubmit={saveNeighborhoods} className="space-y-3 rounded-xl border bg-background p-4">
            <p className="text-xs font-semibold">
              حدد 3 أحياء مختلفة يعمل بها المندوب (أو اختر من الأحياء السريعة):
            </p>

            {/* Quick Neighborhood Suggestions */}
            <div className="flex flex-wrap gap-1.5">
              {[
                "العزيزية",
                "الخالدية",
                "المنصورة",
                "النرجس",
                "الياسمين",
                "العارض",
                "الملقا",
                "العليا",
                "الروضة",
              ].map((suggested) => {
                const isSelected = areas.includes(suggested);
                return (
                  <button
                    key={suggested}
                    type="button"
                    onClick={() => {
                      if (isSelected) return;
                      const emptyIdx = areas.findIndex((a) => !a.trim());
                      const targetIdx = emptyIdx !== -1 ? emptyIdx : 2;
                      const next: [string, string, string] = [areas[0], areas[1], areas[2]];
                      next[targetIdx] = suggested;
                      setAreas(next);
                    }}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card hover:border-primary"
                    }`}
                  >
                    + {suggested}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([0, 1, 2] as const).map((idx) => (
                <label key={idx} className="block space-y-1 text-xs">
                  <span className="font-semibold">الحي رقم {idx + 1}</span>
                  <Input
                    required
                    minLength={2}
                    placeholder={`مثال: ${["العزيزية", "الخالدية", "المنصورة"][idx]}`}
                    value={areas[idx]}
                    onChange={(e) => {
                      const next: [string, string, string] = [areas[0], areas[1], areas[2]];
                      next[idx] = e.target.value;
                      setAreas(next);
                    }}
                  />
                </label>
              ))}
            </div>

            <Button type="submit" className="w-full gap-1.5 font-bold" disabled={busy}>
              <Check className="size-4" />
              حفظ الأحياء الثلاثة للمندوب
            </Button>
          </form>
        )}
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
