import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bike,
  Clock,
  Coffee,
  LogOut,
  MapPin,
  Navigation,
  RefreshCw,
  PackageCheck,
  BellRing,
  Volume2,
  VolumeX,
  User,
  Headphones,
  History,
  Map as MapIcon,
  Camera,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Store,
  Send,
  PhoneCall,
  Wallet,
  Search,
  FileText,
  Sparkles,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import {
  courierDeliverOrder,
  courierSetOnline,
  courierBreakAction,
  courierOrderAction,
  getCourierDashboardData,
  submitCourierLiveVerification,
} from "@/lib/courier-shifts.functions";
import {
  WORK_SECONDS,
  workedSeconds,
  canRejectOrder,
  courierAvailable,
  salaryDayEligible,
} from "@/lib/courier-shift-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneLogin } from "./phone-login";
import { StaffOnboarding } from "./staff-onboarding";
import { useRealtime } from "@/lib/realtime";
import { useCourierLocation } from "@/lib/live-location";
import { LiveOrderMap } from "./live-order-map";
import { orderMapPoints } from "@/lib/order-map-points";

const OrderMapCanvas = lazy(() =>
  import("./order-map-canvas").then((m) => ({ default: m.OrderMapCanvas })),
);

type RiderTab = "current" | "map" | "history" | "support" | "profile";

