import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { sounds } from "@/lib/sound-effects";
import { AppHeader, AppFooter } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { FoodHubLogo } from "@/components/food-hub-logo";
import {
  Smartphone,
  Download,
  Star,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Bell,
  Heart,
  Store,
  Bike,
  Utensils,
  Radio,
  Layers,
  Award,
  ChevronDown,
  ChevronUp,
  MapPin,
  ShoppingBag,
  ExternalLink,
  Flame,
  Check,
  Eye,
  CreditCard,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "تحميل تطبيق FOODHUB | متوفر الآن على iOS و Android" },
      {
        name: "description",
        content:
          "حمّل تطبيق FoodHub للجوال واستمتع بتجربة طلب وجبات متكاملة، تصفح قوائم أكثر من 120 مطعماً ومطبخاً سحابياً، رادار تتبع الطلب المباشر، والدفع الفوري الآمن.",
      },
    ],
  }),
  component: DownloadPage,
});

export function DownloadPage() {
  const { lang, t } = useI18n();
  const navigate = useNavigate();

  const [activeScreenTab, setActiveScreenTab] = useState<"menu" | "radar" | "checkout">("radar");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleStoreClick = (storeName: "appstore" | "playstore" | "apk") => {
    sounds.playSuccess();
    if (storeName === "appstore") {
      toast.success(
        lang === "ar"
          ? "🍎 جارٍ فتح متجر Apple App Store لتحميل FoodHub..."
          : "🍎 Opening Apple App Store for FoodHub..."
      );
    } else if (storeName === "playstore") {
      toast.success(
        lang === "ar"
          ? "🤖 جارٍ فتح متجر Google Play Store لتحميل FoodHub..."
          : "🤖 Opening Google Play Store for FoodHub..."
      );
    } else {
      toast.success(
        lang === "ar"
          ? "📦 جارٍ تحميل ملف التثبيت المباشر APK v2.5.0..."
          : "📦 Downloading direct APK v2.5.0..."
      );
      if (typeof window !== "undefined") {
        const link = document.createElement("a");
        link.href = "/downloads/foodhub-debug.apk";
        link.download = "foodhub-debug.apk";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const SCREEN_SHOWCASES = {
    menu: {
      titleAr: "🍽️ تصفح كافة المطاعم والمطابخ وسلة موحدة",
      titleEn: "🍽️ Browse All Menus & Unified Multi-Brand Cart",
      descAr: "تصفح أكثر من 120 مطعماً ومطبخاً سحابياً في الرياض والمملكة، مع إمكانية دمج طلبات مطعمين مختلفين في سلة واحدة وبكيس حراري موحد.",
      descEn: "Explore 120+ top restaurants and cloud kitchens in Riyadh. Combine dishes from 2 brands in a single cart with unified delivery.",
      highlight: "🍔 كنتاكي • البيك • شاورمر • هارديز • الرومانسية • صب واي",
      badge: "وفر 50% بالرسوم",
      color: "from-amber-500/20 to-orange-500/20 border-amber-500/40",
      accent: "text-amber-400",
    },
    radar: {
      titleAr: "🛰️ رادار تتبع الطلبات المباشر لحظة بلحظة",
      titleEn: "🛰️ Live GPS Order Tracking Radar",
      descAr: "تابع مسار كابتن التوصيل على الخريطة الحية دقيقة بدقيقة مع مؤشر حرارة الشنطة 65°C وميعاد الوصول الدقيق (ETA 15-20 دقيقة).",
      descEn: "Watch your courier's live location on the radar map in real time with 65°C insulated bag telemetry and pinpoint 15-20m ETA.",
      highlight: "🛵 رادار حي • حرارة الوجبة 65°C • اتصال مباشر بالكابتن",
      badge: "دقة 100% رادارية",
      color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/40",
      accent: "text-cyan-400",
    },
    checkout: {
      titleAr: "🛒 السلة وإتمام الطلب الفوري وبوابات الدفع",
      titleEn: "🛒 Instant 1-Click Checkout & Safe Payments",
      descAr: "إتمام الطلب بضغطة زر واحدة مع خيارات دفع متعددة وفورية: Apple Pay، مدى Mada، فيزا، تمارا، تابي، أو الدفع عند الاستلام.",
      descEn: "Complete orders with 1-click speed using Apple Pay, Mada, Visa, Tamara, Tabby interest-free installments or Cash on Delivery.",
      highlight: "💳 Apple Pay • مدى • تمارا • تابي • تشفير أمان بنكي",
      badge: "دفع بلمسة واحدة",
      color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40",
      accent: "text-emerald-400",
    },
  };

  const FAQS = [
    {
      qAr: "هل تطبيق FoodHub مجاني للتحميل؟",
      qEn: "Is FoodHub App free to download?",
      aAr: "نعم، تطبيق FoodHub مجاني 100% لكافة المستخدمين على متجري Apple App Store و Google Play Store بدون أي رسوم اشتراك شهرية.",
      aEn: "Yes, FoodHub App is 100% free to download on both Apple App Store and Google Play Store without any subscription fees.",
    },
    {
      qAr: "ما هي الأجهزة وأنظمة التشغيل المتوافقة مع التطبيق؟",
      qEn: "Which devices and OS versions are supported?",
      aAr: "يدعم التطبيق هواتف آيفون (iOS 14.0 أو أحدث) وهواتف أندرويد (Android 8.0 أو أحدث)، بالإضافة لأجهزة آيباد والأجهزة اللوحية.",
      aEn: "The app supports iPhones (iOS 14.0+) and Android smartphones (Android 8.0+), as well as iPads and Android tablets.",
    },
    {
      qAr: "كيف تفيدني السلة الموحدة داخل تطبيق FoodHub؟",
      qEn: "How does the Unified Multi-Brand Cart benefit me?",
      aAr: "تتيح لك السلة الموحدة اختيار وجبات من مطعمين أو مطبخين مختلفين (مثلاً: برجر من مطعم وسلطة صحية من مطعم آخر) في فاتورة واحدة ومندوب واحد، مما يوفر 50% من تكلفة التوصيل.",
      aEn: "Unified Cart lets you order from 2 different restaurants in a single checkout, delivered by 1 courier in an insulated bag, saving 50% on fees.",
    },
    {
      qAr: "كيف يعمل رادار تتبع الطلبات المباشر؟",
      qEn: "How does the Live Order Tracking Radar work?",
      aAr: "بمجرد قبول وتجهيز الوجبة، يعرض لك التطبيق خريطة GPS حية متصلة برادار الكابتن، يوضح سرعة التحرك، المسار المتوقع، والوقت المتبقي حتى وصوله عند باب منزلك.",
      aEn: "Once your food is prepared, the app displays live GPS radar telemetry of your courier, showing speed, route, and exact remaining arrival time.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Global App Header */}
      <AppHeader />

      <main className="flex-1 w-full pb-20">
        {/* ============================================================ */}
        {/* 1. HERO DOWNLOAD SECTION */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 py-12 sm:py-20">
          {/* Ambient Glows */}
          <div className="absolute -top-32 start-1/2 -translate-x-1/2 size-96 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 end-10 size-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 mx-auto max-w-6xl px-4">
            {/* Breadcrumb / Back Link */}
            <div className="mb-6 flex items-center gap-2 text-xs text-slate-400">
              <Link
                to="/"
                onClick={() => sounds.playClick()}
                className="hover:text-amber-400 transition-colors flex items-center gap-1"
              >
                <span>{lang === "ar" ? "الرئيسية" : "Home"}</span>
              </Link>
              <span>/</span>
              <span className="text-amber-400 font-bold">
                {lang === "ar" ? "تحميل تطبيق الجوال" : "Download Mobile App"}
              </span>
            </div>

            <div className="grid lg:grid-cols-12 gap-10 items-center">
              {/* Left Column: Headline & Action Buttons (7 cols) */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-start">
                {/* Official Release Badge */}
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/35 px-4 py-1.5 text-xs font-black text-amber-300 shadow-md backdrop-blur-md">
                  <span className="flex size-2 rounded-full bg-amber-400 animate-pulse" />
                  <Smartphone className="size-3.5" />
                  <span>
                    {lang === "ar"
                      ? "تطبيق FOODHUB للجوال • متوفر الآن على iOS و Android"
                      : "FOODHUB Mobile App • Available on iOS & Android"}
                  </span>
                </div>

                {/* Main Headline */}
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                  {lang === "ar" ? (
                    <>
                      حمّل تطبيق <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">FOODHUB</span> واستمتع بتجربة طلب وتتبع استثنائية
                    </>
                  ) : (
                    <>
                      Download <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">FOODHUB</span> for seamless ordering & live tracking
                    </>
                  )}
                </h1>

                {/* Description */}
                <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  {lang === "ar"
                    ? "تطبيقك الشامل لتصفح أشهر المطاعم والمطابخ السحابية، الطلب من مطعمين في سلة واحدة، تتبع الكابتن بالرادار المباشر دقيقة بدقيقة، والدفع الفوري بأمان."
                    : "Your all-in-one mobile app to explore premier restaurants & cloud kitchens, order from multiple brands in 1 cart, track couriers on live radar, and checkout securely."}
                </p>

                {/* Quick Trust Highlights */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-bold text-slate-300 pt-2">
                  <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-full px-3 py-1">
                    <Star className="size-3.5 text-amber-400 fill-amber-400" />
                    <span>4.9 ★ (+500k تقييم)</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-full px-3 py-1">
                    <Zap className="size-3.5 text-amber-400" />
                    <span>{lang === "ar" ? "توصيل في 15 دقيقة" : "15-min delivery"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-full px-3 py-1">
                    <ShieldCheck className="size-3.5 text-emerald-400" />
                    <span>{lang === "ar" ? "دفع مشفر 100%" : "100% Secure"}</span>
                  </div>
                </div>

                {/* Official Store Buttons */}
                <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-3.5">
                  {/* Apple App Store */}
                  <button
                    type="button"
                    onClick={() => handleStoreClick("appstore")}
                    className="group relative flex items-center gap-3.5 rounded-2xl bg-black border-2 border-slate-700/80 px-5 py-3 text-start text-white shadow-xl shadow-slate-950/60 transition-all hover:border-amber-400 hover:scale-[1.02] active:scale-95"
                  >
                    <svg className="size-8 fill-current text-white group-hover:text-amber-400 transition-colors" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.06 1.71-.93 2.73 1 .08 2.02-.48 2.64-1.23z" />
                    </svg>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {lang === "ar" ? "حَمّله من" : "Download on the"}
                      </span>
                      <span className="block text-base font-black tracking-tight group-hover:text-amber-300 transition-colors">
                        App Store
                      </span>
                    </div>
                  </button>

                  {/* Google Play Store */}
                  <button
                    type="button"
                    onClick={() => handleStoreClick("playstore")}
                    className="group relative flex items-center gap-3.5 rounded-2xl bg-black border-2 border-slate-700/80 px-5 py-3 text-start text-white shadow-xl shadow-slate-950/60 transition-all hover:border-amber-400 hover:scale-[1.02] active:scale-95"
                  >
                    <svg className="size-8" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.018 13.298l-3.93-2.27-3.04 3.04 3.04 3.04 3.93-2.27c.72-.417.72-1.123 0-1.54z" />
                      <path fill="#EA4335" d="M15.048 14.068l-3.32-3.32-9.69-9.69c.29-.07.63.02.94.2l12.07 6.98 3.04 3.04-3.04 2.79z" />
                      <path fill="#FBBC04" d="M2.038 1.058c-.35.34-.54.88-.54 1.58v18.72c0 .7.19 1.24.54 1.58l10.02-10.02-10.02-10.3z" />
                      <path fill="#34A853" d="M15.048 14.068l-12.07 6.98c-.31.18-.65.27-.94.2l9.69-9.69 3.32 2.51z" />
                    </svg>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {lang === "ar" ? "احصل عليه من" : "GET IT ON"}
                      </span>
                      <span className="block text-base font-black tracking-tight group-hover:text-amber-300 transition-colors">
                        Google Play
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Right Column: Interactive Smartphone Mockup (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center gap-6">
                {/* Smartphone Mockup */}
                <div className="relative w-full max-w-xs rounded-[40px] border-4 border-slate-700 bg-slate-900 p-3.5 shadow-2xl shadow-amber-500/10 ring-1 ring-slate-800">
                  {/* Dynamic Island / Notch */}
                  <div className="mx-auto mb-3 h-5 w-28 rounded-full bg-slate-950 flex items-center justify-between px-3">
                    <span className="size-2 rounded-full bg-slate-800" />
                    <span className="size-2.5 rounded-full bg-slate-800 border border-slate-700" />
                  </div>

                  {/* Screen Content Container */}
                  <div className="rounded-[28px] overflow-hidden bg-slate-950 border border-slate-800 p-4 space-y-4">
                    {/* App Screen Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FoodHubLogo size={28} showText />
                      </div>
                      <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black">
                        🟢 متصل بالرادار
                      </span>
                    </div>

                    {/* Interactive Tab Switcher in Mockup */}
                    <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[10px] font-bold text-center">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setActiveScreenTab("radar");
                        }}
                        className={`py-1.5 rounded-lg transition-colors ${
                          activeScreenTab === "radar"
                            ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        🛰️ {lang === "ar" ? "الرادار" : "Radar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setActiveScreenTab("menu");
                        }}
                        className={`py-1.5 rounded-lg transition-colors ${
                          activeScreenTab === "menu"
                            ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        🍽️ {lang === "ar" ? "المطاعم" : "Menu"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setActiveScreenTab("checkout");
                        }}
                        className={`py-1.5 rounded-lg transition-colors ${
                          activeScreenTab === "checkout"
                            ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        🛒 {lang === "ar" ? "السلة" : "Cart"}
                      </button>
                    </div>

                    {/* Active Mockup Screen Card */}
                    <div className={`rounded-2xl border p-3.5 space-y-3 bg-gradient-to-b ${SCREEN_SHOWCASES[activeScreenTab].color}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">
                          {lang === "ar"
                            ? SCREEN_SHOWCASES[activeScreenTab].titleAr
                            : SCREEN_SHOWCASES[activeScreenTab].titleEn}
                        </span>
                        <span className="rounded-full bg-slate-950/80 px-2 py-0.5 text-[9px] font-black text-amber-300">
                          {SCREEN_SHOWCASES[activeScreenTab].badge}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                        {lang === "ar"
                          ? SCREEN_SHOWCASES[activeScreenTab].descAr
                          : SCREEN_SHOWCASES[activeScreenTab].descEn}
                      </p>

                      <div className="rounded-xl bg-slate-950/90 p-2.5 text-[10px] font-bold text-slate-200 border border-slate-800">
                        {SCREEN_SHOWCASES[activeScreenTab].highlight}
                      </div>
                    </div>

                    {/* Mockup Bottom Action */}
                    <Button
                      type="button"
                      onClick={() => handleStoreClick("appstore")}
                      className="w-full h-10 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs hover:from-amber-400 hover:to-yellow-300"
                    >
                      <span>⚡ {lang === "ar" ? "ابدأ الطلب من التطبيق الآن" : "Start in Mobile App"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 2. THE 3 CORE PILLARS SHOWCASE (مطابقة للخدمات الثلاث) */}
        {/* ============================================================ */}
        <section className="mx-auto max-w-6xl px-4 py-16 space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-400">
              <Sparkles className="size-3.5" />
              <span>{lang === "ar" ? "خدمات العملاء الحصرية بالتطبيق" : "Exclusive In-App Customer Services"}</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-white">
              {lang === "ar"
                ? "3 خدمات رئيسية صُممت لتمنحك تجربة طعام استثنائية"
                : "3 Core Services Designed for the Ultimate Food Experience"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {lang === "ar"
                ? "كافة خدمات الطلب والتتبع وإتمام الفاتورة تتم حصرياً وبشكل سلس عبر تطبيق FoodHub للجوال."
                : "All ordering, tracking, and checkout services are handled seamlessly in the FoodHub mobile app."}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1: 🍽️ تصفح قائمة الأطباق الصحية وكافة المطاعم */}
            <div className="group rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-5 transition-all duration-300 hover:border-amber-500/50 hover:bg-slate-900 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-2xl text-amber-400">
                    🍽️
                  </div>
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-[10px] font-black text-amber-300">
                    {lang === "ar" ? "تصفح وسلة موحدة" : "Unified Cart"}
                  </span>
                </div>

                <h3 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors">
                  {lang === "ar" ? "1. تصفح قائمة الأطباق الصحية والمطاعم" : "1. Browse Healthy Menu & Restaurants"}
                </h3>

                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  {lang === "ar"
                    ? "استكشف أكثر من 120 مطعماً ومطبخاً معتمداً في المملكة (كنتاكي، البيك، شاورمر، صب واي...). اطلب أصنافاً من مطعمين في سلة واحدة وبكيس حراري موحد ورسوم مخفضة."
                    : "Discover 120+ top restaurants in KSA. Order dishes from 2 different restaurants in 1 cart with single courier delivery."}
                </p>

                <ul className="space-y-2 text-xs font-semibold text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>{lang === "ar" ? "سلة واحدة موحدة لعدة علامات" : "1 unified cart for multiple brands"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>{lang === "ar" ? "حساب دقيق للسعرات والماكروز" : "Accurate macro & calorie tracker"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>{lang === "ar" ? "وجبات كيتو ودايت وبروتين صافي" : "Keto, diet & high protein meals"}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 2: 🛰️ رادار تتبع الطلبات المباشر */}
            <div className="group rounded-3xl border-2 border-cyan-500/40 bg-slate-900/90 p-6 space-y-5 transition-all duration-300 hover:border-cyan-400 hover:shadow-2xl hover:shadow-cyan-500/10 shadow-xl flex flex-col justify-between relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-2xl text-cyan-400">
                    🛰️
                  </div>
                  <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-3 py-1 text-[10px] font-black text-cyan-300 animate-pulse">
                    {lang === "ar" ? "GPS راداري حي" : "Live GPS Radar"}
                  </span>
                </div>

                <h3 className="text-lg font-black text-white group-hover:text-cyan-400 transition-colors">
                  {lang === "ar" ? "2. رادار تتبع الطلبات المباشر" : "2. Live Order Tracking Radar"}
                </h3>

                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  {lang === "ar"
                    ? "تابع مسار كابتن التوصيل على الخريطة دقيقة بدقيقة منذ انطلاقه من المطبخ حتى وصوله لباب منزلك، مع قياس لحظي لحرارة الشنطة 65°C وزمن الوصول الدقيق."
                    : "Track your courier on the live map in real-time from kitchen dispatch to your doorstep, with 65°C thermal monitoring and exact ETA."}
                </p>

                <ul className="space-y-2 text-xs font-semibold text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>{lang === "ar" ? "توصيل فائق السرعة يبدأ من 15 دقيقة" : "Ultra-fast delivery starting at 15m"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>{lang === "ar" ? "شنطة FoodHub الذكية المعزولة 65°C" : "Smart 65°C FoodHub thermal bag"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>{lang === "ar" ? "اتصال ومحادثة مباشرة مع المندوب" : "Direct chat & call with courier"}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 3: 🛒 السلة وإتمام الطلب الفوري */}
            <div className="group rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-5 transition-all duration-300 hover:border-emerald-500/50 hover:bg-slate-900 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-2xl text-emerald-400">
                    🛒
                  </div>
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-[10px] font-black text-emerald-300">
                    {lang === "ar" ? "دفع بنقرة واحدة" : "1-Click Checkout"}
                  </span>
                </div>

                <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">
                  {lang === "ar" ? "3. السلة وإتمام الطلب الفوري" : "3. Cart & Instant Checkout"}
                </h3>

                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  {lang === "ar"
                    ? "دفع آمن ومشفر 100% يدعم Apple Pay، بطاقات مدى Mada، البطاقات الائتمانية، وحلول التقسيط الميسرة بدون فوائد عبر تمارا وتابي، أو الدفع عند الاستلام."
                    : "100% secure encrypted checkout supporting Apple Pay, Mada cards, Visa/Mastercard, Tamara & Tabby installments, or Cash on Delivery."}
                </p>

                <ul className="space-y-2 text-xs font-semibold text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>{lang === "ar" ? "دفع فوري بلمسة واحدة عبر Apple Pay" : "Instant 1-touch Apple Pay"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>{lang === "ar" ? "تقسيط مرن مع تمارا وتابي بدون فوائد" : "Interest-free Tamara & Tabby"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>{lang === "ar" ? "فواتير إلكترونية وتتبع المشتريات" : "E-invoices and purchase tracking"}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3. APPS BY ROLE (Customer, Courier, Restaurant) */}
        {/* ============================================================ */}
        <section className="mx-auto max-w-6xl px-4 py-6">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8">
            <div className="grid sm:grid-cols-3 gap-4">
              {/* Customer App */}
              <div className="rounded-2xl border border-amber-500/30 bg-slate-900 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">👤</span>
                  <span className="rounded-full bg-amber-500/20 text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                    {lang === "ar" ? "العملاء" : "Customer"}
                  </span>
                </div>
                <h4 className="text-sm font-black text-white">
                  {lang === "ar" ? "تطبيق العملاء" : "Customer App"}
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  {lang === "ar"
                    ? "للطلب الفوري، تصفح المنيو، وتتبع الكابتن بالرادار."
                    : "For instant ordering, menu browsing, and radar tracking."}
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <Link
                    to="/"
                    onClick={() => sounds.playClick()}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <span>{lang === "ar" ? "ابدأ الطلب الآن ⚡" : "Start Ordering ⚡"}</span>
                    <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleStoreClick("appstore")}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    {lang === "ar" ? "تحميل التطبيق" : "Download App"}
                  </button>
                </div>
              </div>

              {/* Courier App */}
              <div className="rounded-2xl border border-cyan-500/30 bg-slate-900 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🛵</span>
                  <span className="rounded-full bg-cyan-500/20 text-cyan-300 px-2 py-0.5 text-[10px] font-bold">
                    {lang === "ar" ? "الكباتن" : "Courier"}
                  </span>
                </div>
                <h4 className="text-sm font-black text-white">
                  {lang === "ar" ? "تطبيق كباتن التوصيل" : "Courier HUD App"}
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  {lang === "ar"
                    ? "لاستلام الطلبات الذكية وتحقيق دخل يومي مجزي."
                    : "For receiving smart delivery orders and daily earnings."}
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <Link
                    to="/captain"
                    onClick={() => sounds.playClick()}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <span>{lang === "ar" ? "دخول لوحة الكابتن 🛵" : "Open Courier HUD 🛵"}</span>
                    <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
                  </Link>
                  <Link
                    to="/register"
                    search={{ role: "courier" }}
                    onClick={() => sounds.playClick()}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    {lang === "ar" ? "تسجيل جديد" : "Sign Up"}
                  </Link>
                </div>
              </div>

              {/* Restaurant App */}
              <div className="rounded-2xl border border-orange-500/30 bg-slate-900 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🏪</span>
                  <span className="rounded-full bg-orange-500/20 text-orange-300 px-2 py-0.5 text-[10px] font-bold">
                    {lang === "ar" ? "المطابخ" : "Kitchens"}
                  </span>
                </div>
                <h4 className="text-sm font-black text-white">
                  {lang === "ar" ? "تطبيق المطابخ (KDS)" : "Kitchen KDS App"}
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  {lang === "ar"
                    ? "لإدارة وتجهيز الطلبات ومزامنة التوصيل المشترك."
                    : "For managing food prep and dispatch synchronization."}
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <Link
                    to="/vendor"
                    onClick={() => sounds.playClick()}
                    className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1"
                  >
                    <span>{lang === "ar" ? "دخول شاشة المطبخ 👨‍🍳" : "Open Kitchen KDS 👨‍🍳"}</span>
                    <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
                  </Link>
                  <Link
                    to="/register"
                    search={{ role: "restaurant" }}
                    onClick={() => sounds.playClick()}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    {lang === "ar" ? "تسجيل شريك" : "Join Partner"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4. FAQ SECTION */}
        {/* ============================================================ */}
        <section className="mx-auto max-w-4xl px-4 py-12 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              {lang === "ar" ? "الأسئلة الشائعة حول تحميل واستخدام التطبيق" : "Frequently Asked Questions"}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === "ar"
                ? "إليك كل ما تحتاج لمعرفته حول تطبيق FoodHub للجوال."
                : "Everything you need to know about the FoodHub mobile app."}
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setOpenFaq(openFaq === idx ? null : idx);
                  }}
                  className="w-full flex items-center justify-between p-4 text-start font-bold text-sm text-white hover:text-amber-400 transition-colors"
                >
                  <span>{lang === "ar" ? faq.qAr : faq.qEn}</span>
                  {openFaq === idx ? (
                    <ChevronUp className="size-4 text-amber-400 shrink-0" />
                  ) : (
                    <ChevronDown className="size-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-slate-300 font-medium leading-relaxed border-t border-slate-800/80 pt-3">
                    {lang === "ar" ? faq.aAr : faq.aEn}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 5. BOTTOM CALL TO ACTION */}
        {/* ============================================================ */}
        <section className="mx-auto max-w-6xl px-4 pt-6">
          <div className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 p-8 text-center space-y-4 shadow-2xl">
            <div className="flex justify-center">
              <FoodHubLogo size={48} showText />
            </div>
            <h3 className="text-xl sm:text-3xl font-black text-white">
              {lang === "ar"
                ? "ابدأ رحلة طعامك الذكية الآن مع تطبيق FOODHUB"
                : "Start Your Smart Food Journey Today With FOODHUB"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto font-medium">
              {lang === "ar"
                ? "حمّل التطبيق مجاناً واستمتع بأول توصيل مجاني وكوبون خصم فوري 25% على طلبك الثانى."
                : "Download for free and enjoy free delivery + 25% discount on your second order."}
            </p>
            <div className="flex flex-wrap justify-center gap-3.5 pt-2">
              <Button
                type="button"
                onClick={() => handleStoreClick("appstore")}
                className="group flex items-center gap-3 rounded-2xl bg-black border-2 border-slate-700/80 px-5 py-2.5 text-white shadow-xl hover:border-amber-400 hover:scale-[1.02] active:scale-95 transition-all h-auto"
              >
                <svg className="size-6 fill-current text-white group-hover:text-amber-400 transition-colors shrink-0" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.06 1.71-.93 2.73 1 .08 2.02-.48 2.64-1.23z" />
                </svg>
                <div className="text-start leading-tight">
                  <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                    {lang === "ar" ? "حَمّله من" : "Download on the"}
                  </span>
                  <span className="block text-sm font-black tracking-tight group-hover:text-amber-300 transition-colors">
                    App Store
                  </span>
                </div>
              </Button>

              <Button
                type="button"
                onClick={() => handleStoreClick("playstore")}
                className="group flex items-center gap-3 rounded-2xl bg-black border-2 border-slate-700/80 px-5 py-2.5 text-white shadow-xl hover:border-amber-400 hover:scale-[1.02] active:scale-95 transition-all h-auto"
              >
                <svg className="size-6 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.018 13.298l-3.93-2.27-3.04 3.04 3.04 3.04 3.93-2.27c.72-.417.72-1.123 0-1.54z" />
                  <path fill="#EA4335" d="M15.048 14.068l-3.32-3.32-9.69-9.69c.29-.07.63.02.94.2l12.07 6.98 3.04 3.04-3.04 2.79z" />
                  <path fill="#FBBC04" d="M2.038 1.058c-.35.34-.54.88-.54 1.58v18.72c0 .7.19 1.24.54 1.58l10.02-10.02-10.02-10.3z" />
                  <path fill="#34A853" d="M15.048 14.068l-12.07 6.98c-.31.18-.65.27-.94.2l9.69-9.69 3.32 2.51z" />
                </svg>
                <div className="text-start leading-tight">
                  <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                    {lang === "ar" ? "احصل عليه من" : "GET IT ON"}
                  </span>
                  <span className="block text-sm font-black tracking-tight group-hover:text-amber-300 transition-colors">
                    Google Play
                  </span>
                </div>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
