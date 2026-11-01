import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { AdminEmailLogin } from "@/components/auth/admin-email-login";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "FoodHub | دخول الإدارة برمز البريد" },
      { name: "description", content: "دخول إدارة FoodHub بالبريد الإلكتروني ورمز تحقق مؤقت للحسابات المخوّلة." },
      { property: "og:title", content: "FoodHub | دخول الإدارة برمز البريد" },
      { property: "og:description", content: "تسجيل دخول آمن لإدارة FoodHub برمز يرسل إلى البريد الإلكتروني." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  return (
    <div dir="rtl" className="foodhub-staff flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <main className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-14 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-xl font-bold">FoodHub Admin</h1>
          <p className="text-sm text-muted-foreground">تسجيل دخول الإدارة</p>
        </div>
        <AdminEmailLogin onComplete={() => { void navigate({ to: "/admin", replace: true }); }} />
      </main>
    </div>
  );
}
