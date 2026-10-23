import { useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, UtensilsCrossed, ShoppingBag, Radar, User, ArrowRight } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { sounds } from "@/lib/sound-effects";

export function CustomerMobileNav() {
  const { lang, tn } = useI18n();
  const cart = useCart();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [activeApp, setActiveApp] = useState(() => {
    try {
      return localStorage.getItem("foodhub_active_app_view") || "customer";
    } catch {
      return "customer";
    }
  });

  useEffect(() => {
    const handleAppChanged = (e: any) => {
      if (e.detail?.appId) {
        setActiveApp(e.detail.appId);
      }
    };
    window.addEventListener("foodhub_app_changed", handleAppChanged);
    return () => window.removeEventListener("foodhub_app_changed", handleAppChanged);
  }, []);

  // Never show on standalone captain or kitchen modes
  const isSpecialAppMode =
    typeof window !== "undefined" &&
    (window.location.search.includes("app=captain") ||
      window.location.search.includes("app=courier") ||
      window.location.search.includes("app=kitchen") ||
      window.location.search.includes("app=vendor"));

  if (isSpecialAppMode) {
    return null;
  }

  // Only show on customer-facing storefront subroutes (root / has its own integrated mobile nav)
  const isCustomerRoute =
    currentPath.startsWith("/restaurant") ||
    currentPath === "/cart" ||
    currentPath === "/orders" ||
    currentPath === "/profile" ||
    currentPath === "/store" ||
    currentPath === "/faq";

  if (!isCustomerRoute || currentPath === "/") {
    return null;
  }

  const isCartPage = currentPath === "/cart";
  const hasItemsInCart = cart.lines.length > 0;
  const totalItemCount = cart.lines.reduce((sum, item) => sum + item.quantity, 0);

  const navItems = [
    {
      id: "home",
      labelAr: "الرئيسية",
      labelEn: "Home",
      path: "/",
      icon: Home,
    },
    {
      id: "menu",
      labelAr: "المطابخ والمنيو",
      labelEn: "Kitchens",
      path: "/restaurant/food-hub-prime",
      icon: UtensilsCrossed,
    },
    {
      id: "cart",
      labelAr: "السلة",
      labelEn: "Cart",
      path: "/cart",
      icon: ShoppingBag,
      badge: totalItemCount > 0 ? totalItemCount : null,
    },
    {
      id: "orders",
      labelAr: "تتبع طلباتي",
      labelEn: "Live Radar",
      path: "/orders",
      icon: Radar,
      hasPulse: true,
    },
    {
      id: "profile",
      labelAr: "حسابي",
      labelEn: "Profile",
      path: "/profile",
      icon: User,
    },
  ];

  return (
    <>
      {/* 1. FLOATING QUICK-CHECKOUT BAR (Appears when cart has items and user is browsing) */}
      {hasItemsInCart && !isCartPage && (
        <div className="fixed bottom-[4.5rem] inset-x-0 z-40 px-3 sm:px-6 pointer-events-none md:bottom-6">
          <div className="mx-auto max-w-lg pointer-events-auto">
            <Link
              to="/cart"
              onClick={() => sounds.playClick()}
              className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black shadow-2xl shadow-amber-500/30 border border-yellow-300 hover:brightness-105 active:scale-[0.99] transition-all animate-in slide-in-from-bottom-3 duration-300"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-slate-950/15 text-slate-950 font-black text-sm">
                  {totalItemCount}
                </div>
                <div className="text-start">
                  <div className="text-xs font-bold opacity-80 leading-none">
                    {lang === "ar" ? "سلة طلبك الحالية" : "Your Active Cart"}
                  </div>
                  <div className="text-sm sm:text-base font-black leading-tight">
                    {cart.subtotal.toFixed(2)} {lang === "ar" ? "ر.س" : "SAR"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black bg-slate-950 text-amber-400 px-3.5 py-2 rounded-xl shadow-inner">
                <span>{lang === "ar" ? "إتمام الطلب السريع ⚡" : "Checkout ⚡"}</span>
                <ArrowRight className="size-4 rtl:rotate-180" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* 2. DEDICATED CUSTOMER MOBILE BOTTOM NAVIGATION (Visible on mobile/tablets) */}
      <nav
        aria-label="Customer Mobile Navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-2 py-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] md:hidden pb-[env(safe-area-inset-bottom,0.5rem)]"
      >
        <div className="mx-auto flex max-w-md items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === "/"
                ? currentPath === "/"
                : currentPath.startsWith(item.path);

            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => sounds.playClick()}
                className={`relative flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 select-none ${
                  isActive
                    ? "text-amber-400 font-black scale-105"
                    : "text-slate-400 hover:text-slate-200 font-medium"
                }`}
              >
                {/* Active Indicator Top Glow */}
                {isActive && (
                  <span className="absolute -top-1.5 w-6 h-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                )}

                <div className="relative">
                  <Icon
                    className={`size-5 transition-transform ${
                      isActive ? "stroke-[2.5px] scale-110 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]" : "stroke-2"
                    }`}
                  />

                  {/* Badge for cart count */}
                  {item.badge ? (
                    <span className="absolute -top-1.5 -end-2.5 flex min-w-4 h-4 items-center justify-center rounded-full bg-red-500 text-white font-black text-[9px] px-1 shadow-md shadow-red-500/50 animate-pulse">
                      {item.badge}
                    </span>
                  ) : null}

                  {/* Pulsing radar dot for active orders tracking */}
                  {item.hasPulse && (
                    <span className="absolute -top-0.5 -end-0.5 flex size-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                    </span>
                  )}
                </div>

                <span className="text-[10px] tracking-tight leading-none">
                  {lang === "ar" ? item.labelAr : item.labelEn}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
