import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FoodHubLogo } from "@/components/food-hub-logo";
import { useI18n } from "@/lib/i18n";

export function CustomerInformationLayout({ title, children }: { title: string; children: ReactNode }) {
  const { lang, setLang } = useI18n();
  const router = useRouter();
  const ar = lang === "ar";
  return (
    <div className="foodhub-customer customer-information" dir={ar ? "rtl" : "ltr"}>
      <header className="customer-information-header">
        <Button variant="outline" size="icon" aria-label={ar ? "رجوع" : "Back"} onClick={() => {
          if (window.history.length > 1) router.history.back();
          else router.navigate({ to: "/", search: { app: "customer" } });
        }}>{ar ? <ArrowRight /> : <ArrowLeft />}</Button>
        <h1>{title}</h1>
      </header>
      <main className="customer-information-main">
        <div className="customer-information-brand">
          <Link to="/" search={{ app: "customer" }} aria-label="FoodHub"><FoodHubLogo showText={false} /><strong dir="ltr">FoodHub</strong></Link>
          <Button variant="ghost" onClick={() => setLang(ar ? "en" : "ar")}><Globe className="size-4" />{ar ? "English" : "العربية"}</Button>
        </div>
        {children}
      </main>
    </div>
  );
}