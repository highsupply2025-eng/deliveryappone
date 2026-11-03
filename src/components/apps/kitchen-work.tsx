import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Store,
  ChefHat,
  PackageCheck,
  Bike,
  UtensilsCrossed,
  Sparkles,
  Wallet,
  MapPin,
  BellRing,
  VolumeX,
  RefreshCw,
  LogOut,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Check,
  Power,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { useRealtime } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneLogin } from "./phone-login";
import { StaffOnboarding } from "./staff-onboarding";
import { LiveOrderMap } from "./live-order-map";
import { RestaurantMenu } from "./restaurant-menu";
import { RestaurantSales } from "./restaurant-sales";
import { RestaurantLocation } from "./restaurant-location";
import { toast } from "sonner";

type StoreTab = "orders" | "products" | "offers" | "tracking" | "sales" | "location";
type OrderFilter = "all" | "preparing" | "ready" | "on_the_way";

function playKitchenTicketChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = [659.25, 880, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.14);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.14 + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.14);
      osc.stop(ctx.currentTime + i * 0.14 + 0.13);
    });
  } catch {
    /* ignore audio restriction */
  }
}

export function KitchenWork() {
  const { user, role, loading } = useSession();
  if (loading)
    return (
      <div
        dir="rtl"
        className="foodhub-staff flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground"
      >
        <p className="text-muted-foreground">جارِ التحميل…</p>
      </div>
    );
  if (!user)
    return (
      <div
        dir="rtl"
        className="foodhub-staff flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground"
      >
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Store className="size-7" />
            </div>
            <h1 className="text-xl font-bold">FoodHub Store</h1>
            <p className="text-sm text-muted-foreground">تسجيل دخول المتجر أو المطعم</p>
          </div>
          <PhoneLogin />
        </div>
      </div>
    );
  if (role !== "restaurant" && role !== "admin")
    return <StaffOnboarding userId={user.id} type="restaurant" />;
  return <Tickets userId={user.id} admin={role === "admin"} />;
}

