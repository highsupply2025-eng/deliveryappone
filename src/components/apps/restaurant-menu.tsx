import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  UtensilsCrossed,
  Sparkles,
  ImagePlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const OFFER_CATEGORY = "عروض";

const QUICK_CATEGORIES = [
  "برجر",
  "بيتزا",
  "مشويات",
  "شاورما",
  "ساندوتشات",
  "مشروبات",
  "حلويات",
];

/** إضافة وعرض وتعديل منتجات المطعم أو عروضه (العروض = منتجات في تصنيف «عروض»). */
export function RestaurantMenu({
  restaurantId,
  offers,
}: {
  restaurantId: string;
  offers: boolean;
}) {
  const qc = useQueryClient();
  const key = ["restaurant-menu", restaurantId];
  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
  });
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
  });

  const items = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select(
          "id,image_url,name_ar,price,description_ar,category_ar,is_available",
        )
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const baseList = (items.data ?? []).filter(
    (i) => (i.category_ar === OFFER_CATEGORY) === offers,
  );
  const availableCount = baseList.filter((i) => i.is_available).length;
  const pausedCount = baseList.length - availableCount;

  const categories = Array.from(
    new Set(
      baseList
        .map((i) => i.category_ar?.trim())
        .filter((c): c is string => !!c && c !== OFFER_CATEGORY),
    ),
  );

  const list = baseList.filter((i) => {
    if (!offers && categoryFilter !== "all" && i.category_ar !== categoryFilter) {
      return false;
    }
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      i.name_ar.toLowerCase().includes(q) ||
      (i.description_ar ?? "").toLowerCase().includes(q) ||
      (i.category_ar ?? "").toLowerCase().includes(q)
    );
  });

  const save = async () => {
    const price = Number(form.price);
    if (!form.name.trim() || !(price > 0)) {
      toast.error("أدخل الاسم وسعرًا صحيحًا أكبر من صفر");
      return;
    }
    setBusy(true);
    let image_url: string | null = null;
    if (file) {
      const path = `${restaurantId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "")}`;
      const up = await supabase.storage
        .from("menu-images")
        .upload(path, file, { contentType: file.type });
      const signed = up.error
        ? null
        : await supabase.storage
            .from("menu-images")
            .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (!signed?.data) {
        setBusy(false);
        toast.error("تعذر رفع الصورة");
        return;
      }
      image_url = signed.data.signedUrl;
    }
    const category = offers ? OFFER_CATEGORY : form.category.trim() || "وجبات رئيسية";
    const { error } = await supabase.from("menu_items").insert({
      restaurant_id: restaurantId,
      name_ar: form.name.trim(),
      name_en: form.name.trim(),
      price,
      image_url,
      description_ar: form.description.trim(),
      description_en: form.description.trim(),
      category_ar: category,
      category_en: category,
    });
    setBusy(false);
    if (error) {
      toast.error("تعذر حفظ الصنف");
      return;
    }
    toast.success(offers ? "تمت إضافة العرض بنجاح ✓" : "تمت إضافة المنتج بنجاح ✓");
    setForm({ name: "", price: "", description: "", category: "" });
    setFile(null);
    void qc.invalidateQueries({ queryKey: key });
  };

  const toggle = async (id: string, is_available: boolean) => {
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available })
      .eq("id", id);
    if (error) {
      toast.error("تعذر تحديث حالة التوفر");
    } else {
      toast.success(is_available ? "تم تفعيل الصنف في القائمة" : "تم إيقاف الصنف مؤقتاً");
      void qc.invalidateQueries({ queryKey: key });
    }
  };

  const saveEdit = async (id: string) => {
    const price = Number(editDraft.price);
    if (!editDraft.name.trim() || !(price > 0)) {
      toast.error("أدخل الاسم والسعر بشكل صحيح");
      return;
    }
    setBusy(true);
    const category = offers
      ? OFFER_CATEGORY
      : editDraft.category.trim() || "وجبات رئيسية";
    const { error } = await supabase
      .from("menu_items")
      .update({
        name_ar: editDraft.name.trim(),
        name_en: editDraft.name.trim(),
        price,
        description_ar: editDraft.description.trim(),
        description_en: editDraft.description.trim(),
        category_ar: category,
        category_en: category,
      })
      .eq("id", id);
    setBusy(false);
    if (error) {
      toast.error("تعذر حفظ التعديلات");
      return;
    }
    toast.success("تم تحديث بيانات الصنف بنجاح ✓");
    setEditingId(null);
    void qc.invalidateQueries({ queryKey: key });
  };

  const removeItem = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف «${name}» نهائياً من القائمة؟`)) return;
    setBusy(true);
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    setBusy(false);
    if (error) {
      toast.error("تعذر حذف الصنف");
    } else {
      toast.success("تم حذف الصنف من القائمة");
      void qc.invalidateQueries({ queryKey: key });
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary KPIs for Menu / Offers */}
      <section className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border bg-card p-3 text-center shadow-xs">
          <p className="text-[11px] text-muted-foreground">
            {offers ? "إجمالي العروض" : "إجمالي المنتجات"}
          </p>
          <p className="mt-1 text-xl font-black text-primary">{baseList.length}</p>
        </div>
        <div className="rounded-2xl border bg-card p-3 text-center shadow-xs">
          <p className="text-[11px] text-muted-foreground">متاح للطلب</p>
          <p className="mt-1 text-xl font-black text-emerald-700">{availableCount}</p>
        </div>
        <div className="rounded-2xl border bg-card p-3 text-center shadow-xs">
          <p className="text-[11px] text-muted-foreground">متوقف مؤقتاً</p>
          <p className="mt-1 text-xl font-black text-amber-700">{pausedCount}</p>
        </div>
      </section>

      {/* Create New Product / Offer Form */}
      <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-2">
          {offers ? (
            <Sparkles className="size-4 text-primary" />
          ) : (
            <UtensilsCrossed className="size-4 text-primary" />
          )}
          <h2 className="font-bold text-sm">
            {offers ? "إضافة عرض ترويجي جديد للعملاء" : "إضافة منتج أو وجبة جديدة للقائمة"}
          </h2>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <Input
            placeholder={
              offers ? "اسم العرض (مثال: وجبتين بسعر واحدة)" : "اسم المنتج أو الوجبة"
            }
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            type="number"
            inputMode="decimal"
            placeholder={offers ? "سعر العرض (ر.س)" : "السعر (ر.س)"}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </div>

        {!offers && (
          <div className="space-y-1.5">
            <Input
              placeholder="التصنيف (مثال: برجر، مشويات، مشروبات)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <div className="flex flex-wrap gap-1">
              {QUICK_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat })}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                    form.category === cat
                      ? "border-primary bg-primary/15 text-foreground font-bold"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <Input
          placeholder="الوصف ومكونات الوجبة (اختياري)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <label className="flex items-center justify-between gap-2 rounded-xl border border-dashed bg-secondary/30 p-3 text-xs cursor-pointer hover:bg-secondary/50">
          <span className="flex items-center gap-2 font-medium">
            <ImagePlus className="size-4 text-primary" />
            {file ? `تم اختيار: ${file.name}` : `إرفاق صورة ${offers ? "العرض" : "المنتج"}`}
          </span>
          <Input
            key={file ? "f" : "e"}
            type="file"
            accept="image/*"
            className="max-w-48 text-xs"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <Button className="w-full gap-1.5" disabled={busy} onClick={() => void save()}>
          <Plus className="size-4" />
          {offers ? "حفظ ونشر العرض" : "حفظ وإضافة المنتج للقائمة"}
        </Button>
      </section>

      {/* Search & Category Filter */}
      {baseList.length > 0 && (
        <div className="space-y-2 rounded-2xl border bg-card p-3 shadow-xs">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={offers ? "ابحث في العروض..." : "ابحث في المنتجات أو التصنيفات..."}
              className="h-9 pe-9 text-xs"
            />
          </div>
          {!offers && categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant={categoryFilter === "all" ? "default" : "outline"}
                onClick={() => setCategoryFilter("all")}
                className="h-7 px-2.5 text-xs"
              >
                الكل ({baseList.length})
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={categoryFilter === cat ? "default" : "outline"}
                  onClick={() => setCategoryFilter(cat)}
                  className="h-7 px-2.5 text-xs"
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items List */}
      {items.isError ? (
        <p role="alert" className="text-destructive text-sm">
          تعذر تحميل القائمة
        </p>
      ) : items.isPending ? (
        <p className="text-sm text-muted-foreground">جارِ التحميل…</p>
      ) : !list.length ? (
        <div className="rounded-2xl border bg-card py-10 text-center text-sm text-muted-foreground">
          {offers ? "لا توجد عروض مطابقة حالياً" : "لا توجد منتجات مطابقة حالياً"}
        </div>
      ) : (
        <div className="space-y-2.5">
          {list.map((i) => {
            const isEditing = editingId === i.id;
            return (
              <article
                key={i.id}
                className="rounded-2xl border bg-card p-3.5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  {i.image_url ? (
                    <img
                      src={i.image_url}
                      alt={i.name_ar}
                      className="size-16 shrink-0 rounded-xl object-cover border"
                    />
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border bg-secondary/50 text-muted-foreground">
                      <UtensilsCrossed className="size-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold truncate">{i.name_ar}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          i.is_available
                            ? "bg-emerald-500/15 text-emerald-700"
                            : "bg-amber-500/15 text-amber-800"
                        }`}
                      >
                        {i.is_available ? "متاح" : "متوقف"}
                      </span>
                    </div>
                    <p className="text-sm font-black text-primary mt-0.5">
                      {Number(i.price).toFixed(2)} ر.س
                      {i.category_ar && !offers && (
                        <span className="ms-2 text-xs font-normal text-muted-foreground">
                          · {i.category_ar}
                        </span>
                      )}
                    </p>
                    {i.description_ar && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {i.description_ar}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={i.is_available ? "outline" : "default"}
                      onClick={() => void toggle(i.id, !i.is_available)}
                      className="h-8 px-2.5 text-xs"
                    >
                      {i.is_available ? "إيقاف" : "تفعيل"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="تعديل الصنف"
                      onClick={() => {
                        setEditingId(isEditing ? null : i.id);
                        setEditDraft({
                          name: i.name_ar,
                          price: String(i.price),
                          description: i.description_ar ?? "",
                          category: i.category_ar ?? "",
                        });
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="حذف الصنف"
                      className="text-destructive"
                      onClick={() => void removeItem(i.id, i.name_ar)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {isEditing && (
                  <div className="space-y-2 border-t pt-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        value={editDraft.name}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, name: e.target.value })
                        }
                        placeholder="الاسم"
                      />
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={editDraft.price}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, price: e.target.value })
                        }
                        placeholder="السعر (ر.س)"
                      />
                    </div>
                    {!offers && (
                      <Input
                        value={editDraft.category}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, category: e.target.value })
                        }
                        placeholder="التصنيف"
                      />
                    )}
                    <Input
                      value={editDraft.description}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, description: e.target.value })
                      }
                      placeholder="الوصف"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 gap-1"
                        disabled={busy}
                        onClick={() => void saveEdit(i.id)}
                      >
                        <Check className="size-3.5" />
                        حفظ التعديل
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-3.5" />
                        إلغاء
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
