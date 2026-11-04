import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Bike,
  Users,
  Store,
  LogOut,
  Languages,
  Menu,
  X,
  BarChart3,
  ShoppingBag,
  UserCheck,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FoodHubLogo } from "@/components/food-hub-logo";
import type { AppRole } from "@/lib/session";

type NavItem = {
  to: string;
  hash?: string;
  icon: typeof LayoutDashboard;
  ar: string;
  en: string;
};

const NAV: Record<Exclude<AppRole, never>, NavItem[]> = {
  admin: [
    { to: "/admin", icon: BarChart3, ar: "نظرة عامة", en: "Overview" },
    { to: "/admin", hash: "orders", icon: ClipboardList, ar: "الطلبات", en: "Orders" },
    { to: "/admin", hash: "restaurants", icon: Store, ar: "المطاعم", en: "Restaurants" },
    { to: "/admin", hash: "requests", icon: UserCheck, ar: "طلبات الانضمام", en: "Requests" },
    { to: "/admin", hash: "accounts", icon: Users, ar: "الحسابات", en: "Accounts" },
  ],
  restaurant: [
    { to: "/vendor", icon: LayoutDashboard, ar: "نظرة عامة", en: "Overview" },
    { to: "/vendor", hash: "orders", icon: ClipboardList, ar: "الطلبات", en: "Orders" },
    { to: "/vendor", hash: "menu", icon: UtensilsCrossed, ar: "المنيو", en: "Menu" },
    { to: "/vendor", hash: "reports", icon: BarChart3, ar: "التقارير", en: "Reports" },
  ],
  courier: [
    { to: "/captain", icon: LayoutDashboard, ar: "نظرة عامة", en: "Overview" },
    { to: "/captain", hash: "available", icon: Bike, ar: "طلبات متاحة", en: "Available" },
    { to: "/captain", hash: "mine", icon: ClipboardList, ar: "توصيلاتي", en: "My deliveries" },
  ],
  customer: [
    { to: "/orders", icon: ClipboardList, ar: "طلباتي", en: "My orders" },
    { to: "/", icon: ShoppingBag, ar: "المطاعم", en: "Restaurants" },
  ],
};

export function DashboardShell({
  role,
  title,
  subtitle,
  actions,
  active,
  onNavigate,
  children,
}: {
  role: AppRole;
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  /** current section id, matches NavItem.hash (undefined = first item) */
  active?: string | undefined;
  onNavigate?: ((section?: string) => void) | undefined;
  children: ReactNode;
}) {
  const { lang, setLang } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const items = NAV[role] ?? NAV.customer;

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  const isActive = (item: NavItem) =>
    item.to === pathname && (item.hash ?? undefined) === (active ?? undefined);

  const renderItem = (item: NavItem, variant: "side" | "bottom") => {
    const activeNow = isActive(item);
    const Icon = item.icon;
    const label = lang === "ar" ? item.ar : item.en;
    const handle = () => {
      setOpen(false);
      if (item.to === pathname && onNavigate) onNavigate(item.hash);
    };

    if (variant === "bottom") {
      return (
        <Link
          key={`${item.to}-${item.hash ?? "root"}`}
          to={item.to}
          onClick={handle}
          className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
            activeNow ? "text-[#FFC72C]" : "text-gray-400"
          }`}
        >
          <Icon className="size-5" />
          <span className="truncate">{label}</span>
        </Link>
      );
    }

    return (
      <Link
        key={`${item.to}-${item.hash ?? "root"}`}
        to={item.to}
        onClick={handle}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          activeNow
            ? "bg-[#FFC72C]/15 text-[#2B1B12]"
            : "text-gray-500 hover:bg-gray-100 hover:text-[#2B1B12]"
        }`}
      >
        <Icon className={`size-4.5 ${activeNow ? "text-[#FFC72C]" : ""}`} />
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 flex-col border-e border-gray-100 bg-white px-4 py-5 lg:flex">
        <Link to="/" className="mb-6 flex items-center gap-1 px-1">
          <FoodHubLogo size={40} showText />
        </Link>
        <nav className="flex flex-1 flex-col gap-1">{items.map((i) => renderItem(i, "side"))}</nav>
        <div className="space-y-1 border-t border-gray-100 pt-3">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100"
          >
            <Languages className="size-4.5" />
            {lang === "ar" ? "English" : "العربية"}
          </button>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
          >
            <LogOut className="size-4.5" />
            {lang === "ar" ? "تسجيل الخروج" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="close"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 start-0 flex w-64 flex-col bg-white px-4 py-5">
            <div className="mb-6 flex items-center justify-between">
              <FoodHubLogo size={36} showText />
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>
            <nav className="flex flex-1 flex-col gap-1">
              {items.map((i) => renderItem(i, "side"))}
            </nav>
            <button
              onClick={signOut}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500"
            >
              <LogOut className="size-4.5" />
              {lang === "ar" ? "تسجيل الخروج" : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Content */}
      <div className="lg:ps-64">
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setOpen(true)}>
              <Menu className="size-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold text-[#2B1B12] sm:text-lg">{title}</h1>
              {subtitle ? (
                <p className="truncate text-xs text-gray-500">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">{actions}</div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-10">{children}</main>
      </div>

      {/* Bottom tab bar (mobile / app-like) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {items.slice(0, 5).map((i) => renderItem(i, "bottom"))}
      </nav>
    </div>
  );
}
