import { useIsAdminApp } from "@/lib/native-app";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  ShoppingBag,
  Languages,
  LogOut,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  Store,
  Bike,
  Lock,
  KeyRound,
  UserCheck,
  User,
  HelpCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { dashboardPathFor, useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FoodHubLogo } from "@/components/food-hub-logo";
import { sounds } from "@/lib/sound-effects";
import { PartnerJoinModal, JoinAccountType } from "@/components/partner-join-modal";
import { ThemeToggleDropdown } from "@/components/theme-toggle-dropdown";
import { LanguageDropdown } from "@/components/language-dropdown";

export function AppHeader() {
  const isAdminApp = useIsAdminApp();
  if (isAdminApp) return null;
  return <SiteHeader />;
}

function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const { count } = useCart();
  const { user, role } = useSession();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hidden Admin Triple-Click Mechanism on Website Logo
  const logoClicksRef = useRef<number>(0);
  const logoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoClick = (e: React.MouseEvent) => {
    sounds.playClick();
    logoClicksRef.current += 1;

    if (logoTimerRef.current) {
      clearTimeout(logoTimerRef.current);
    }

    if (logoClicksRef.current >= 3) {
      e.preventDefault();
      logoClicksRef.current = 0;
      sounds.playSuccess();
      toast.success(
        lang === "ar"
          ? "🔐 جارٍ فتح بوابة تسجيل دخول الإدارة المركزية..."
          : "🔐 Opening Admin Portal..."
      );
      void navigate({ to: "/auth" });
      return;
    }

    logoTimerRef.current = setTimeout(() => {
      logoClicksRef.current = 0;
    }, 1200);
  };

  const goToLogin = () => {
    sounds.playClick();
    void navigate({ to: "/auth" });
  };

  const handleSignOut = async () => {
    sounds.playClick();
    await supabase.auth.signOut();
    void navigate({ to: "/", replace: true });
    setMobileMenuOpen(false);
  };

  const isCustomer = role === "customer";
  const isAdmin = role === "admin";
  const isRestaurant = role === "restaurant";
  const isCourier = role === "courier";
  const isLoggedIn = Boolean(user);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl text-slate-100">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          {/* Logo & Speed Delivery Badge */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              to="/"
              onClick={handleLogoClick}
              className="flex items-center gap-2 group transition-transform active:scale-95 shrink-0 select-none cursor-pointer"
              title={lang === "ar" ? "FOODHUB - الرئيسية" : "FOODHUB - Home"}
            >
              <FoodHubLogo size={40} showText />
            </Link>

            {/* Professional Fast Delivery Badge Pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/35 px-3.5 py-1 text-xs font-black text-amber-300 backdrop-blur-md shadow-sm shadow-amber-500/10">
              <span className="flex size-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>
                ⚡ {lang === "ar" ? "أسرع توصيل في 15 دقيقة بأقل سعر" : "Fastest 15-min delivery at the lowest rates"}
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="flex-1" />
          <div className="hidden items-center gap-2 md:flex">
            {/* Theme & Brightness Dropdown */}
            <ThemeToggleDropdown />

            {/* Language Selector Dropdown */}
            <LanguageDropdown />

            {/* Customer Account Authenticated Links ONLY */}
            {isCustomer && (
              <>
                {/* Store & Menu */}
                <Button asChild variant="ghost" size="sm" className="gap-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900">
                  <Link to="/" onClick={() => sounds.playClick()}>
                    <Store className="size-4 text-amber-500 dark:text-amber-400" />
                    <span>{lang === "ar" ? "المتجر والطلب" : "Store"}</span>
                  </Link>
                </Button>

                {/* Track Orders */}
                <Button asChild variant="ghost" size="sm" className="text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900">
                  <Link to="/orders" onClick={() => sounds.playClick()}>
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-amber-500 dark:text-amber-400" />
                      {lang === "ar" ? "تتبع طلباتي" : "Track Orders"}
                    </span>
                  </Link>
                </Button>

                {/* Cart */}
                <Button asChild variant="ghost" size="sm" aria-label={t("cart")} className="relative gap-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900">
                  <Link to="/cart" onClick={() => sounds.playClick()}>
                    <ShoppingBag className="size-4 text-amber-500 dark:text-amber-400" />
                    <span className="hidden sm:inline">{t("cart")}</span>
                    {count > 0 ? (
                      <span className="absolute -top-1 -end-1 flex size-5 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-[11px] font-bold text-slate-950 shadow-md shadow-amber-500/50">
                        {count}
                      </span>
                    ) : null}
                  </Link>
                </Button>
              </>
            )}

            {/* Admin Link: Dashboard when logged in as admin, or Admin Portal Entry */}
            {isAdmin ? (
              <Button asChild variant="ghost" size="sm" className="gap-1.5 text-cyan-600 dark:text-cyan-300 hover:text-cyan-700 dark:hover:text-cyan-200 hover:bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                <Link to="/admin" onClick={() => sounds.playClick()}>
                  <ShieldCheck className="size-4 text-cyan-500 dark:text-cyan-400" />
                  <span>{lang === "ar" ? "لوحة الإدارة المركزية" : "Admin Panel"}</span>
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex gap-1.5 border-slate-700 hover:border-amber-400 bg-slate-900/80 text-slate-200 hover:text-amber-400 rounded-xl text-xs">
                <Link to="/auth" onClick={() => sounds.playClick()}>
                  <ShieldCheck className="size-3.5 text-amber-400" />
                  <span>{lang === "ar" ? "لوحة الإدارة" : "Admin"}</span>
                </Link>
              </Button>
            )}

            {/* Authenticated Restaurant Link */}
            {isRestaurant && (
              <Button asChild variant="ghost" size="sm" className="gap-1.5 text-orange-600 dark:text-orange-300 hover:text-orange-700 dark:hover:text-orange-200 hover:bg-orange-500/10 border border-orange-500/30 rounded-xl">
                <Link to="/vendor" onClick={() => sounds.playClick()}>
                  <Store className="size-4 text-orange-500 dark:text-orange-400" />
                  <span>{lang === "ar" ? "شاشة المطبخ (KDS)" : "Kitchen KDS"}</span>
                </Link>
              </Button>
            )}

            {/* Authenticated Courier Link */}
            {isCourier && (
              <Button asChild variant="ghost" size="sm" className="gap-1.5 text-cyan-600 dark:text-cyan-300 hover:text-cyan-700 dark:hover:text-cyan-200 hover:bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                <Link to="/captain" onClick={() => sounds.playClick()}>
                  <Bike className="size-4 text-cyan-500 dark:text-cyan-400" />
                  <span>{lang === "ar" ? "لوحة المندوب الذكي" : "Courier HUD"}</span>
                </Link>
              </Button>
            )}

            {/* Logout button ONLY when logged in */}
            {isLoggedIn && (
              <Button
                variant="outline"
                size="sm"
                aria-label={t("logout")}
                onClick={handleSignOut}
                className="gap-1.5 border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white rounded-xl"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">
                  {t("logout")}
                </span>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            aria-label={mobileMenuOpen ? (lang === "ar" ? "إغلاق القائمة" : "Close menu") : (lang === "ar" ? "فتح القائمة الرئيسية" : "Open menu")}
            className="md:hidden text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
            onClick={() => {
              sounds.playClick();
              setMobileMenuOpen(!mobileMenuOpen);
            }}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 md:hidden animate-in slide-in-from-top-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <ThemeToggleDropdown />
                <LanguageDropdown />
              </div>

              {/* Mobile Fast Delivery Badge */}
              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 px-3 py-2 text-xs font-black text-amber-300 text-center">
                <span className="flex size-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>
                  ⚡ {lang === "ar" ? "أسرع توصيل في 15 دقيقة بأقل سعر" : "Fastest 15-min delivery at lowest rates"}
                </span>
              </div>

              {/* Customer Only Links on Mobile */}
              {isCustomer && (
                <>
                  <Button asChild variant="ghost" size="sm" className="justify-start gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900">
                    <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                      <Store className="size-4 text-amber-500 dark:text-amber-400" />
                      {lang === "ar" ? "المتجر والطلب" : "Store"}
                    </Link>
                  </Button>

                  <Button asChild variant="ghost" size="sm" className="justify-start gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900">
                    <Link to="/orders" onClick={() => setMobileMenuOpen(false)}>
                      <Sparkles className="size-4 text-amber-500 dark:text-amber-400" />
                      {lang === "ar" ? "تتبع طلباتي" : "Track Orders"}
                    </Link>
                  </Button>

                  <Button asChild variant="ghost" size="sm" className="justify-start gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900">
                    <Link to="/cart" onClick={() => setMobileMenuOpen(false)}>
                      <ShoppingBag className="size-4 text-amber-500 dark:text-amber-400" />
                      {t("cart")}
                      {count > 0 ? (
                        <span className="ms-2 flex size-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-slate-950">
                          {count}
                        </span>
                      ) : null}
                    </Link>
                  </Button>
                </>
              )}

              {/* Admin Link on Mobile */}
              {isAdmin && (
                <Button asChild variant="ghost" size="sm" className="justify-start gap-2 text-cyan-600 dark:text-cyan-300 hover:text-cyan-700 dark:hover:text-white hover:bg-cyan-500/10">
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <ShieldCheck className="size-4 text-cyan-500 dark:text-cyan-400" />
                    {lang === "ar" ? "لوحة الإدارة المركزية" : "Admin Panel"}
                  </Link>
                </Button>
              )}

              {/* Restaurant Link on Mobile */}
              {isRestaurant && (
                <Button asChild variant="ghost" size="sm" className="justify-start gap-2 text-orange-600 dark:text-orange-300 hover:text-orange-700 dark:hover:text-white hover:bg-orange-500/10">
                  <Link to="/vendor" onClick={() => setMobileMenuOpen(false)}>
                    <Store className="size-4 text-orange-500 dark:text-orange-400" />
                    {lang === "ar" ? "شاشة المطبخ (KDS)" : "Kitchen KDS"}
                  </Link>
                </Button>
              )}

              {/* Courier Link on Mobile */}
              {isCourier && (
                <Button asChild variant="ghost" size="sm" className="justify-start gap-2 text-cyan-600 dark:text-cyan-300 hover:text-cyan-700 dark:hover:text-white hover:bg-cyan-500/10">
                  <Link to="/captain" onClick={() => setMobileMenuOpen(false)}>
                    <Bike className="size-4 text-cyan-500 dark:text-cyan-400" />
                    {lang === "ar" ? "لوحة المندوب الذكي" : "Courier HUD"}
                  </Link>
                </Button>
              )}

              {isLoggedIn && (
                <Button variant="outline" size="sm" onClick={handleSignOut} className="justify-start gap-2 border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                  <LogOut className="size-4" />
                  {t("logout")}
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

    </>
  );
}

export function AppFooter() {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinType, setJoinType] = useState<JoinAccountType>("customer");

  const logoClicksRef = useRef<number>(0);
  const logoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFooterLogoClick = (e: React.MouseEvent) => {
    sounds.playClick();
    logoClicksRef.current += 1;

    if (logoTimerRef.current) {
      clearTimeout(logoTimerRef.current);
    }

    if (logoClicksRef.current >= 3) {
      e.preventDefault();
      logoClicksRef.current = 0;
      sounds.playSuccess();
      toast.success(
        lang === "ar"
          ? "🔐 جارٍ فتح بوابة تسجيل دخول الإدارة المركزية..."
          : "🔐 Opening Admin Portal..."
      );
      void navigate({ to: "/auth" });
      return;
    }

    logoTimerRef.current = setTimeout(() => {
      logoClicksRef.current = 0;
    }, 1200);
  };

  const openJoinModal = (type: JoinAccountType) => {
    sounds.playClick();
    setJoinType(type);
    setJoinModalOpen(true);
  };

  return (
    <>
      <footer className="border-t border-slate-800 bg-slate-950 text-slate-400">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            
            {/* 1. Brand & Description */}
            <div className="sm:col-span-2 lg:col-span-1 space-y-3">
              <div
                onClick={handleFooterLogoClick}
                className="flex items-center gap-2 cursor-pointer select-none active:scale-95 transition-transform inline-block"
                title={lang === "ar" ? "FOODHUB" : "FOODHUB"}
              >
                <FoodHubLogo size={40} showText />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === "ar"
                  ? "منظومة توصيل طعام متكاملة تجمع بين أفضل المطابخ السحابية والمطاعم مع أسرع خدمة توصيل وأعلى معايير الجودة وأقل سعر توصيل."
                  : "All-in-one smart food delivery platform connecting premier cloud kitchens and restaurants with ultra-fast delivery and top security."}
              </p>
            </div>

            {/* 2. Customer Services */}
            <div>
              <h3 className="mb-3 font-bold text-white text-sm">
                {lang === "ar" ? "خدمات العملاء" : "Customer Services"}
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <Link
                    to="/download"
                    onClick={() => sounds.playClick()}
                    className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
                  >
                    <span>🍽️</span>
                    <span>{lang === "ar" ? "تصفح قائمة الأطباق الصحية" : "Browse Healthy Menu"}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/download"
                    onClick={() => sounds.playClick()}
                    className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
                  >
                    <span>🛰️</span>
                    <span>{lang === "ar" ? "رادار تتبع الطلبات المباشر" : "Live Order Radar"}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/download"
                    onClick={() => sounds.playClick()}
                    className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
                  >
                    <span>🛒</span>
                    <span>{lang === "ar" ? "السلة وإتمام الطلب الفوري" : "Cart & Instant Checkout"}</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* 3. Account Creation Requests (Customer, Courier, Restaurant) */}
            <div>
              <h3 className="mb-3 font-bold text-white text-sm">
                {lang === "ar" ? "إنشاء الحسابات وانضمام الشركاء" : "Account Creation & Partners"}
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <Link
                    to="/download"
                    onClick={() => sounds.playClick()}
                    className="flex items-center gap-1.5 text-start hover:text-amber-400 transition-colors"
                  >
                    <User className="size-3.5 text-amber-400" />
                    {lang === "ar" ? "طلب إنشاء حساب عميل جديد (تفعيل فوري)" : "Request Customer Account (Instant)"}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/download"
                    onClick={() => sounds.playClick()}
                    className="flex items-center gap-1.5 text-start hover:text-cyan-400 transition-colors"
                  >
                    <Bike className="size-3.5 text-cyan-400" />
                    {lang === "ar" ? "طلب انضمام كابتن مندوب توصيل" : "Join as Delivery Courier"}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/download"
                    onClick={() => sounds.playClick()}
                    className="flex items-center gap-1.5 text-start hover:text-orange-400 transition-colors"
                  >
                    <Store className="size-3.5 text-orange-400" />
                    {lang === "ar" ? "طلب انضمام مطبخ سحابي / متجر" : "Join as Cloud Kitchen / Store"}
                  </Link>
                </li>
              </ul>
            </div>

            {/* 4. Information & Support (Global Food Delivery Standard) */}
            <div>
              <h3 className="mb-3 font-bold text-white text-sm">
                {lang === "ar" ? "عن FoodHub والمساعدة" : "About FoodHub & Support"}
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <Link
                    to="/faq"
                    onClick={() => sounds.playClick()}
                    className="flex items-center gap-1.5 text-start hover:text-amber-400 transition-colors"
                  >
                    <span>{lang === "ar" ? "الأسئلة الشائعة" : "FAQ"}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/help"
                    onClick={() => sounds.playClick()}
                    className="flex items-center gap-1.5 text-start hover:text-amber-400 transition-colors"
                  >
                    <span>{lang === "ar" ? "مركز المساعدة" : "Help Center"}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    onClick={() => sounds.playClick()}
                    className="flex items-center gap-1.5 text-start hover:text-amber-400 transition-colors"
                  >
                    <span>{lang === "ar" ? "الشروط والأحكام" : "Terms & Conditions"}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    onClick={() => sounds.playClick()}
                    className="flex items-center gap-1.5 text-start hover:text-amber-400 transition-colors"
                  >
                    <span>{lang === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/partnerships"
                    onClick={() => sounds.playClick()}
                    className="flex items-center gap-1.5 text-start hover:text-amber-400 transition-colors"
                  >
                    <span>{lang === "ar" ? "الشراكات" : "Partnerships"}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    onClick={() => sounds.playClick()}
                    className="flex items-center gap-1.5 text-start hover:text-amber-400 transition-colors"
                  >
                    <span>{lang === "ar" ? "تواصل معنا" : "Contact Us"}</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-800/80 pt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} FOODHUB — {lang === "ar" ? "أسرع توصيل بأقل سعر" : "FASTEST DELIVERY & LOWEST PRICE"}</p>
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-slate-400">
                {lang === "ar" ? "نظام الأكواد المشفرة وحماية الـ IP نشط 100%" : "Encrypted Codes & IP Shield Active 100%"}
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Join Request Modal */}
      <PartnerJoinModal
        open={joinModalOpen}
        onOpenChange={setJoinModalOpen}
        defaultType={joinType}
      />

    </>
  );
}
