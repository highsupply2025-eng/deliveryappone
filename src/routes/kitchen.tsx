import { createFileRoute } from "@tanstack/react-router";
import { KitchenWork } from "@/components/apps/kitchen-work";

export const Route = createFileRoute("/kitchen")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "FOODHUB Kitchen | تطبيق شاشة المطبخ KDS" },
      {
        name: "description",
        content: "تطبيق شاشة المطبخ وإدارة المطاعم KDS في منصة فود هب. استقبال التذاكر الفورية ومؤقتات الطهي وإدارة المخزون.",
      },
      { property: "og:title", content: "FOODHUB Kitchen | تطبيق شاشة المطبخ KDS" },
      { property: "og:description", content: "طلبات المطعم الحقيقية وتحديثات التحضير وتتبع المندوب لحظياً." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KitchenStandaloneApp,
});

function KitchenStandaloneApp() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1">
        <KitchenWork />
      </main>
    </div>
  );
}
