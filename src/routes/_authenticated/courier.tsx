import { createFileRoute, redirect } from "@tanstack/react-router";
import { SimpleCourierApp } from "@/components/apps/simple-courier-app";

export const Route = createFileRoute("/_authenticated/courier")({
  beforeLoad: () => {
    throw redirect({ to: "/captain" });
  },
  head: () => ({ meta: [
    { title: "FoodHub | شيفت المندوب" },
    { name: "description", content: "شيفت المندوب والأحياء المحددة من الإدارة ومواقع الطلبات." },
    { property: "og:title", content: "FoodHub | شيفت المندوب" },
    { property: "og:description", content: "ساعات العمل الفعلية واستلام وتسليم طلبات FoodHub." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: () => <SimpleCourierApp />,
});
