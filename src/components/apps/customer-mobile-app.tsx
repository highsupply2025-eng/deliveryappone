import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  ShoppingBag,
  Home,
  User,
  Receipt,
  Heart,
  HelpCircle,
  Settings,
  ShieldCheck,
  LogOut,
  Globe,
  Store,
  UtensilsCrossed,
  X,
  Search,
  Star,
  Clock,
  Bike,
  Navigation,
  Trash2,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { useRealtime } from "@/lib/realtime";
import type { PickedLocation } from "./location-picker";
const LocationPicker = lazy(() => import("./location-picker"));
import {
  customerCatalog,
  catalogCategories,
  validCatalogCart,
  type CatalogMeal,
  type CatalogRestaurant,
} from "@/lib/customer-catalog";
import { Button } from "@/components/ui/button";
import { FoodHubLogo } from "@/components/food-hub-logo";
import { CustomerDiscovery } from "./customer-discovery";
import { LiveTrackingList } from "./live-tracking-list";
import { PhoneLogin } from "./phone-login";

type Tab = "home" | "kitchens" | "cart" | "radar" | "profile";
type Sheet = "location" | "login" | "info" | "settings" | "favorites" | null;

const POPULAR_NEIGHBORHOODS = [
  "العزيزية",
  "الخالدية",
  "المنصورة",
  "النرجس",
  "الملقا",
  "الياسمين",
  "العليا",
  "الروضة",
];

