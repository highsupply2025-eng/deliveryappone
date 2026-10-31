import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const OFFER_CATEGORY = "عروض";

/** إضافة وعرض منتجات المطعم أو عروضه (العروض = منتجات في تصنيف «عروض»). */
export function RestaurantMenu({ restaurantId, offers }: { restaurantId: string; offers: boolean }) {
  const qc = useQueryClient();
  const key = ["restaurant-menu", restaurantId];
  const [form, setForm] = useState({ name: "", price: "", description: "", category: "" });
  const [busy, setBusy] = useState(false);
  const items = useQuery({ queryKey: key, queryFn: async () => {
    const { data, error } = await supabase.from("menu_items").select("id,name_ar,price,description_ar,category_ar,is_available").eq("restaurant_id", restaurantId).order("created_at", { ascending: false });
    if (error) throw error; return data;
  } });
  const list = (items.data ?? []).filter((i) => (i.category_ar === OFFER_CATEGORY) === offers);
  const save = async () => {
    const price = Number(form.price);
    if (!form.name.trim() || !(price > 0)) { toast.error("أدخل الاسم وسعرًا صحيحًا"); return; }
    setBusy(true);
    const category = offers ? OFFER_CATEGORY : form.category.trim();
    const { error } = await supabase.from("menu_items").insert({ restaurant_id: restaurantId, name_ar: form.name.trim(), name_en: form.name.trim(), price, description_ar: form.description.trim(), description_en: form.description.trim(), category_ar: category, category_en: category });
    setBusy(false);
    if (error) { toast.error("تعذر الحفظ"); return; }
    toast.success(offers ? "تمت إضافة العرض" : "تمت إضافة المنتج");
    setForm({ name: "", price: "", description: "", category: "" });
    void qc.invalidateQueries({ queryKey: key });
  };
  const toggle = async (id: string, is_available: boolean) => {
    const { error } = await supabase.from("menu_items").update({ is_available }).eq("id", id);
    if (error) toast.error("تعذر التحديث"); else void qc.invalidateQueries({ queryKey: key });
  };
  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="font-bold">{offers ? "رفع عرض جديد" : "رفع منتج جديد"}</h2>
        <Input placeholder={offers ? "اسم العرض (مثال: وجبتين بسعر واحدة)" : "اسم المنتج"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input type="number" inputMode="decimal" placeholder={offers ? "سعر العرض (ر.س)" : "السعر (ر.س)"} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        {!offers && <Input placeholder="التصنيف (مثال: برجر، مشروبات)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />}
        <Input placeholder="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Button className="w-full" disabled={busy} onClick={() => void save()}>حفظ</Button>
      </section>
      {items.isError ? <p role="alert" className="text-destructive">تعذر تحميل القائمة</p> : items.isPending ? <p>جارِ التحميل…</p> : !list.length ? <p className="text-muted-foreground">{offers ? "لا توجد عروض بعد" : "لا توجد منتجات بعد"}</p> :
        list.map((i) => (
          <article key={i.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
            <div><p className="font-bold">{i.name_ar}</p><p className="text-sm text-muted-foreground">{i.price} ر.س{i.category_ar && !offers ? ` · ${i.category_ar}` : ""}</p></div>
            <Button size="sm" variant={i.is_available ? "outline" : "default"} onClick={() => void toggle(i.id, !i.is_available)}>{i.is_available ? "إيقاف" : "تفعيل"}</Button>
          </article>
        ))}
    </div>
  );
}
