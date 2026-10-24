import { createFileRoute, useLocation } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
const CustomerMobileApp = lazy(() => import("@/components/apps/customer-mobile-app").then(m=>({default:m.CustomerMobileApp})));
const SimpleCourierApp = lazy(() => import("@/components/apps/simple-courier-app").then(m=>({default:m.SimpleCourierApp})));
const KitchenMobileApp = lazy(() => import("@/components/apps/kitchen-work").then(m=>({default:m.KitchenWork})));
const PublicWebsite = lazy(() => import("@/components/storefront/public-website").then(m=>({default:m.PublicWebsite})));
import websitePoster from "@/assets/foodhub-rider-final-dot-top-poster.jpg.asset.json";
import { safeJsonLd } from "@/lib/jsonld";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "FOODHUB | أسرع توصيل بأقل سعر" },
      {
        name: "description",
        content: "الموقع الرسمي لمنصة فود هب: أسرع توصيل طعام بأقل سعر في المملكة. وجبات صحية ومطابخ سحابية في الرياض مع لوحة تحكم متكاملة للإدارة.",
      },
      { property: "og:title", content: "FOODHUB | أسرع توصيل بأقل سعر" },
      {
        property: "og:description",
        content: "الموقع الرسمي لمنصة FOODHUB لعرض المنصة للجمهور وبوابة الإدارة المركزية.",
      },
      { property: "og:image", content: websitePoster.url },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://foodhub.delivery/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: websitePoster.url },
    ],
    links: [{ rel: "canonical", href: "https://foodhub.delivery/" }],
  }),
  component: AppEntry,
});

function AppEntry() {
  const searchStr = useLocation({ select: location => location.searchStr });
  const mode = new URLSearchParams(searchStr).get("app")?.toLowerCase();
  const staff = ["captain", "courier", "kitchen", "vendor", "admin"].includes(mode ?? "");
  return <div className={staff ? "foodhub-staff" : undefined}><Suspense fallback={<div dir="rtl" className="min-h-screen bg-background p-6 text-foreground">FoodHub · جارِ الفتح…</div>}><HomePage /></Suspense></div>;
}

function HomePage() {
  const searchStr = useLocation({select:location=>location.searchStr});
  const appParam = new URLSearchParams(searchStr).get("app")?.toLowerCase();
  const appMode = appParam==="courier"?"captain":appParam==="vendor"?"kitchen":appParam??"website";

  useEffect(() => {
    try {
      if (appParam === "admin") {
        localStorage.setItem("foodhub_native_app", "admin");
        window.location.replace("/admin-app");
        return;
      }
    } catch { /* storage may be unavailable */ }
  }, [appParam]);

  const websiteSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://foodhub.delivery/#website",
        url: "https://foodhub.delivery/",
        name: "FOODHUB",
        description: "المنصة الرسمية الموحدة لتوصيل الطعام وإدارة المطابخ السحابية",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://foodhub.delivery/?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": "https://foodhub.delivery/#organization",
        name: "FOODHUB Delivery",
        url: "https://foodhub.delivery/",
        logo: "https://foodhub.delivery/icons/icon-512.png",
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+966551234567",
          contactType: "customer service",
          areaServed: "SA",
          availableLanguage: ["Arabic", "English"],
        },
      },
    ],
  };

  // 1. Captain Standalone Mobile App (Loaded by Captain APK: delivery.foodhub.captain)
  if (appMode === "captain") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <main className="flex-1">
          <SimpleCourierApp />
        </main>
      </div>
    );
  }

  // 2. Kitchen & Merchant Standalone Mobile/Tablet App (Loaded by Kitchen APK: delivery.foodhub.kitchen)
  if (appMode === "kitchen") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <main className="flex-1">
          <KitchenMobileApp />
        </main>
      </div>
    );
  }

  // 3. Customer Standalone Mobile App (Loaded by Customer APK: delivery.foodhub.customer)
  if (appMode === "customer") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
        <main className="flex-1">
          <CustomerMobileApp />
        </main>
      </div>
    );
  }

  // 4. Default: Official Public Presentation Website & Admin Portal Access (for web visitors & Lovable editor)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteSchema) }}
      />
      <PublicWebsite />
    </div>
  );
}