export function CustomerMobileApp() {
  const { lang, setLang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const cart = useCart();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("home");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restSearch, setRestSearch] = useState("");
  const [restCategory, setRestCategory] = useState("all");
  const [meal, setMeal] = useState<CatalogMeal | null>(null);
  const [qty, setQty] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [deliveryLoc, setDeliveryLoc] = useState<PickedLocation | null>(null);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [favIds, setFavIds] = useState<string[]>([]);

  useEffect(() => {
    if (!localStorage.getItem("lang")) setLang("ar");
    try {
      const savedFavs = localStorage.getItem("foodhub_fav_meals");
      if (savedFavs) setFavIds(JSON.parse(savedFavs) as string[]);
      const savedAddr = localStorage.getItem("foodhub_customer_address");
      if (savedAddr) {
        const parsed = JSON.parse(savedAddr) as {
          address?: string;
          neighborhood?: string;
          loc?: PickedLocation | null;
        };
        if (parsed.address) setAddress(parsed.address);
        if (parsed.neighborhood) setNeighborhood(parsed.neighborhood);
        if (parsed.loc) setDeliveryLoc(parsed.loc);
      }
    } catch {
      /* ignore storage errors */
    }
  }, [setLang]);

  const toggleFav = (mealId: string) => {
    setFavIds((prev) => {
      const exists = prev.includes(mealId);
      const next = exists ? prev.filter((id) => id !== mealId) : [...prev, mealId];
      try {
        localStorage.setItem("foodhub_fav_meals", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      toast.success(exists ? "أُزيلت الوجبة من المفضلة" : "أُضيفت الوجبة إلى مفضلتك ♥");
      return next;
    });
  };

  const detectCustomerGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("متصفحك لا يدعم تحديد الموقع الجغرافي");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLoc = {
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        };
        setDeliveryLoc(nextLoc);
        toast.success("تم التقاط موقعك الحالي عبر GPS بنجاح ✓");
      },
      () => {
        toast.error("تعذر التقاط موقع GPS — يمكنك التحديد بالنقر على الخريطة");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useRealtime(["restaurants", "menu_items"], ["customer-catalog"], "customer-catalog");

  const catalog = useQuery({
    queryKey: ["customer-catalog"],
    queryFn: async () => {
      const [rs, ms] = await Promise.all([
        supabase
          .from("restaurants")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .order("created_at", { ascending: false }),
      ]);
      if (rs.error) throw rs.error;
      if (ms.error) throw ms.error;
      return customerCatalog(rs.data ?? [], ms.data ?? []);
    },
    placeholderData: (prev) => prev,
  });

  const profile = useQuery({
    queryKey: ["customer-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,phone,delivery_code")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setName(profile.data?.full_name ?? "");
    setPhone(profile.data?.phone ?? "");
  }, [profile.data]);

  const restaurants = catalog.data?.restaurants ?? [];
  const meals = catalog.data?.meals ?? [];
  const categories = useMemo(() => catalogCategories(meals), [meals]);
  const selected = restaurants.find((r) => r.id === restaurantId);
  const cartRestaurant = restaurants.find((r) => r.id === cart.restaurantId);
  const cleanCart = validCatalogCart(cart.lines, meals);
  const lines = cart.lines.filter((l) =>
    meals.some(
      (m) =>
        m.id === l.id &&
        m.restaurant_id === l.restaurant_id &&
        Number(m.price) === l.price,
    ),
  );
  const totalCartItems = lines.reduce((sum, l) => sum + l.quantity, 0);

  const filtered = meals.filter(
    (m) =>
      (category === "all" || m.category_ar === category) &&
      (!search ||
        `${m.name_ar} ${m.name_en} ${restaurants.find((r) => r.id === m.restaurant_id)?.name_ar ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );

  const selectedRestaurantMeals = useMemo(() => {
    if (!selected) return [];
    return meals.filter((m) => {
      if (m.restaurant_id !== selected.id) return false;
      if (restCategory !== "all" && m.category_ar !== restCategory) return false;
      const q = restSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        m.name_ar.toLowerCase().includes(q) ||
        (m.description_ar ?? "").toLowerCase().includes(q)
      );
    });
  }, [meals, selected, restCategory, restSearch]);

  const selectedRestaurantCategories = useMemo(() => {
    if (!selected) return [];
    return Array.from(
      new Set(
        meals
          .filter((m) => m.restaurant_id === selected.id)
          .map((m) => m.category_ar?.trim())
          .filter((c): c is string => !!c),
      ),
    );
  }, [meals, selected]);

  const favoriteMeals = useMemo(
    () => meals.filter((m) => favIds.includes(m.id)),
    [meals, favIds],
  );

  const go = (t: Tab) => {
    setTab(t);
    setRestaurantId(null);
    setMeal(null);
  };

  const add = (m: CatalogMeal, n = 1) => {
    cart.add({
      id: m.id,
      restaurant_id: m.restaurant_id,
      name_ar: m.name_ar,
      name_en: m.name_en,
      price: Number(m.price),
    });
    if (n > 1)
      cart.setQty(
        m.id,
        (cart.lines.find((l) => l.id === m.id)?.quantity ?? 0) + n,
      );
    toast.success(ar ? "أُضيفت الوجبة للسلة ✓" : "Added to cart ✓");
  };

  const total =
    lines.reduce((n, l) => n + l.price * l.quantity, 0) +
    Number(cartRestaurant?.delivery_fee ?? 0);

  const minOrderAmount = Number(cartRestaurant?.min_order ?? 0);
  const minOrderProgress =
    minOrderAmount > 0
      ? Math.min(100, Math.round((cart.subtotal / minOrderAmount) * 100))
      : 100;

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setSheet("login");
      return;
    }
    if (!cartRestaurant || !lines.length || !cleanCart) {
      toast.error("تغيّرت الوجبات المتاحة؛ حدّث السلة");
      return;
    }
    if (cart.subtotal < Number(cartRestaurant.min_order)) {
      toast.error(`الحد الأدنى للطلب ${cartRestaurant.min_order} ر.س`);
      return;
    }
    if (!deliveryLoc || neighborhood.trim().length < 2) {
      toast.error("حدد الحي وموقع التسليم على الخريطة");
      setSheet("location");
      return;
    }
    setBusy(true);
    try {
      const fresh = await catalog.refetch();
      if (
        fresh.error ||
        !fresh.data ||
        !validCatalogCart(cart.lines, fresh.data.meals)
      )
        throw new Error("تغيّرت قائمة الطعام؛ راجع السلة");
      const freshRestaurant = fresh.data.restaurants.find(
        (r) => r.id === cartRestaurant.id,
      );
      if (
        !freshRestaurant ||
        Number(freshRestaurant.delivery_fee) !==
          Number(cartRestaurant.delivery_fee)
      )
        throw new Error("تغيّرت رسوم التوصيل؛ راجع السلة");
      const { data: o, error } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          restaurant_id: cartRestaurant.id,
          address: address.trim(),
          phone: phone.trim(),
          notes: notes.trim() || null,
          delivery_neighborhood: neighborhood.trim(),
          delivery_latitude: deliveryLoc.latitude,
          delivery_longitude: deliveryLoc.longitude,
          pickup_address: freshRestaurant.address ?? null,
          pickup_latitude: freshRestaurant.latitude ?? null,
          pickup_longitude: freshRestaurant.longitude ?? null,
          subtotal: cart.subtotal,
          delivery_fee: Number(cartRestaurant.delivery_fee),
          total,
          status: "pending",
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: ie } = await supabase.from("order_items").insert(
        lines.map((l) => ({
          order_id: o.id,
          menu_item_id: l.id,
          name_ar: l.name_ar,
          name_en: l.name_en,
          price: l.price,
          quantity: l.quantity,
        })),
      );
      if (ie) {
        await supabase
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", o.id);
        throw ie;
      }
      cart.clear();
      qc.invalidateQueries({ queryKey: ["live-tracking-orders"] });
      go("radar");
      toast.success("تم إرسال الطلب وتوجيهه لأقرب مندوب ضمن 10 كم ✓");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر إرسال الطلب");
    } finally {
      setBusy(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim(), phone: phone.trim() || null })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error("تعذر حفظ المعلومات");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["customer-profile", user.id] });
    setSheet(null);
    toast.success("تم حفظ المعلومات بنجاح ✓");
  };

  return (
    <div className="foodhub-customer" dir={ar ? "rtl" : "ltr"}>
      <div className="customer-app-shell">
        <header className="customer-app-header">
          <FoodHubLogo size={40} showText={false} />
          <div className="customer-header-brand">
            <strong>FOODHUB</strong>
            <Button
              variant="ghost"
              className="customer-location"
              onClick={() => setSheet("location")}
            >
              <MapPin />
              <span>
                {neighborhood && address
                  ? `${neighborhood} · ${address}`
                  : address || (ar ? "تحديد عنوان التوصيل" : "Delivery address")}
              </span>
              <ChevronDown />
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              aria-label="المفضلة"
              onClick={() => setSheet("favorites")}
              className="relative"
            >
              <Heart className="size-4 text-rose-500" />
              {favIds.length > 0 && (
                <span className="absolute -top-1 -start-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  {favIds.length}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="اللغة"
              onClick={() => setLang(ar ? "en" : "ar")}
            >
              <Globe />
            </Button>
          </div>
        </header>

        <main
          className="customer-app-body no-scrollbar pb-28"
          key={`${tab}-${restaurantId}`}
        >
          {(tab === "home" || tab === "kitchens") && !selected && (
            <CustomerDiscovery
              ar={ar}
              categories={categories}
              category={category}
              onCategory={setCategory}
              search={search}
              onSearch={setSearch}
              meals={filtered}
              restaurants={restaurants}
              onRestaurant={(r: CatalogRestaurant) => {
                setRestaurantId(r.id);
                setRestCategory("all");
                setRestSearch("");
              }}
              onMeal={(m) => {
                setMeal(m);
                setQty(1);
              }}
              onAdd={add}
              onBrowse={() => go("kitchens")}
              directory={tab === "kitchens"}
              loading={catalog.isPending}
              error={catalog.isError}
              onRetry={() => void catalog.refetch()}
            />
          )}

          {/* UPGRADED RESTAURANT STOREFRONT PAGE */}
          {selected && (
            <div className="customer-page space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRestaurantId(null)}
                  className="gap-1 font-bold"
                >
                  <ChevronRight className="size-4" />
                  رجوع للمطاعم
                </Button>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  <Star className="size-3.5 fill-amber-500 text-amber-500" />
                  4.9 ممتاز
                </span>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                {selected.image_url && (
                  <img
                    className="h-44 w-full object-cover"
                    src={selected.image_url}
                    alt={selected.name_ar}
                  />
                )}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h1 className="text-xl font-black text-slate-900">
                        {ar ? selected.name_ar : selected.name_en}
                      </h1>
                      <p className="text-xs text-slate-500 font-medium">
                        {selected.cuisine_ar || "أشهى الوجبات المحضرة طازجة"}
                      </p>
                    </div>
                    <span className="rounded-xl bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      مفتوح الآن ✓
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                    <div className="rounded-xl bg-slate-50 p-2">
                      <span className="block text-[10px] text-slate-400">وقت التحضير</span>
                      <strong className="flex items-center justify-center gap-1 text-slate-900 mt-0.5">
                        <Clock className="size-3 text-amber-500" />
                        {selected.eta_minutes} دقيقة
                      </strong>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">
                      <span className="block text-[10px] text-slate-400">رسوم التوصيل</span>
                      <strong className="flex items-center justify-center gap-1 text-slate-900 mt-0.5">
                        <Bike className="size-3 text-emerald-600" />
                        {Number(selected.delivery_fee) === 0
                          ? "مجاني"
                          : `${selected.delivery_fee} ر.س`}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">
                      <span className="block text-[10px] text-slate-400">الحد الأدنى</span>
                      <strong className="block text-slate-900 mt-0.5">
                        {selected.min_order} ر.س
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search & Category Pills inside Restaurant */}
              <div className="space-y-2.5">
                <div className="relative flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Search className="size-4 text-amber-500 me-2" />
                  <input
                    value={restSearch}
                    onChange={(e) => setRestSearch(e.target.value)}
                    placeholder="ابحث داخل قائمة المطعم..."
                    className="w-full bg-transparent text-xs font-medium outline-none"
                  />
                </div>
                {selectedRestaurantCategories.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    <button
                      type="button"
                      onClick={() => setRestCategory("all")}
                      className={`rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${
                        restCategory === "all"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      الكل
                    </button>
                    {selectedRestaurantCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setRestCategory(cat)}
                        className={`rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${
                          restCategory === cat
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <h2 className="text-base font-black text-slate-900">
                قائمة الطعام ({selectedRestaurantMeals.length})
              </h2>

              <div className="space-y-2.5">
                {selectedRestaurantMeals.map((m) => {
                  const inCartLine = lines.find((l) => l.id === m.id);
                  const isFav = favIds.includes(m.id);
                  return (
                    <div
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-xs"
                      key={m.id}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setMeal(m);
                          setQty(1);
                        }}
                        className="flex flex-1 items-center gap-3 text-start min-w-0"
                      >
                        {m.image_url ? (
                          <img
                            src={m.image_url}
                            alt={m.name_ar}
                            className="size-16 shrink-0 rounded-xl object-cover border border-slate-100"
                          />
                        ) : (
                          <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <UtensilsCrossed className="size-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <strong className="block text-sm font-bold text-slate-900 truncate">
                            {m.name_ar}
                          </strong>
                          {m.description_ar && (
                            <small className="block text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {m.description_ar}
                            </small>
                          )}
                          <b className="mt-1 inline-block text-sm font-black text-amber-600">
                            {Number(m.price).toFixed(2)} ر.س
                          </b>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="مفضلة"
                          onClick={() => toggleFav(m.id)}
                          className="size-8"
                        >
                          <Heart
                            className={`size-4 ${
                              isFav ? "fill-rose-500 text-rose-500" : "text-slate-400"
                            }`}
                          />
                        </Button>

                        {inCartLine ? (
                          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-1.5 py-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-6"
                              onClick={() =>
                                cart.setQty(m.id, inCartLine.quantity - 1)
                              }
                            >
                              <Minus className="size-3.5" />
                            </Button>
                            <b className="text-xs font-black px-1">
                              {inCartLine.quantity}
                            </b>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-6"
                              onClick={() =>
                                cart.setQty(m.id, inCartLine.quantity + 1)
                              }
                            >
                              <Plus className="size-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="icon"
                            aria-label={`إضافة ${m.name_ar}`}
                            onClick={() => add(m)}
                            className="rounded-xl"
                          >
                            <Plus className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!selectedRestaurantMeals.length && (
                <p className="customer-empty">لا توجد وجبات مطابقة لهذا المطعم</p>
              )}
            </div>
          )}

          {/* UPGRADED CART & CHECKOUT TAB */}
          {tab === "cart" && (
            <div className="customer-page space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-black">
                  {ar ? "سلة الطلبات وإتمام الشراء" : "Your Cart"}
                </h1>
                {lines.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cart.clear()}
                    className="gap-1 text-xs text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    إفراغ السلة
                  </Button>
                )}
              </div>

              {catalog.isPending ? (
                <p className="text-sm text-slate-500">جارِ مراجعة السلة…</p>
              ) : !lines.length ? (
                <div className="customer-empty">
                  <ShoppingBag />
                  <h2>{ar ? "السلة فارغة حالياً" : "Your cart is empty"}</h2>
                  <p className="text-xs text-slate-500">
                    أضف وجباتك المفضلة من أشهر المطاعم واستمتع بتوصيل سريع لمنطقتك
                  </p>
                  <Button
                    onClick={() => {
                      if (!cleanCart) cart.clear();
                      go("home");
                    }}
                  >
                    تصفح الوجبات والمطاعم
                  </Button>
                </div>
              ) : (
                <>
                  {/* Restaurant Header & Minimum Order Progress Bar */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store className="size-4 text-amber-600" />
                        <h2 className="font-bold text-sm text-slate-900">
                          {cartRestaurant?.name_ar}
                        </h2>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (cartRestaurant) {
                            setRestaurantId(cartRestaurant.id);
                            setTab("home");
                          }
                        }}
                        className="h-7 text-xs text-amber-700"
                      >
                        + إضافة أصناف أخرى
                      </Button>
                    </div>

                    {minOrderAmount > 0 && (
                      <div className="space-y-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full transition-all duration-300 ${
                              cart.subtotal >= minOrderAmount
                                ? "bg-emerald-500"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${minOrderProgress}%` }}
                          />
                        </div>
                        <p className="text-[11px] font-medium text-slate-600">
                          {cart.subtotal >= minOrderAmount
                            ? "تم استيفاء الحد الأدنى للطلب ✓"
                            : `متبقي ${(minOrderAmount - cart.subtotal).toFixed(2)} ر.س للوصول للحد الأدنى (${minOrderAmount} ر.س)`}
                        </p>
                      </div>
                    )}
                  </div>

                  {!cleanCart && (
                    <div
                      role="alert"
                      className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive space-y-2"
                    >
                      <p className="font-bold">تحتوي السلة على أصناف لم تعد متاحة</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          cart.lines
                            .filter((l) => !lines.includes(l))
                            .forEach((l) => cart.remove(l.id))
                        }
                      >
                        إزالة الأصناف غير المتاحة
                      </Button>
                    </div>
                  )}

                  {/* Cart Lines */}
                  <div className="space-y-2">
                    {lines.map((l) => (
                      <div className="customer-cart-line" key={l.id}>
                        <span>
                          <strong>{l.name_ar}</strong>
                          <small>{(l.price * l.quantity).toFixed(2)} ر.س</small>
                        </span>
                        <div className="customer-quantity">
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`تقليل ${l.name_ar}`}
                            onClick={() => cart.setQty(l.id, l.quantity - 1)}
                          >
                            <Minus />
                          </Button>
                          <b>{l.quantity}</b>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`زيادة ${l.name_ar}`}
                            onClick={() => cart.setQty(l.id, l.quantity + 1)}
                          >
                            <Plus />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery GPS & Neighborhood Card */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                        <MapPin className="size-4 text-amber-500" />
                        موقع التوصيل على الخريطة (لتوجيه أقرب مندوب ضمن 10 كم)
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSheet("location")}
                        className="h-7 text-xs"
                      >
                        {deliveryLoc ? "تعديل الموقع" : "تحديد على الخريطة"}
                      </Button>
                    </div>
                    {deliveryLoc && neighborhood ? (
                      <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" />
                        الحي: {neighborhood} · الإحداثيات محددة بنجاح
                      </p>
                    ) : (
                      <p className="text-xs text-amber-700 font-medium">
                        يرجى تحديد الحي وموقع التسليم على الخريطة لإرسال الطلب للمندوب الأقرب
                      </p>
                    )}
                  </div>

                  <form className="customer-form" onSubmit={placeOrder}>
                    <label>
                      الحي السكني
                      <input
                        required
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="مثال: العزيزية، النرجس، الملقا"
                      />
                    </label>
                    <label>
                      عنوان التوصيل التفصيلي
                      <input
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="الشارع، رقم المبنى، الشقة أو المعلم البارز"
                      />
                    </label>
                    <label>
                      رقم الجوال للتواصل عند الوصول
                      <input
                        required
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="05XXXXXXXX"
                      />
                    </label>
                    <label>
                      ملاحظات للمطعم أو المندوب (اختياري)
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="مثال: بدون بصل، الاتصال عند الوصول..."
                      />
                    </label>
                    <p className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                      <span>طريقة الدفع المعتمدة</span>
                      <span>الدفع عند الاستلام (نقداً أو شبكة)</span>
                    </p>
                    <dl className="customer-bill">
                      <div>
                        <dt>قيمة الوجبات ({totalCartItems} صنف)</dt>
                        <dd>{cart.subtotal.toFixed(2)} ر.س</dd>
                      </div>
                      <div>
                        <dt>رسوم التوصيل</dt>
                        <dd>
                          {Number(cartRestaurant?.delivery_fee ?? 0) === 0
                            ? "مجاني"
                            : `${Number(cartRestaurant?.delivery_fee ?? 0).toFixed(2)} ر.س`}
                        </dd>
                      </div>
                      <div>
                        <dt>الإجمالي النهائي</dt>
                        <dd>{total.toFixed(2)} ر.س</dd>
                      </div>
                    </dl>
                    <Button disabled={busy || !cleanCart} type="submit">
                      {busy
                        ? "جارِ إرسال الطلب…"
                        : user
                          ? `تأكيد وإرسال الطلب · ${total.toFixed(2)} ر.س`
                          : "تسجيل الدخول لإتمام الطلب"}
                    </Button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* LIVE ORDERS & HISTORY TAB */}
          {tab === "radar" && (
            <div className="customer-page space-y-4">
              <h1 className="text-xl font-black">
                {ar ? "طلباتي وتتبع التوصيل الحي" : "My Orders"}
              </h1>
              {!user ? (
                <div className="customer-empty">
                  <Receipt />
                  <h2>سجّل الدخول لمتابعة طلباتك لحظياً</h2>
                  <Button onClick={() => setSheet("login")}>تسجيل الدخول</Button>
                </div>
              ) : (
                <LiveTrackingList customerOnly />
              )}
            </div>
          )}

          {/* CUSTOMER PROFILE TAB */}
          {tab === "profile" && (
            <div className="customer-page customer-profile space-y-4">
              <div className="customer-profile-top">
                <span className="customer-avatar">
                  <User />
                </span>
                <div>
                  <h1>
                    {user
                      ? profile.data?.full_name || "حسابي في FoodHub"
                      : ar
                        ? "أهلًا فيك في FoodHub"
                        : "Welcome to FoodHub"}
                  </h1>
                  {user ? (
                    <p>{profile.data?.phone || user.email}</p>
                  ) : (
                    <p>سجّل دخولك عبر رمز البريد الإلكتروني لمتابعة طلباتك</p>
                  )}
                </div>
              </div>

              {/* Prominent 4-Digit Delivery Code Card */}
              {user && profile.data?.delivery_code && (
                <div className="flex items-center justify-between rounded-2xl border border-amber-400/60 bg-amber-50 p-4 text-slate-900 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
                      <KeyRound className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black">كود تأكيد استلام طلباتك (4 أرقام)</p>
                      <p className="text-[11px] text-slate-600">
                        أعطِ هذا الكود للمندوب عند استلام الطلب فقط
                      </p>
                    </div>
                  </div>
                  <span
                    dir="ltr"
                    className="rounded-xl bg-slate-950 px-3.5 py-1.5 font-mono text-lg font-black tracking-widest text-amber-400"
                  >
                    {profile.data.delivery_code}
                  </span>
                </div>
              )}

              {profile.isError && <p role="alert">تعذر تحميل معلومات الحساب</p>}
              {!user && (
                <Button className="customer-wide" onClick={() => setSheet("login")}>
                  سجّل دخولك الآن
                </Button>
              )}
              {user && (
                <div className="customer-profile-shortcuts">
                  <Button variant="outline" onClick={() => go("radar")}>
                    <Receipt />
                    طلباتك الحية
                  </Button>
                  <Button variant="outline" onClick={() => setSheet("favorites")}>
                    <Heart />
                    مفضلتك ({favIds.length})
                  </Button>
                </div>
              )}
              <div className="customer-account-list">
                {user && (
                  <Button variant="ghost" onClick={() => setSheet("info")}>
                    <User />
                    معلوماتك الشخصية
                    <ChevronRight />
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setSheet("location")}>
                  <MapPin />
                  عنوان التوصيل المحفوظ
                  <ChevronRight />
                </Button>
                <Button variant="ghost" onClick={() => setSheet("settings")}>
                  <Settings />
                  الإعدادات واللغة
                  <ChevronRight />
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/help">
                    <HelpCircle />
                    تحتاج مساعدة؟
                    <ChevronRight />
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/privacy">
                    <ShieldCheck />
                    سياسة الخصوصية
                    <ChevronRight />
                  </Link>
                </Button>
                {user && (
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      qc.removeQueries({ queryKey: ["customer-profile"] });
                    }}
                  >
                    <LogOut />
                    تسجيل الخروج
                  </Button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* FLOATING MINI-CART BAR WHEN ITEMS ARE IN CART */}
        {lines.length > 0 && tab !== "cart" && (
          <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-md px-4">
            <button
              type="button"
              onClick={() => go("cart")}
              className="flex w-full items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-xl ring-2 ring-amber-400/50 transition-transform active:scale-98"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-xl bg-amber-400 text-xs font-black text-slate-950">
                  {totalCartItems}
                </span>
                <div className="text-start">
                  <p className="text-xs font-black">عرض السلة وإتمام الطلب</p>
                  <p className="text-[10px] text-slate-300">
                    {cartRestaurant?.name_ar}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-black text-sm text-amber-400">
                <span>{total.toFixed(2)} ر.س</span>
                <ChevronLeft className="size-4" />
              </div>
            </button>
          </div>
        )}

        <nav
          className="fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-[680px] grid-cols-4 gap-1 border-t bg-card/95 px-2 pt-1.5 pb-[calc(0.45rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur"
          aria-label="تنقل تطبيق العميل"
        >
          {[
            { id: "home" as Tab, label: ar ? "الرئيسية" : "Home", icon: Home, badge: null as number | null },
            {
              id: "cart" as Tab,
              label: ar ? "السلة" : "Cart",
              icon: ShoppingBag,
              badge: lines.length > 0 ? lines.reduce((v, l) => v + l.quantity, 0) : null,
            },
            { id: "radar" as Tab, label: ar ? "طلباتي" : "Orders", icon: Receipt, badge: null as number | null },
            { id: "profile" as Tab, label: ar ? "حسابي" : "Account", icon: User, badge: null as number | null },
          ].map((n) => {
            const isActive =
              (tab === n.id || (n.id === "home" && tab === "kitchens")) && !selected;
            return (
              <button
                key={n.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => go(n.id)}
                className={`group relative flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 transition-all select-none ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 h-1 w-8 rounded-full bg-primary" />
                )}
                <div
                  className={`relative flex h-8 w-12 items-center justify-center rounded-2xl transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs scale-105"
                      : "bg-transparent group-hover:bg-muted"
                  }`}
                >
                  <n.icon className="size-4.5 stroke-[2.2]" />
                  {n.badge !== null && n.badge > 0 && (
                    <span
                      className={`absolute -top-1.5 -left-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black shadow-xs ${
                        isActive
                          ? "bg-foreground text-background"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {n.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`max-w-full truncate text-[11px] leading-tight ${
                    isActive ? "font-extrabold text-foreground" : "font-medium"
                  }`}
                >
                  {n.label}
                </span>
              </button>
            );
          })}
        </nav>

        <Dialog.Root
          open={!!sheet || !!meal}
          onOpenChange={(v) => {
            if (!v) {
              setSheet(null);
              setMeal(null);
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="customer-sheet-overlay" />
            <Dialog.Content
              className="foodhub-customer customer-sheet"
              dir={ar ? "rtl" : "ltr"}
              aria-describedby={undefined}
            >
              <span className="customer-sheet-handle" />
              <Dialog.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="إغلاق"
                  className="customer-sheet-close"
                >
                  <X />
                </Button>
              </Dialog.Close>
              <Dialog.Title className="customer-sheet-title">
                {meal
                  ? meal.name_ar
                  : {
                      location: "عنوان وموقع التوصيل",
                      login: "تسجيل الدخول",
                      info: "معلوماتك الشخصية",
                      settings: "الإعدادات",
                      favorites: `وجباتك المفضلة (${favoriteMeals.length})`,
                    }[sheet ?? "location"]}
              </Dialog.Title>

              {meal && (
                <>
                  {meal.image_url && (
                    <img
                      className="customer-sheet-food"
                      src={meal.image_url}
                      alt={meal.name_ar}
                    />
                  )}
                  <div className="flex items-center justify-between">
                    <strong>{Number(meal.price).toFixed(2)} ر.س</strong>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFav(meal.id)}
                      className="gap-1.5 text-xs"
                    >
                      <Heart
                        className={`size-4 ${
                          favIds.includes(meal.id)
                            ? "fill-rose-500 text-rose-500"
                            : ""
                        }`}
                      />
                      {favIds.includes(meal.id) ? "في المفضلة" : "أضف للمفضلة"}
                    </Button>
                  </div>
                  <p>{meal.description_ar}</p>
                  <div className="customer-quantity">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={qty === 1}
                      onClick={() => setQty((q) => q - 1)}
                      aria-label="تقليل الكمية"
                    >
                      <Minus />
                    </Button>
                    <b>{qty}</b>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQty((q) => q + 1)}
                      aria-label="زيادة الكمية"
                    >
                      <Plus />
                    </Button>
                  </div>
                  <Button
                    onClick={() => {
                      add(meal, qty);
                      setMeal(null);
                    }}
                  >
                    إضافة للسلة · {(Number(meal.price) * qty).toFixed(2)} ر.س
                  </Button>
                </>
              )}

              {sheet === "location" && (
                <form
                  className="customer-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    try {
                      localStorage.setItem(
                        "foodhub_customer_address",
                        JSON.stringify({
                          address,
                          neighborhood,
                          loc: deliveryLoc,
                        }),
                      );
                    } catch {
                      /* ignore */
                    }
                    setSheet(null);
                    toast.success("تم حفظ موقع وعنوان التوصيل ✓");
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      حدد موقعك ليصلك المندوب المتواجد في نطاق 10 كم
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={detectCustomerGps}
                      className="h-8 gap-1 text-xs"
                    >
                      <Navigation className="size-3.5 text-amber-600" />
                      موقعي عبر GPS
                    </Button>
                  </div>
                  <label>
                    الحي السكني
                    <input
                      required
                      minLength={2}
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="مثال: العزيزية"
                    />
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {POPULAR_NEIGHBORHOODS.map((nb) => (
                      <button
                        key={nb}
                        type="button"
                        onClick={() => setNeighborhood(nb)}
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                          neighborhood === nb
                            ? "border-amber-500 bg-amber-500/20 font-bold text-slate-900"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {nb}
                      </button>
                    ))}
                  </div>
                  <label>
                    العنوان التفصيلي
                    <input
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="الشارع، رقم المبنى، الدور"
                    />
                  </label>
                  <Suspense fallback={<p>جارِ تحميل الخريطة…</p>}>
                    <LocationPicker
                      value={deliveryLoc}
                      onChange={setDeliveryLoc}
                    />
                  </Suspense>
                  <Button type="submit" disabled={!deliveryLoc}>
                    تأكيد وحفظ العنوان
                  </Button>
                </form>
              )}

              {sheet === "login" && (
                <div className="mx-auto w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
                  <div className="mb-6 flex flex-col items-center gap-2 text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                      <User className="size-7" />
                    </div>
                    <h2 className="text-xl font-bold">FoodHub</h2>
                    <p className="text-sm text-muted-foreground">تسجيل دخول العميل</p>
                  </div>
                  <PhoneLogin onComplete={() => setSheet(null)} />
                </div>
              )}

              {sheet === "info" && (
                <form className="customer-form" onSubmit={save}>
                  <label>
                    الاسم الكامل
                    <input
                      required
                      maxLength={30}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label>
                    رقم الجوال
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </label>
                  <label>
                    البريد الإلكتروني
                    <input readOnly value={user?.email ?? ""} />
                  </label>
                  <Button disabled={busy} type="submit">
                    حفظ التغييرات
                  </Button>
                </form>
              )}

              {sheet === "settings" && (
                <div className="customer-setting-row">
                  <Globe />
                  <strong>اللغة</strong>
                  <Button
                    variant="outline"
                    onClick={() => setLang(ar ? "en" : "ar")}
                  >
                    {ar ? "English" : "العربية"}
                  </Button>
                </div>
              )}

              {sheet === "favorites" && (
                <div className="space-y-2.5 max-h-96 overflow-y-auto">
                  {favoriteMeals.length === 0 ? (
                    <div className="customer-empty">
                      <Heart />
                      <p>لا توجد وجبات مفضلة محفوظة بعد</p>
                      <Button
                        onClick={() => {
                          setSheet(null);
                          go("home");
                        }}
                      >
                        تصفح الوجبات
                      </Button>
                    </div>
                  ) : (
                    favoriteMeals.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm truncate">{m.name_ar}</p>
                          <p className="text-xs font-black text-amber-600">
                            {Number(m.price).toFixed(2)} ر.س
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => {
                              add(m);
                              setSheet(null);
                            }}
                          >
                            + للسلة
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => toggleFav(m.id)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}