function Tickets({ userId, admin }: { userId: string; admin: boolean }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<StoreTab>("orders");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState(Date.now());

  useRealtime(
    ["orders", "order_items", "restaurants", "menu_items"],
    ["kitchen-live-orders", "kitchen-restaurant", "restaurant-menu", "restaurant-sales"],
    "kitchen-live",
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const restaurant = useQuery({
    queryKey: ["kitchen-restaurant", userId],
    queryFn: async () => {
      let q = supabase
        .from("restaurants")
        .select(
          "id,name_ar,cuisine_ar,address,latitude,longitude,is_active,image_url,eta_minutes,delivery_fee,min_order",
        );
      if (!admin) q = q.eq("owner_id", userId);
      const { data, error } = await q.limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    placeholderData: (prev) => prev,
  });

  const orders = useQuery({
    queryKey: ["kitchen-live-orders", restaurant.data?.id],
    enabled: !!restaurant.data,
    queryFn: async () => {
      if (!restaurant.data) return [];
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,status,address,total,subtotal,notes,phone,created_at,courier_accepted_at,order_items(name_ar,quantity,price)",
        )
        .eq("restaurant_id", restaurant.data.id)
        .not("courier_accepted_at", "is", null)
        .not("status", "in", "(delivered,cancelled)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    placeholderData: (prev) => prev,
  });

  const allOrders = orders.data ?? [];

  // Play chime when active tickets count increases
  useEffect(() => {
    if (!soundEnabled || !allOrders.length) return;
    playKitchenTicketChime();
  }, [soundEnabled, allOrders.length]);

  const refreshAll = () => {
    void qc.invalidateQueries({ queryKey: ["kitchen-restaurant"] });
    void qc.invalidateQueries({ queryKey: ["kitchen-live-orders"] });
    void qc.invalidateQueries({ queryKey: ["restaurant-menu"] });
    void qc.invalidateQueries({ queryKey: ["restaurant-sales"] });
  };

  const toggleStoreOpen = async () => {
    if (!restaurant.data) return;
    const nextState = !restaurant.data.is_active;
    setBusy(true);
    const { error } = await supabase
      .from("restaurants")
      .update({ is_active: nextState })
      .eq("id", restaurant.data.id);
    setBusy(false);
    if (error) {
      toast.error("تعذر تغيير حالة المتجر");
    } else {
      toast.success(
        nextState
          ? "تم فتح المتجر لاستقبال طلبات العملاء"
          : "تم إغلاق المتجر مؤقتاً وإيقاف استقبال الطلبات الجديدة",
      );
      void qc.invalidateQueries({ queryKey: ["kitchen-restaurant"] });
    }
  };

  const advance = async (id: string, status: "preparing" | "ready") => {
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    setBusy(false);
    if (error) {
      toast.error("تعذر تحديث حالة الطلب");
    } else {
      toast.success(
        status === "ready"
          ? "تم تحويل الطلب إلى «جاهز للاستلام» وإشعار المندوب ✓"
          : "تم بدء تحضير الطلب في المطبخ",
      );
      void qc.invalidateQueries({ queryKey: ["kitchen-live-orders"] });
    }
  };

  // KPI metrics
  const preparingCount = allOrders.filter(
    (o) => o.status === "preparing" || o.status === "pending" || o.status === "accepted",
  ).length;
  const readyCount = allOrders.filter((o) => o.status === "ready").length;
  const onTheWayCount = allOrders.filter((o) => o.status === "on_the_way").length;
  const activeRevenue = allOrders.reduce((sum, o) => sum + Number(o.subtotal || o.total || 0), 0);

  const tabs: { key: StoreTab; label: string; icon: typeof Store; badge?: number }[] = [
    { key: "orders", label: "الطلبات", icon: ChefHat, badge: allOrders.length },
    { key: "products", label: "المنتجات", icon: UtensilsCrossed },
    { key: "offers", label: "العروض", icon: Sparkles },
    { key: "tracking", label: "التتبع", icon: Bike, badge: onTheWayCount },
    { key: "sales", label: "المبيعات", icon: Wallet },
    { key: "location", label: "الموقع", icon: MapPin },
  ];

  const baseList =
    tab === "tracking" ? allOrders.filter((o) => o.status === "on_the_way") : allOrders;

  const shown = baseList.filter((o) => {
    if (tab === "orders" && orderFilter !== "all") {
      if (orderFilter === "preparing") {
        if (o.status !== "preparing" && o.status !== "pending" && o.status !== "accepted") {
          return false;
        }
      } else if (o.status !== orderFilter) {
        return false;
      }
    }
    const q = orderSearch.trim().toLowerCase();
    if (!q) return true;
    const matchId = o.id.toLowerCase().includes(q);
    const matchAddr = (o.address ?? "").toLowerCase().includes(q);
    const matchItems = o.order_items.some((i) => i.name_ar.toLowerCase().includes(q));
    return matchId || matchAddr || matchItems;
  });

  const hasLocationConfigured =
    !!restaurant.data?.address && restaurant.data?.latitude != null;

  return (
    <div dir="rtl" className="foodhub-staff min-h-screen bg-background pb-24 text-foreground">
      {/* Top Executive Store Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-card px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTab("location")}
            title="إعدادات وموقع المتجر"
            className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-primary bg-secondary text-foreground shadow-xs"
          >
            {restaurant.data?.image_url ? (
              <img
                src={restaurant.data.image_url}
                alt={restaurant.data.name_ar}
                className="size-full object-cover"
              />
            ) : (
              <Store className="size-5 text-primary" />
            )}
            <span
              className={`absolute bottom-0 start-0 size-3 rounded-full border-2 border-card ${
                restaurant.data?.is_active ? "bg-emerald-500" : "bg-destructive"
              }`}
            />
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold leading-tight">
                {restaurant.data?.name_ar ?? "FoodHub Store"}
              </h1>
              {restaurant.data?.cuisine_ar && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                  {restaurant.data.cuisine_ar}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {restaurant.data?.is_active ? "مفتوح ويستقبل الطلبات" : "مغلق مؤقتاً"} · نطاق توصيل المناديب 10 كم
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {restaurant.data && (
            <Button
              size="sm"
              variant={restaurant.data.is_active ? "outline" : "default"}
              disabled={busy}
              onClick={() => void toggleStoreOpen()}
              className="gap-1 px-2.5 text-xs"
            >
              <Power className="size-3.5" />
              <span>{restaurant.data.is_active ? "إغلاق مؤقت" : "فتح المتجر"}</span>
            </Button>
          )}

          <Button
            size="sm"
            variant={allOrders.length > 0 ? "default" : "outline"}
            onClick={() => {
              playKitchenTicketChime();
              setSoundEnabled((v) => !v);
              toast.info(
                !soundEnabled ? "تم تفعيل جرس تذاكر المطبخ 🔊" : "تم اختبار جرس تذاكر المطبخ 🔔",
              );
            }}
            aria-label="جرس التنبيه"
            className="gap-1 px-2 text-xs"
          >
            {soundEnabled ? <BellRing className="size-4" /> : <VolumeX className="size-4" />}
          </Button>

          <Button size="icon" variant="ghost" aria-label="تحديث" onClick={refreshAll}>
            <RefreshCw className="size-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            aria-label="خروج"
            onClick={() => void supabase.auth.signOut()}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {/* Missing Store Location Warning Banner */}
        {restaurant.data && tab !== "location" && !hasLocationConfigured && (
          <button
            type="button"
            onClick={() => setTab("location")}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-destructive bg-destructive/10 p-4 text-start text-xs text-destructive shadow-xs"
          >
            <div className="space-y-0.5">
              <p className="font-bold text-sm flex items-center gap-1.5">
                <AlertTriangle className="size-4 shrink-0" />
                تنبيه هام: لم يتم تحديد موقع المتجر على الخريطة بعد
              </p>
              <p>
                حدد عنوان وإحداثيات المتجر حتى يصل الطلب تلقائياً للمناديب المتواجدين في حيز 10 كيلومتر.
              </p>
            </div>
            <span className="shrink-0 rounded-lg bg-destructive px-3 py-1.5 font-bold text-destructive-foreground">
              تحديد الموقع ←
            </span>
          </button>
        )}

        {/* Executive 4-Card Store KPI Strip */}
        {restaurant.data && (
          <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-2xl border bg-card p-3 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>قيد التحضير</span>
                <ChefHat className="size-3.5 text-primary" />
              </div>
              <p className="mt-1 text-xl font-black text-primary">{preparingCount}</p>
              <p className="text-[10px] text-muted-foreground">تذكرة نشطة بالمطبخ</p>
            </div>

            <div className="rounded-2xl border bg-card p-3 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>جاهزة للاستلام</span>
                <PackageCheck className="size-3.5 text-emerald-600" />
              </div>
              <p className="mt-1 text-xl font-black text-emerald-700">{readyCount}</p>
              <p className="text-[10px] text-muted-foreground">بانتظار استلام المندوب</p>
            </div>

            <div className="rounded-2xl border bg-card p-3 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>في الطريق للعميل</span>
                <Bike className="size-3.5 text-primary" />
              </div>
              <p className="mt-1 text-xl font-black">{onTheWayCount}</p>
              <p className="text-[10px] text-muted-foreground">توصيل حي عبر GPS</p>
            </div>

            <div className="rounded-2xl border bg-card p-3 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>مبيعات نشطة</span>
                <Wallet className="size-3.5 text-emerald-600" />
              </div>
              <p className="mt-1 text-lg font-black text-emerald-700">
                {activeRevenue.toFixed(0)} <span className="text-xs font-bold">ر.س</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {hasLocationConfigured ? "موقع المتجر مفعّل ✓" : "يلزم تحديد الموقع"}
              </p>
            </div>
          </section>
        )}

        {/* Quick Navigation Pills */}
        <nav className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {tabs.map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={tab === t.key ? "default" : "outline"}
              onClick={() => setTab(t.key)}
              className="gap-1.5 text-xs"
            >
              <t.icon className="size-3.5" />
              <span>{t.label}</span>
              {t.badge != null && t.badge > 0 && (
                <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-bold">
                  {t.badge}
                </span>
              )}
            </Button>
          ))}
        </nav>

        {/* TAB CONTENT */}
        {restaurant.data && tab === "location" ? (
          <RestaurantLocation restaurantId={restaurant.data.id} />
        ) : restaurant.data && tab === "sales" ? (
          <RestaurantSales restaurantId={restaurant.data.id} />
        ) : restaurant.data && (tab === "products" || tab === "offers") ? (
          <RestaurantMenu restaurantId={restaurant.data.id} offers={tab === "offers"} />
        ) : restaurant.isError || orders.isError ? (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            تعذر تحميل الطلبات — اضغط زر التحديث بالأعلى
          </p>
        ) : restaurant.isPending || (orders.isPending && restaurant.data) ? (
          <div className="rounded-2xl border bg-card py-12 text-center text-sm text-muted-foreground">
            جارِ تحميل الطلبات والتذاكر الحية…
          </div>
        ) : !restaurant.data ? (
          <div className="rounded-2xl border bg-card py-12 text-center text-sm text-muted-foreground">
            لا يوجد مطعم أو متجر مرتبط بحسابك حالياً
          </div>
        ) : (
          <section className="space-y-3">
            {/* Search & Status Filter Bar for Orders / Tracking */}
            <div className="flex flex-col gap-2 rounded-2xl border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute end-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="ابحث برقم التذكرة أو اسم الوجبة أو عنوان العميل..."
                  className="h-9 pe-9 text-xs"
                />
              </div>
              {tab === "orders" && (
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ["all", `الكل (${allOrders.length})`],
                      ["preparing", `قيد التحضير (${preparingCount})`],
                      ["ready", `جاهز للاستلام (${readyCount})`],
                      ["on_the_way", `مع المندوب (${onTheWayCount})`],
                    ] as const
                  ).map(([key, label]) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={orderFilter === key ? "default" : "outline"}
                      onClick={() => setOrderFilter(key)}
                      className="h-8 px-2.5 text-xs"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {!shown.length ? (
              <div className="rounded-2xl border bg-card py-12 text-center text-muted-foreground shadow-xs">
                <ChefHat className="mx-auto mb-3 size-10" />
                <p className="font-bold text-foreground">
                  {tab === "tracking"
                    ? "لا يوجد مندوب في الطريق حالياً"
                    : "لا توجد طلبات نشطة مطابقة حالياً"}
                </p>
                <p className="mt-1 text-xs">
                  بمجرد قبول المندوب الأقرب (ضمن نطاق 10 كم) للطلب، ستظهر تذكرة التحضير هنا فوراً مع تنبيه صوتي.
                </p>
              </div>
            ) : (
              shown.map((o) => {
                const elapsedMin = Math.max(
                  1,
                  Math.floor((now - Date.parse(o.created_at)) / 60000),
                );
                const isPreparing =
                  o.status === "preparing" || o.status === "pending" || o.status === "accepted";
                const isReady = o.status === "ready";
                const step = isPreparing ? 1 : isReady ? 2 : 3;

                return (
                  <article
                    key={o.id}
                    className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs"
                  >
                    {/* Ticket Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                      <div className="flex items-center gap-2">
                        <h2 className="font-black text-base">تذكرة #{o.id.slice(0, 8)}</h2>
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">
                          <Clock className="size-3 text-primary" />
                          منذ {elapsedMin} د
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isPreparing
                              ? "bg-amber-500/15 text-amber-800"
                              : isReady
                                ? "bg-emerald-500/15 text-emerald-700"
                                : "bg-primary/20 text-foreground"
                          }`}
                        >
                          {isPreparing
                            ? "قيد التحضير — المندوب قبل الطلب"
                            : isReady
                              ? "جاهز للاستلام في المتجر ✓"
                              : "مع المندوب في الطريق للعميل"}
                        </span>
                        <span className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-black">
                          {Number(o.subtotal || o.total || 0).toFixed(2)} ر.س
                        </span>
                      </div>
                    </div>

                    {/* 3-Step Visual Kitchen Progress Stepper */}
                    <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-secondary/40 p-2 text-center text-[11px]">
                      {[
                        { s: 1, label: "1. التحضير بالمطبخ" },
                        { s: 2, label: "2. جاهز للاستلام" },
                        { s: 3, label: "3. مع المندوب" },
                      ].map((item) => {
                        const done = step > item.s;
                        const active = step === item.s;
                        return (
                          <div
                            key={item.s}
                            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 px-2 font-semibold ${
                              active
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : done
                                  ? "bg-emerald-500/15 text-emerald-700"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {done && <Check className="size-3" />}
                            <span>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Items List */}
                    <div className="rounded-xl border bg-background p-3 space-y-2">
                      <p className="text-xs font-bold text-muted-foreground">
                        الأصناف المطلوبة ({o.order_items.length}):
                      </p>
                      <div className="divide-y text-sm">
                        {o.order_items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1.5">
                            <span className="font-bold">
                              <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/15 text-xs font-black me-2">
                                {item.quantity}×
                              </span>
                              {item.name_ar}
                            </span>
                            {item.price != null && (
                              <span className="text-xs text-muted-foreground">
                                {(Number(item.price) * item.quantity).toFixed(2)} ر.س
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      {o.notes && (
                        <p className="rounded-lg bg-amber-500/10 p-2 text-xs font-medium text-amber-800">
                          ملاحظات العميل: {o.notes}
                        </p>
                      )}
                    </div>

                    {/* Customer Delivery Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <MapPin className="size-3.5 text-primary" />
                        وجهة التسليم: {o.address}
                      </span>
                      {o.phone && <span dir="ltr">هاتف العميل: {o.phone}</span>}
                    </div>

                    {/* Action Button to Mark Order Ready for Courier Pickup */}
                    {isPreparing && (
                      <Button
                        className="w-full gap-2"
                        disabled={busy}
                        onClick={() => void advance(o.id, "ready")}
                      >
                        <CheckCircle2 className="size-4" />
                        تجهيز الطلب — جاهز للاستلام من المندوب
                      </Button>
                    )}

                    {/* Live Courier & Order Map */}
                    <LiveOrderMap orderId={o.id} />
                  </article>
                );
              })
            )}
          </section>
        )}
      </main>

      {/* Upgraded Bottom Mobile Navigation Dock */}
      <nav
        aria-label="شريط التنقل السفلي للمتجر"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-card/95 backdrop-blur-md px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.06)] sm:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-6 gap-0.5">
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => setTab(item.key)}
                className="group relative flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1.5 transition-all"
              >
                {active && (
                  <span className="absolute top-0 h-1 w-6 rounded-full bg-primary" />
                )}
                <span
                  className={`relative flex h-8 w-10 items-center justify-center rounded-2xl transition-all duration-200 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-xs scale-105"
                      : "text-muted-foreground group-hover:bg-secondary group-hover:text-foreground"
                  }`}
                >
                  <item.icon className={`size-4.5 ${active ? "stroke-[2.4]" : "stroke-[1.9]"}`} />
                  {item.badge != null && item.badge > 0 && (
                    <span
                      className={`absolute -top-1 -start-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black ${
                        active
                          ? "bg-foreground text-background"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] leading-tight transition-colors ${
                    active ? "font-extrabold text-foreground" : "font-medium text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