const duration = (seconds: number) =>
  `${Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0")}:${Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;

function playOrderAlertChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = [880, 1174.66, 880, 1318.51];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.16);
      gain.gain.setValueAtTime(0.28, ctx.currentTime + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.16 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.16);
      osc.stop(ctx.currentTime + i * 0.16 + 0.15);
    });
  } catch {
    /* ignore audio restriction */
  }
}

export function SimpleCourierApp() {
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
              <Bike className="size-7" />
            </div>
            <h1 className="text-xl font-bold">FoodHub Rider</h1>
            <p className="text-sm text-muted-foreground">تسجيل دخول المندوب</p>
          </div>
          <PhoneLogin />
        </div>
      </div>
    );
  if (role !== "courier") return <StaffOnboarding userId={user.id} type="courier" />;
  return <CourierWork userId={user.id} />;
}

function CourierWork({ userId }: { userId: string }) {
  useRealtime(["orders", "courier_shifts"], ["courier-dashboard"], "courier-work");
  const qc = useQueryClient();
  const [tab, setTab] = useState<RiderTab>("current");
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showLiveSelfieModal, setShowLiveSelfieModal] = useState(false);
  const [autoPromptedToday, setAutoPromptedToday] = useState(false);
  const [supportTopic, setSupportTopic] = useState("تأخر استلام الطلب من المطعم");
  const [supportMessage, setSupportMessage] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  const dashboardFn = useServerFn(getCourierDashboardData);
  const onlineFn = useServerFn(courierSetOnline);
  const breakFn = useServerFn(courierBreakAction);
  const orderActionFn = useServerFn(courierOrderAction);
  const deliverFn = useServerFn(courierDeliverOrder);
  const verifyFn = useServerFn(submitCourierLiveVerification);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        /* fallback */
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const dashboard = useQuery({
    queryKey: ["courier-dashboard", userId, coords?.latitude ?? null, coords?.longitude ?? null],
    queryFn: async () => {
      return await dashboardFn({
        data: {
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
        },
      });
    },
    refetchInterval: 10000,
  });

  const refresh = () =>
    void qc.invalidateQueries({
      predicate: (q) => String(q.queryKey[0]).startsWith("courier-dashboard"),
    });

  const profile = dashboard.data?.profile;
  const shift = dashboard.data?.activeShift ?? null;
  const isOnline = !!shift && shift.status === "active";
  const activeOrders = dashboard.data?.activeOrders ?? [];
  const pastOrders = dashboard.data?.pastOrders ?? [];
  const completedCount = dashboard.data?.completedCount ?? 0;
  const shiftHistory = dashboard.data?.shiftHistory ?? [];
  const totalDeliveryEarnings = pastOrders.reduce(
    (sum, o) => sum + Number(o.delivery_fee || 0),
    0,
  );
  const filteredPastOrders = pastOrders.filter((o) => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      o.id.toLowerCase().includes(q) ||
      o.restaurant_name.toLowerCase().includes(q) ||
      o.address.toLowerCase().includes(q)
    );
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const isVerifiedToday = profile?.identity_verified_date === todayStr;

  // Automatically trigger the daily live selfie check when the courier enters an active shift
  useEffect(() => {
    if (
      isOnline &&
      profile &&
      !profile.identity_violation_locked &&
      !profile.identity_violation_pending &&
      !isVerifiedToday &&
      !autoPromptedToday
    ) {
      setAutoPromptedToday(true);
      setShowLiveSelfieModal(true);
    }
  }, [isOnline, profile, isVerifiedToday, autoPromptedToday]);

  // Sound alert when an active order is present
  const myActiveOrder = activeOrders.find((o) => o.courier_id === userId) ?? activeOrders[0];
  useEffect(() => {
    if (!isOnline || !alertEnabled || !activeOrders.length) return;
    playOrderAlertChime();
  }, [isOnline, alertEnabled, activeOrders.length]);

  const work = shift?.started_at
    ? workedSeconds(
        Date.parse(shift.started_at),
        now,
        shift.break_started_at ? Date.parse(shift.break_started_at) : undefined,
        shift.break_ends_at ? Date.parse(shift.break_ends_at) : undefined,
      )
    : 0;
  const onBreak = !!shift?.break_ends_at && now < Date.parse(shift.break_ends_at);
  const available = !!shift && courierAvailable(shift.status, work, onBreak);
  const gpsError = useCourierLocation(myActiveOrder?.id, isOnline && !onBreak && !!myActiveOrder);

  const toggleOnline = async (online: boolean) => {
    if (!online && work < WORK_SECONDS) {
      const ok = window.confirm(
        "تنبيه هام: لم تكمل 10 ساعات عمل فعلية بعد! إغلاق الشيفت الآن لن يحتسب لك الأجر اليومي لهذا اليوم. هل تريد الإغلاق؟",
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      await onlineFn({ data: { online } });
      refresh();
      toast.success(
        online
          ? "تم بدء الشيفت التلقائي (10 ساعات عمل فعلية) وتفعيل رادار الأقرب للمطعم"
          : "تم إنهاء الشيفت وتحويل حالتك إلى أوفلاين",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تغيير الحالة");
    } finally {
      setBusy(false);
    }
  };

  const handleBreak = async (action: "start_break" | "end_break", minutes = 15) => {
    if (!shift) return;
    setBusy(true);
    try {
      await breakFn({ data: { shift_id: shift.id, action, minutes } });
      refresh();
      toast.success(
        action === "start_break"
          ? `بدأ البريك (${minutes} دقيقة) — تذكّر أنه يلزم إكمال 10 ساعات عمل صافية`
          : "انتهى البريك وعدت لاستقبال الطلبات",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تنفيذ البريك");
    } finally {
      setBusy(false);
    }
  };

  const handleOrderAction = async (action: "accept" | "pickup" | "reject", orderId: string) => {
    if (
      action === "reject" &&
      !window.confirm("لديك الحق في رفض طلب واحد فقط خلال الشيفت. هل تؤكد استخدام حق الرفض الوحيد؟")
    ) {
      return;
    }
    setBusy(true);
    try {
      await orderActionFn({
        data: {
          order_id: orderId,
          action,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
        },
      });
      refresh();
      if (action === "accept") playOrderAlertChime();
      toast.success(
        action === "accept"
          ? "تم قبول الطلب وتوجيهه للمطعم"
          : action === "pickup"
            ? "تم استلام الطلب من المطعم"
            : "تم رفض الطلب وتحويله للمندوب الأقرب التالي",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تحديث الطلب");
    } finally {
      setBusy(false);
    }
  };

  const handleDeliver = async (orderId: string) => {
    setBusy(true);
    try {
      const r = (await deliverFn({ data: { order_id: orderId, code } })) as {
        ok: boolean;
        remaining?: number;
        lockedAfterDelivery?: boolean;
      };
      if (r.ok) {
        setCode("");
        if (r.lockedAfterDelivery) {
          toast.error(
            "تم تسليم الطلب للعميل، وتم إغلاق حسابك نهائياً بسبب اختلاف الصورة الحية للمندوب لحين مراجعة الإدارة.",
          );
        } else {
          toast.success("تم تسليم الطلب بنجاح وإضافته لسجل الطلبات المنجزة");
        }
        refresh();
      } else {
        toast.error(`الكود غير صحيح — المتبقي ${r.remaining ?? 0} محاولات`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تسليم الطلب");
    } finally {
      setBusy(false);
    }
  };

  // PERMANENT ACCOUNT LOCK SCREEN WHEN IDENTITY PHOTO MISMATCH OCCURRED
  if (profile?.identity_violation_locked) {
    return (
      <div
        dir="rtl"
        className="foodhub-staff flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground"
      >
        <div className="w-full max-w-md rounded-2xl border-2 border-destructive bg-card p-6 text-center shadow-lg space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <ShieldAlert className="size-9" />
          </div>
          <h1 className="text-xl font-bold text-destructive">تم إغلاق الحساب بشكل نهائي</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            تم إيقاف وإغلاق حساب المندوب بسبب <strong>إخلال بالنظام (اختلاف الصورة الحية للمندوب أثناء الشيفت)</strong>.
          </p>
          <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive font-medium">
            لا يمكن تشغيل التطبيق أو استقبال أي طلبات إلا بعد مراجعة الإدارة وفتح الحساب من خلال تطبيق الأدمن (FoodHub Admin).
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={refresh}>
              <RefreshCw className="size-4" />
              تحديث الحالة
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => void supabase.auth.signOut()}
            >
              <LogOut className="size-4" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Build map points for the dedicated Map tab
  const mapPoints = orderMapPoints(
    myActiveOrder ?? null,
    coords ?? { latitude: 24.7136, longitude: 46.6753 },
  );

  return (
    <div dir="rtl" className="foodhub-staff min-h-screen bg-background pb-24 text-foreground">
      {/* Top Header with Courier Portrait Icon, Sound Alert Button, Refresh, Logout */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-card px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-xs">
        <div className="flex items-center gap-3">
          {/* Portrait Icon Button -> Opens Profile */}
          <button
            type="button"
            onClick={() => setTab("profile")}
            title="الملف الشخصي وصورة المندوب"
            className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-secondary text-foreground shadow-xs"
          >
            {profile?.portrait_url ? (
              <img
                src={profile.portrait_url}
                alt={profile.full_name}
                className="size-full object-cover"
              />
            ) : (
              <User className="size-5 text-primary" />
            )}
            <span
              className={`absolute bottom-0 start-0 size-3 rounded-full border-2 border-card ${
                isOnline ? "bg-emerald-500" : "bg-muted-foreground"
              }`}
            />
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold leading-tight">
                {profile?.full_name || "FoodHub Rider"}
              </h1>
              {isVerifiedToday && (
                <span
                  title="تم التحقق من الهوية اليوم"
                  className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"
                >
                  موثّق اليوم ✓
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              أنجزت <strong>{completedCount}</strong> طلب ·{" "}
              {isOnline ? "شيفت 10 ساعات نشط" : "أوفلاين"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Active Order Sound Alert Button */}
          <Button
            size="sm"
            variant={activeOrders.length > 0 ? "default" : "outline"}
            onClick={() => {
              playOrderAlertChime();
              setAlertEnabled((v) => !v);
              toast.info(
                !alertEnabled
                  ? "تم تفعيل جرس تنبيه الطلبات النشطة 🔊"
                  : "تم اختبار نغمة تنبيه الطلب النشط 🔔",
              );
            }}
            aria-label="جرس تنبيه الطلب النشط"
            className="gap-1 px-2.5 text-xs"
          >
            {alertEnabled ? <BellRing className="size-4" /> : <VolumeX className="size-4" />}
            <span className="hidden sm:inline">تنبيه الطلب</span>
          </Button>

          <Button
            size="icon"
            variant="ghost"
            aria-label="التحقق الحي من الهوية"
            title="إثبات الهوية بصورة حية"
            onClick={() => setShowLiveSelfieModal(true)}
          >
            <Camera className="size-4" />
          </Button>

          <Button size="icon" variant="ghost" aria-label="تحديث" onClick={refresh}>
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

      <main className="mx-auto max-w-lg space-y-4 p-4">
        {gpsError && (
          <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {gpsError}
          </p>
        )}

        {/* Pending Lock Warning Banner (if live photo mismatched while delivering an active order) */}
        {profile?.identity_violation_pending && (
          <div
            role="alert"
            className="rounded-2xl border-2 border-destructive bg-destructive/10 p-4 text-xs text-destructive space-y-1"
          >
            <p className="font-bold flex items-center gap-1.5 text-sm">
              <AlertTriangle className="size-4 shrink-0" />
              إشعار إخلال بالنظام — عدم تطابق الصورة الحية للمندوب
            </p>
            <p>
              تم رصد اختلاف في الصورة الحية للمندوب. ينتظر التطبيق إتمام توصيل الطلب الحالي للعميل، ثم سيتم إغلاق الحساب بشكل نهائي لحين مراجعة الإدارة.
            </p>
          </div>
        )}

        {/* TAB 1: CURRENT ORDER & AUTOMATIC 10-HOUR SHIFT */}
        {tab === "current" && (
          <>
            {/* Executive 4-Card Rider KPI Strip: Completed Orders, Delivery Earnings, Shift Hours, Rejection Right */}
            <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-2xl border bg-card p-3 shadow-xs">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>الطلبات المنجزة</span>
                  <PackageCheck className="size-3.5 text-primary" />
                </div>
                <p className="mt-1 text-xl font-black text-primary">{completedCount}</p>
                <p className="text-[10px] text-muted-foreground">طلب مكتمل بنجاح</p>
              </div>
              <div className="rounded-2xl border bg-card p-3 shadow-xs">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>أرباح التوصيل</span>
                  <Wallet className="size-3.5 text-emerald-600" />
                </div>
                <p className="mt-1 text-lg font-black text-emerald-700">
                  {totalDeliveryEarnings.toFixed(0)} <span className="text-xs font-bold">ر.س</span>
                </p>
                <p className="text-[10px] text-muted-foreground">إجمالي رسوم التوصيل</p>
              </div>
              <div className="rounded-2xl border bg-card p-3 shadow-xs">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>ساعات الشيفت</span>
                  <Clock className="size-3.5 text-primary" />
                </div>
                <p className="mt-1 text-base font-black tabular-nums" dir="ltr">
                  {(work / 3600).toFixed(1)} / 10h
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {salaryDayEligible(work) ? "الأجر اليومي مستحق ✓" : "يلزم إكمال 10 ساعات"}
                </p>
              </div>
              <div className="rounded-2xl border bg-card p-3 shadow-xs">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>حق رفض الطلب</span>
                  <Sparkles className="size-3.5 text-amber-600" />
                </div>
                <p className="mt-1 text-base font-black">
                  {shift?.rejected_order_id ? "0 / 1" : "1 / 1"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {shift?.rejected_order_id ? "تم استخدامه" : "متاح مرة بالشيفت"}
                </p>
              </div>
            </section>

            {/* Online Button -> Automatic 10-Hour Shift Entry & 3 Assigned Neighborhoods */}
            <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2.5 rounded-full ${
                        isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                      }`}
                    />
                    <p className="font-bold tracking-normal">
                      {isOnline
                        ? "أونلاين — شيفت 10 ساعات تلقائي نشط"
                        : "أوفلاين — اضغط أونلاين لبدء الشيفت تلقائياً"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isOnline
                      ? "تصلك الطلبات الموجودة في حيز 10 كيلومتر من المطعم أو العميل"
                      : "بمجرد الضغط على أونلاين يبدأ شيفت 10 ساعات عمل تلقائياً"}
                  </p>
                </div>
                <Button
                  size="lg"
                  variant={isOnline ? "outline" : "default"}
                  disabled={busy}
                  onClick={() => void toggleOnline(!isOnline)}
                >
                  <Bike className="size-4" />
                  {isOnline ? "إنهاء الشيفت" : "أونلاين"}
                </Button>
              </div>

              {/* 3 Assigned Neighborhoods Display */}
              <div className="flex flex-wrap items-center gap-1.5 border-t pt-2.5 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
                  <MapPin className="size-3.5 text-primary" />
                  أحياء التغطية الثلاثة (من الإدارة):
                </span>
                {profile?.neighborhoods && profile.neighborhoods.length === 3 ? (
                  profile.neighborhoods.map((area, i) => (
                    <span
                      key={area}
                      className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-semibold text-foreground"
                    >
                      <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      {area}
                    </span>
                  ))
                ) : (
                  <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-800">
                    لم تحدد الإدارة الأحياء الثلاثة لك بعد
                  </span>
                )}
              </div>
            </section>

            {!shift ? (
              <section className="rounded-2xl border bg-card py-12 text-center space-y-2 shadow-xs">
                <Clock className="mx-auto mb-2 size-10 text-muted-foreground" />
                <h2 className="font-bold tracking-normal">أنت حالياً أوفلاين</h2>
                <p className="text-sm text-muted-foreground px-4">
                  اضغط زر «أونلاين» بالأعلى للدخول الفوري في شيفت تلقائي لمدة 10 ساعات واستقبال الطلبات ضمن نطاق 10 كم من المطعم أو العميل.
                </p>
              </section>
            ) : (
              <>
                {/* 10-Hour Shift Timer, Visual Progress Bar & Break Card */}
                <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold tracking-normal">شيفت الـ 10 ساعات التلقائي</h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        available
                          ? "bg-emerald-500/15 text-emerald-700"
                          : onBreak
                            ? "bg-amber-500/15 text-amber-800"
                            : "bg-secondary text-foreground"
                      }`}
                    >
                      {available ? "متاح لاستقبال الطلبات" : onBreak ? "في البريك (متوقف مؤقتاً)" : "اكتمل الشيفت ✓"}
                    </span>
                  </div>

                  <div className="rounded-xl bg-secondary/50 p-3.5 text-center space-y-2">
                    <p className="text-xs text-muted-foreground">ساعات العمل الفعلية الصافية (بدون البريك)</p>
                    <p dir="ltr" className="text-3xl font-black tabular-nums tracking-wider">
                      {duration(work)}
                    </p>
                    {/* 10-Hour Visual Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-background border">
                        <div
                          className={`h-full transition-all duration-500 ${
                            salaryDayEligible(work) ? "bg-emerald-600" : "bg-primary"
                          }`}
                          style={{
                            width: `${Math.min(100, Math.round((work / WORK_SECONDS) * 100))}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-medium">
                        <span>
                          نسبة الإنجاز: <strong>{Math.min(100, Math.round((work / WORK_SECONDS) * 100))}%</strong>
                        </span>
                        <span>
                          المتبقي للأجر اليومي:{" "}
                          <strong dir="ltr">{duration(Math.max(0, WORK_SECONDS - work))}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    • يُشترط إكمال <strong>10 ساعات عمل فعلية كاملة</strong> لاحتساب الأجر اليومي.
                    <br />• حتى لو أخذت بريك (ربع ساعة أو أكثر)، لا يُحسب وقت البريك ضمن الـ 10 ساعات ويلزم إكمال الـ 10 ساعات عمل.
                  </p>

                  {onBreak ? (
                    <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-center">
                      <p className="text-xs font-bold">
                        أنت الآن في البريك — المتبقي{" "}
                        <span dir="ltr">
                          {duration(Math.max(0, (Date.parse(shift.break_ends_at ?? "") - now) / 1000))}
                        </span>
                      </p>
                      <Button
                        size="sm"
                        variant="default"
                        disabled={busy}
                        onClick={() => void handleBreak("end_break")}
                      >
                        إنهاء البريك والعودة لاستكمال الـ 10 ساعات
                      </Button>
                    </div>
                  ) : (
                    !shift.break_request_used &&
                    work < WORK_SECONDS &&
                    !activeOrders.some((o) => o.courier_id === userId) && (
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void handleBreak("start_break", 15)}
                        >
                          <Coffee className="size-3.5" />
                          بريك ربع ساعة
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void handleBreak("start_break", 30)}
                        >
                          <Coffee className="size-3.5" />
                          بريك نصف ساعة
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void handleBreak("start_break", 60)}
                        >
                          <Coffee className="size-3.5" />
                          بريك ساعة
                        </Button>
                      </div>
                    )
                  )}

                  {/* Daily Live Identity Verification Trigger Bar */}
                  <div className="flex items-center justify-between rounded-xl border bg-background p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Camera className="size-4 text-primary shrink-0" />
                      <span>
                        {isVerifiedToday
                          ? "تم إثبات الهوية بالصورة الحية لهذا اليوم بنجاح ✓"
                          : "مطلوب إثبات الهوية بصورة حية للمندوب خلال الشيفت"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={isVerifiedToday ? "outline" : "default"}
                      onClick={() => setShowLiveSelfieModal(true)}
                    >
                      {isVerifiedToday ? "إعادة الفحص" : "تصوير الآن"}
                    </Button>
                  </div>
                </section>

                {/* Current Active Order Section */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold tracking-normal">الطلب الحالي (نطاق 10 كم من المطعم أو العميل)</h2>
                    {activeOrders.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={playOrderAlertChime}
                        className="h-7 gap-1 text-xs"
                      >
                        <Volume2 className="size-3.5 text-primary" />
                        تشغيل صوت التنبيه
                      </Button>
                    )}
                  </div>

                  {!activeOrders.length ? (
                    <div className="rounded-2xl border bg-card py-10 text-center text-muted-foreground shadow-xs">
                      <PackageCheck className="mx-auto mb-3 size-10" />
                      <p className="font-medium">
                        {onBreak ? "أنت في البريك حالياً" : "لا يوجد طلب نشط في نطاق 10 كم حالياً"}
                      </p>
                      <p className="mt-1 text-xs">
                        سيصدر التطبيق تنبيهاً صوتياً فور وصول طلب من عميل أو مطعم ضمن حيز 10 كيلومتر من موقعك
                      </p>
                    </div>
                  ) : (
                    activeOrders.map((o, idx) => {
                      const isMine = o.courier_id === userId;
                      const canReject = canRejectOrder(shift.rejected_order_id, o.status, work);
                      const currentStep = !isMine || !o.courier_accepted_at
                        ? 1
                        : o.status === "on_the_way"
                          ? 4
                          : o.status === "ready"
                            ? 3
                            : 2;

                      return (
                        <article
                          key={o.id}
                          className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-base">طلب #{o.id.slice(0, 8)}</p>
                              {isMine ? (
                                <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold">
                                  طلبك الحالي
                                </span>
                              ) : idx === 0 ? (
                                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                                  ضمن نطاق 10 كم · الأقرب
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              {o.restaurant_distance_km != null && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 font-semibold">
                                  <Store className="size-3.5 text-primary" />
                                  {o.restaurant_distance_km} كم عن المطعم
                                </span>
                              )}
                              {o.customer_distance_km != null && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 font-semibold">
                                  <MapPin className="size-3.5 text-primary" />
                                  {o.customer_distance_km} كم عن العميل
                                </span>
                              )}
                              {Number(o.delivery_fee || 0) > 0 && (
                                <span className="rounded-md bg-emerald-500/15 px-2 py-1 font-bold text-emerald-700">
                                  توصيل: {Number(o.delivery_fee).toFixed(0)} ر.س
                                </span>
                              )}
                              <span className="rounded-md bg-secondary px-2 py-1 font-bold">
                                {Number(o.total).toFixed(2)} ر.س
                              </span>
                            </div>
                          </div>

                          {/* 4-Step Visual Order Progress Stepper */}
                          <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-secondary/40 p-2.5 text-center text-[10px]">
                            {[
                              { step: 1, label: "قبول الطلب" },
                              { step: 2, label: "تحضير المطعم" },
                              { step: 3, label: "استلام الطلب" },
                              { step: 4, label: "كود العميل" },
                            ].map((s) => {
                              const done = currentStep > s.step;
                              const active = currentStep === s.step;
                              return (
                                <div
                                  key={s.step}
                                  className={`flex flex-col items-center gap-1 rounded-lg p-1.5 font-semibold ${
                                    active
                                      ? "bg-primary text-primary-foreground shadow-xs"
                                      : done
                                        ? "bg-emerald-500/15 text-emerald-700"
                                        : "text-muted-foreground"
                                  }`}
                                >
                                  <span className="flex size-4 items-center justify-center rounded-full border border-current text-[9px] font-bold">
                                    {done ? <Check className="size-2.5" /> : s.step}
                                  </span>
                                  <span>{s.label}</span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <Location
                              title={`1. الاستلام · ${o.restaurant_name}`}
                              address={o.pickup_address ?? "موقع المطعم على الخريطة"}
                              latitude={o.pickup_latitude}
                              longitude={o.pickup_longitude}
                            />
                            <Location
                              title="2. التسليم للعميل"
                              address={o.address}
                              latitude={o.delivery_latitude}
                              longitude={o.delivery_longitude}
                            />
                          </div>
                          <LiveOrderMap orderId={o.id} />

                          <p className="text-sm font-medium text-muted-foreground">
                            {!isMine || !o.courier_accepted_at
                              ? "طلب جديد ضمن نطاق 10 كم — اقبله ليبدأ المطعم التحضير فوراً"
                              : o.status === "on_the_way"
                                ? "في الطريق للعميل — أدخل كود التسليم المكون من 4 أرقام عند الوصول"
                                : o.status === "ready"
                                  ? "الطلب جاهز الآن في المطعم للاستلام"
                                  : "المطعم يحضّر الطلب الآن — توجه لنقطة الاستلام"}
                          </p>

                          {!isMine || !o.courier_accepted_at ? (
                            <Button
                              className="w-full"
                              disabled={busy || onBreak}
                              onClick={() => void handleOrderAction("accept", o.id)}
                            >
                              قبول الطلب
                            </Button>
                          ) : o.status !== "on_the_way" ? (
                            <Button
                              className="w-full"
                              disabled={busy || onBreak}
                              onClick={() => void handleOrderAction("pickup", o.id)}
                            >
                              <Store className="size-4" />
                              تم استلام الطلب من المطعم
                            </Button>
                          ) : (
                            <div className="space-y-2">
                              <label className="block text-sm font-medium" htmlFor={`code-${o.id}`}>
                                كود العميل (4 أرقام)
                              </label>
                              <input
                                id={`code-${o.id}`}
                                inputMode="numeric"
                                maxLength={4}
                                dir="ltr"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                className="w-full rounded-md border bg-background p-3 text-center text-2xl tracking-[0.5em]"
                                placeholder="••••"
                              />
                              <Button
                                className="w-full"
                                disabled={busy || code.length !== 4}
                                onClick={() => void handleDeliver(o.id)}
                              >
                                تسليم الطلب
                              </Button>
                            </div>
                          )}

                          {o.status !== "on_the_way" && (
                            <Button
                              className="w-full"
                              variant="outline"
                              disabled={busy || onBreak || !canReject}
                              onClick={() => void handleOrderAction("reject", o.id)}
                            >
                              {shift.rejected_order_id
                                ? "تم استنفاد حق الرفض الوحيد في هذا الشيفت"
                                : "رفض الطلب (متاح مرة واحدة في الشيفت)"}
                            </Button>
                          )}
                        </article>
                      );
                    })
                  )}
                </section>
              </>
            )}
          </>
        )}

        {/* TAB 2: DEDICATED INTERACTIVE MAP */}
        {tab === "map" && (
          <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold">خريطة المندوب والمواقع الحية (نطاق 10 كم)</h2>
                <p className="text-xs text-muted-foreground">
                  تظهر موقعك الحالي، موقع المطعم للاستلام، وموقع العميل للتسليم
                </p>
              </div>
              {coords ? (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  GPS متصل ✓
                </span>
              ) : (
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  بانتظار GPS
                </span>
              )}
            </div>

            <Suspense
              fallback={
                <div className="flex h-80 items-center justify-center rounded-xl border bg-muted text-sm">
                  جارِ تحميل الخريطة…
                </div>
              }
            >
              <OrderMapCanvas points={mapPoints} />
            </Suspense>

            {myActiveOrder && (
              <div className="rounded-xl bg-secondary/50 p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold">الطلب النشط على الخريطة: #{myActiveOrder.id.slice(0, 8)}</p>
                  <span className="font-bold text-primary">{Number(myActiveOrder.total).toFixed(2)} ر.س</span>
                </div>
                <p>الاستلام: {myActiveOrder.restaurant_name} — {myActiveOrder.pickup_address ?? "المطعم"}</p>
                <p>التسليم: {myActiveOrder.address}</p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        myActiveOrder.pickup_latitude != null && myActiveOrder.pickup_longitude != null
                          ? `${myActiveOrder.pickup_latitude},${myActiveOrder.pickup_longitude}`
                          : (myActiveOrder.pickup_address ?? myActiveOrder.restaurant_name),
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Store className="size-3.5 text-primary" />
                      ملاحة للمطعم
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        myActiveOrder.delivery_latitude != null && myActiveOrder.delivery_longitude != null
                          ? `${myActiveOrder.delivery_latitude},${myActiveOrder.delivery_longitude}`
                          : myActiveOrder.address,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Navigation className="size-3.5 text-primary" />
                      ملاحة للعميل
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: COMPLETED ORDERS, DELIVERY EARNINGS & SHIFT WAGE HISTORY */}
        {tab === "history" && (
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-card p-4 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-sm">الطلبات المنجزة</h2>
                  <p className="text-[11px] text-muted-foreground">المسلمة للعملاء بنجاح</p>
                </div>
                <span className="rounded-2xl bg-primary px-3.5 py-2 text-lg font-black text-primary-foreground">
                  {completedCount}
                </span>
              </div>
              <div className="rounded-2xl border bg-card p-4 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-sm">أرباح التوصيل</h2>
                  <p className="text-[11px] text-muted-foreground">إجمالي رسوم التوصيل</p>
                </div>
                <span className="rounded-2xl bg-emerald-500/15 px-3 py-2 text-base font-black text-emerald-700">
                  {totalDeliveryEarnings.toFixed(0)} ر.س
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold">الطلبات السابقة ({filteredPastOrders.length})</h3>
                <div className="relative w-48">
                  <Search className="pointer-events-none absolute end-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="بحث برقم الطلب أو المطعم..."
                    className="h-8 pe-8 text-xs"
                  />
                </div>
              </div>
              {filteredPastOrders.length === 0 ? (
                <div className="rounded-2xl border bg-card py-10 text-center text-sm text-muted-foreground">
                  لا توجد طلبات مكتملة مطابقة في السجل
                </div>
              ) : (
                filteredPastOrders.map((o) => (
                  <article key={o.id} className="rounded-2xl border bg-card p-4 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">طلب #{o.id.slice(0, 8)}</span>
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        تم التسليم ✓
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground">{o.restaurant_name}</p>
                    <p className="text-xs text-muted-foreground">{o.address}</p>
                    <div className="flex items-center justify-between pt-1.5 text-xs text-muted-foreground border-t">
                      <span>{new Date(o.updated_at).toLocaleString("ar-SA")}</span>
                      <div className="flex items-center gap-2">
                        {Number(o.delivery_fee || 0) > 0 && (
                          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-700">
                            ربح التوصيل: {Number(o.delivery_fee).toFixed(0)} ر.س
                          </span>
                        )}
                        <strong className="text-foreground">{Number(o.total).toFixed(2)} ر.س</strong>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="space-y-2.5 pt-2 border-t">
              <h3 className="text-sm font-bold">سجل الشيفتات والأجر اليومي (شرط إكمال 10 ساعات)</h3>
              {shiftHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground">لا توجد شيفتات سابقة مسجلة</p>
              ) : (
                shiftHistory.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border bg-card p-3 text-xs"
                  >
                    <div>
                      <p className="font-bold">
                        {new Date(s.scheduled_start).toLocaleDateString("ar-SA")}
                      </p>
                      <p className="text-muted-foreground">
                        ساعات العمل الفعلية: {(Number(s.worked_seconds || 0) / 3600).toFixed(2)} / 10 ساعات
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 font-bold ${
                        s.salary_day_eligible
                          ? "bg-emerald-500/15 text-emerald-700"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {s.salary_day_eligible
                        ? "أجر يومي مستحق ✓"
                        : "غير مستحق — لم يكمل 10 ساعات"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* TAB 4: COURIER SUPPORT */}
        {tab === "support" && (
          <section className="space-y-4">
            <div className="rounded-2xl border bg-card p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Headphones className="size-6" />
                </div>
                <div>
                  <h2 className="font-bold text-base">دعم المناديب المباشر</h2>
                  <p className="text-xs text-muted-foreground">
                    فريق العمليات متاح على مدار الساعة لمساعدة الكباتن
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button asChild variant="outline" className="gap-1.5">
                  <a href="tel:920000000">
                    <PhoneCall className="size-4 text-primary" />
                    اتصال طوارئ العمليات
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowLiveSelfieModal(true)}
                  className="gap-1.5"
                >
                  <Camera className="size-4 text-primary" />
                  تحديث الصورة الحية
                </Button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!supportMessage.trim()) return;
                toast.success("تم إرسال بلاغك إلى إدارة العمليات وسيتم الرد عليك فوراً");
                setSupportMessage("");
              }}
              className="rounded-2xl border bg-card p-5 space-y-3 shadow-xs"
            >
              <h3 className="font-bold text-sm">إرسال تذكرة دعم أو بلاغ للإدارة</h3>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "المطعم متأخر في تسليم الطلب",
                  "العميل لا يرد على الاتصال",
                  "تعديل أحياء التغطية الثلاثة",
                  "مراجعة الصورة الحية للشيفت",
                ].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setSupportMessage(quick)}
                    className="rounded-full border bg-secondary/60 px-2.5 py-1 text-[11px] font-medium hover:bg-secondary"
                  >
                    + {quick}
                  </button>
                ))}
              </div>
              <label className="block space-y-1 text-xs">
                <span>نوع المشكلة</span>
                <select
                  value={supportTopic}
                  onChange={(e) => setSupportTopic(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="تأخر استلام الطلب من المطعم">تأخر استلام الطلب من المطعم</option>
                  <option value="تعذر الوصول لموقع العميل">تعذر الوصول لموقع العميل</option>
                  <option value="مشكلة في احتساب ساعات الشيفت (10 ساعات)">
                    مشكلة في احتساب ساعات الشيفت (10 ساعات)
                  </option>
                  <option value="مراجعة التحقق الحي من الصورة الشخصية">
                    مراجعة التحقق الحي من الصورة الشخصية
                  </option>
                  <option value="أخرى">أخرى</option>
                </select>
              </label>
              <label className="block space-y-1 text-xs">
                <span>تفاصيل البلاغ</span>
                <Input
                  required
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="اكتب تفاصيل المشكلة أو رقم الطلب هنا..."
                />
              </label>
              <Button type="submit" className="w-full gap-1.5">
                <Send className="size-4" />
                إرسال البلاغ للإدارة
              </Button>
            </form>
          </section>
        )}

        {/* TAB 5: COURIER PROFILE & PORTRAIT */}
        {tab === "profile" && (
          <section className="space-y-4">
            <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-primary bg-secondary">
                  {profile?.portrait_url ? (
                    <img
                      src={profile.portrait_url}
                      alt={profile.full_name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <User className="size-9 text-primary" />
                  )}
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold">{profile?.full_name}</h2>
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {profile?.email}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="size-3.5" />
                    مندوب معتمد في FoodHub
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t pt-4 text-xs">
                <div className="rounded-xl bg-secondary/50 p-3">
                  <span className="text-muted-foreground block">رقم الجوال</span>
                  <strong className="mt-1 block text-sm" dir="ltr">
                    {profile?.phone || "غير مسجل"}
                  </strong>
                </div>
                <div className="rounded-xl bg-secondary/50 p-3">
                  <span className="text-muted-foreground block">وسيلة التوصيل</span>
                  <strong className="mt-1 block text-sm">
                    {profile?.vehicle === "motorcycle" ? "دباب (دراجة نارية)" : "سيارة"}
                  </strong>
                </div>
                <div className="rounded-xl bg-secondary/50 p-3">
                  <span className="text-muted-foreground block">الطلبات المنجزة</span>
                  <strong className="mt-1 block text-sm">{completedCount} طلب مكتمل</strong>
                </div>
                <div className="rounded-xl bg-secondary/50 p-3">
                  <span className="text-muted-foreground block">التحقق اليومي (صورة حية)</span>
                  <strong className="mt-1 block text-sm">
                    {isVerifiedToday ? "مكتمل اليوم ✓" : "مطلوب التحقق"}
                  </strong>
                </div>
              </div>

              {/* 3 Assigned Neighborhoods in Profile */}
              <div className="rounded-xl border bg-secondary/30 p-3 text-xs space-y-2">
                <span className="font-bold flex items-center gap-1.5">
                  <MapPin className="size-4 text-primary" />
                  الأحياء الثلاثة المحددة لعملك من الإدارة:
                </span>
                {profile?.neighborhoods && profile.neighborhoods.length === 3 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.neighborhoods.map((area, idx) => (
                      <span
                        key={area}
                        className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-card px-2.5 py-1 font-semibold"
                      >
                        <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {idx + 1}
                        </span>
                        {area}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-amber-700 font-medium">
                    لم تحدد الإدارة الأحياء الثلاثة لحسابك بعد
                  </p>
                )}
              </div>

              {/* Uploaded Official Documents */}
              {profile?.documents && Object.keys(profile.documents).length > 0 && (
                <div className="rounded-xl border bg-secondary/30 p-3 text-xs space-y-2">
                  <span className="font-bold flex items-center gap-1.5">
                    <FileText className="size-4 text-primary" />
                    المستندات الرسمية المرفقة ({Object.keys(profile.documents).length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(profile.documents).map(([docKey, docUrl]) => {
                      const docLabels: Record<string, string> = {
                        id_card: "الهوية الوطنية / الإقامة",
                        driving_license: "رخصة القيادة",
                        portrait: "الصورة الشخصية",
                      };
                      return (
                        <a
                          key={docKey}
                          href={docUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border bg-card px-2.5 py-1 font-medium hover:bg-secondary"
                        >
                          {docLabels[docKey] ?? docKey} ↗
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowLiveSelfieModal(true)}
              >
                <Camera className="size-4 text-primary" />
                إثبات الهوية بصورة حية الآن
              </Button>
            </div>
          </section>
        )}
      </main>

      {/* Bottom Navigation Bar for FoodHub Rider */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-card pb-[env(safe-area-inset-bottom)] shadow-sm">
        {[
          { id: "current" as RiderTab, label: "الطلب والشيفت", icon: Bike },
          { id: "map" as RiderTab, label: "الخريطة", icon: MapIcon },
          { id: "history" as RiderTab, label: `السابقة (${completedCount})`, icon: History },
          { id: "support" as RiderTab, label: "دعم المناديب", icon: Headphones },
          { id: "profile" as RiderTab, label: "الملف الشخصي", icon: User },
        ].map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            onClick={() => setTab(item.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              tab === item.id ? "font-bold text-primary" : "text-muted-foreground"
            }`}
          >
            <item.icon className="size-5" />
            <span>{item.label}</span>
          </Button>
        ))}
      </nav>

      {/* Daily Live Selfie Identity Verification Modal */}
      {showLiveSelfieModal && (
        <LiveSelfieVerificationModal
          registeredPortraitUrl={profile?.portrait_url ?? null}
          hasActiveOrder={activeOrders.some((o) => o.courier_id === userId)}
          onClose={() => setShowLiveSelfieModal(false)}
          onSubmit={async (dataUrl, matched) => {
            setBusy(true);
            try {
              const res = await verifyFn({
                data: { live_photo_data_url: dataUrl, matched },
              });
              setShowLiveSelfieModal(false);
              refresh();
              if (res.status === "verified") {
                toast.success("تم التحقق من مطابقة صورتك الحية بنجاح ✓");
              } else if (res.status === "pending_lock_after_delivery") {
                toast.error(
                  "تم رصد اختلاف في الصورة الحية للمندوب! سينتظر التطبيق توصيل الطلب الحالي ثم يغلق الحساب نهائياً لحين مراجعة الإدارة.",
                );
              } else {
                toast.error(
                  "تم إغلاق الحساب نهائياً بسبب اختلاف الصورة الحية للمندوب — راجع الإدارة لفتح الحساب.",
                );
              }
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "تعذر التحقق من الصورة");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}

function LiveSelfieVerificationModal({
  registeredPortraitUrl,
  hasActiveOrder,
  onClose,
  onSubmit,
}: {
  registeredPortraitUrl: string | null;
  hasActiveOrder: boolean;
  onClose: () => void;
  onSubmit: (dataUrl: string, matched: boolean) => Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "user", width: 480, height: 480 } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(() => setCameraError(true));
    } else {
      setCameraError(true);
    }
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const captureFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setCaptured(canvas.toDataURL("image/jpeg", 0.8));
  };

  const handleFileFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setCaptured(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 text-foreground shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Camera className="size-5 text-primary" />
            <h2 className="font-bold text-base">التحقق اليومي الحي من هوية المندوب</h2>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            إغلاق
          </Button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          يطلب التطبيق يومياً وبشكل تلقائي خلال الشيفت صورة سيلفي حية للتأكد من أنك نفس المندوب المسجل.
          <strong className="text-destructive block mt-1">
            تنبيه: في حال اختلاف الصورة عن المندوب المسجل، ينتظر التطبيق توصيل الطلب الحالي ثم يغلق الحساب نهائياً ولا يفتح إلا بمراجعة الأدمن.
          </strong>
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 text-center">
            <span className="text-[11px] font-semibold text-muted-foreground">الصورة المسجلة</span>
            <div className="aspect-square w-full overflow-hidden rounded-xl border bg-secondary flex items-center justify-center">
              {registeredPortraitUrl ? (
                <img src={registeredPortraitUrl} alt="الصورة المسجلة" className="size-full object-cover" />
              ) : (
                <User className="size-10 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="space-y-1 text-center">
            <span className="text-[11px] font-semibold text-muted-foreground">الصورة الحية الآن</span>
            <div className="aspect-square w-full overflow-hidden rounded-xl border bg-slate-950 flex items-center justify-center">
              {captured ? (
                <img src={captured} alt="الصورة الملتقطة" className="size-full object-cover" />
              ) : !cameraError ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="size-full object-cover"
                />
              ) : (
                <label className="flex flex-col items-center justify-center gap-1 p-3 text-xs text-white cursor-pointer">
                  <Camera className="size-8 text-primary" />
                  <span>فتح الكاميرا الأمامية</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={handleFileFallback}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {!captured ? (
          <div className="flex gap-2">
            {!cameraError && (
              <Button type="button" className="flex-1" onClick={captureFrame}>
                <Camera className="size-4" />
                التقاط صورة حية الآن
              </Button>
            )}
            <label className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-secondary">
              <Camera className="size-4" />
              التقاط من كاميرا الجهاز
              <input
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handleFileFallback}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  await onSubmit(captured, true);
                  setSubmitting(false);
                }}
                className="gap-1.5"
              >
                <CheckCircle2 className="size-4" />
                تأكيد مطابقة الهوية
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  await onSubmit(captured, false);
                  setSubmitting(false);
                }}
                className="gap-1.5"
              >
                <ShieldAlert className="size-4" />
                صورة مختلفة (إخلال)
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setCaptured(null)}
            >
              إعادة التقاط الصورة
            </Button>
            {hasActiveOrder && (
              <p className="text-[11px] text-center text-muted-foreground">
                لديك طلب نشط حالياً: عند عدم التطابق سينتظر التطبيق تسليم الطلب ثم يغلق الحساب.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Location({
  title,
  address,
  latitude,
  longitude,
}: {
  title: string;
  address: string;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
}) {
  const query =
    latitude != null && longitude != null ? `${latitude},${longitude}` : address;
  return (
    <div className="rounded-xl border bg-secondary/30 p-3 space-y-1.5">
      <p className="text-[11px] font-bold text-muted-foreground">{title}</p>
      <p className="text-xs font-medium leading-relaxed">{address}</p>
      <Button asChild variant="outline" size="sm" className="h-7 w-full gap-1.5 text-xs">
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
          target="_blank"
          rel="noreferrer"
        >
          <Navigation className="size-3.5 text-primary" />
          فتح الملاحة على الخريطة
        </a>
      </Button>
    </div>
  );
}
