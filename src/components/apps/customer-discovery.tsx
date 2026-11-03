import { useState, useMemo, useEffect } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Store,
  UtensilsCrossed,
  X,
  Star,
  Flame,
  Zap,
  Sparkles,
  Clock,
  Bike,
  SlidersHorizontal,
  BadgePercent,
  Check,
  ShoppingBag,
  ShoppingCart,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logoRomansiah from "@/assets/restaurant-alromansiah.png.asset.json";
import logoShawarmaHouse from "@/assets/restaurant-shawarma-house.png.asset.json";
import logoKfc from "@/assets/restaurant-kfc.png.asset.json";
import logoMcdonalds from "@/assets/restaurant-mcdonalds.png.asset.json";
import type { CatalogMeal, CatalogRestaurant } from "@/lib/customer-catalog";
import {
  FOODHUB_MARKET_STORE,
  FOODHUB_MARKET_CATEGORIES,
  FOODHUB_MARKET_PRODUCTS,
} from "@/lib/foodhub-market";

interface Props {
  ar: boolean;
  categories: string[];
  category: string;
  onCategory: (id: string) => void;
  search: string;
  onSearch: (value: string) => void;
  meals: CatalogMeal[];
  restaurants: CatalogRestaurant[];
  onRestaurant: (restaurant: CatalogRestaurant) => void;
  onMeal: (meal: CatalogMeal) => void;
  onAdd: (meal: CatalogMeal) => void;
  onBrowse: () => void;
  directory?: boolean;
  loading?: boolean;
  error?: boolean;
  onRetry: () => void;
}

const showcaseRestaurants = [
  {
    id: "alromansiah",
    nameAr: "الرومانسية",
    nameEn: "Al Romansiah",
    cuisineAr: "أطباق سعودية ومندي",
    cuisineEn: "Saudi & Mandi",
    logo: logoRomansiah,
    rating: "4.9",
    eta: "25-35",
    fee: "مجاني",
    cover:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "shawarma-house",
    nameAr: "بيت الشاورما",
    nameEn: "Shawarma House",
    cuisineAr: "شاورما ومشاوي وفلافل",
    cuisineEn: "Shawarma & Grills",
    logo: logoShawarmaHouse,
    rating: "4.8",
    eta: "20-30",
    fee: "مجاني",
    cover:
      "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "kfc",
    nameAr: "كنتاكي",
    nameEn: "KFC",
    cuisineAr: "دجاج مقلي وساندوتشات",
    cuisineEn: "Fried Chicken & Fast Food",
    logo: logoKfc,
    rating: "4.7",
    eta: "30-40",
    fee: "5.00 ر.س",
    cover:
      "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "mcdonalds",
    nameAr: "ماكدونالدز",
    nameEn: "McDonald's",
    cuisineAr: "برجر ووجبات سريعة",
    cuisineEn: "Burgers & Fries",
    logo: logoMcdonalds,
    rating: "4.8",
    eta: "20-30",
    fee: "مجاني",
    cover:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80",
  },
];

const promoBanners = [
  {
    id: 0,
    titleAr: "FoodHub Market · التوصيل فى 15 دقيقة ⚡",
    titleEn: "FoodHub Market · 15-Minute Delivery ⚡",
    descAr: "شعارنا التوصيل فى 15 دقيقة — مقاضي بيتك والبقالة السريعة لبابك فوراً",
    descEn: "Our Slogan: 15-Min Delivery — Fresh grocery & essentials to your door",
    badgeAr: "شعارنا التوصيل فى 15 دقيقة ⚡",
    badgeEn: "15-Min Delivery ⚡",
    gradient: "from-emerald-600 via-teal-700 to-amber-600",
    image:
      "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80",
    isMarket: true,
  },
  {
    id: 1,
    titleAr: "خصم 30% على وجبتك الأولى 🔥",
    titleEn: "30% OFF Your First Order 🔥",
    descAr: "استخدم كود FIRST30 واستمتع بأشهى أطباق اليوم",
    descEn: "Use code FIRST30 on top rated restaurants",
    badgeAr: "عرض حصري",
    badgeEn: "Exclusive",
    gradient: "from-amber-500 via-orange-500 to-amber-600",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    titleAr: "توصيل مجاني لجميع الطلبات 🛵",
    titleEn: "Free Delivery On All Orders 🛵",
    descAr: "اطلب الآن من مطاعمك المفضلة بدون رسوم توصيل",
    descEn: "Order now from top kitchens with zero delivery fee",
    badgeAr: "لفترة محدودة",
    badgeEn: "Limited Time",
    gradient: "from-emerald-600 via-teal-600 to-emerald-700",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    titleAr: "وجبات عائلية ولمّة الأحباب 👨‍👩‍👧‍👦",
    titleEn: "Family Feasts & Special Combos 👨‍👩‍👧‍👦",
    descAr: "أشهى المشاوي والوجبات المتنوعة تكفي الجميع",
    descEn: "Delicious sharing platters for the whole family",
    badgeAr: "توفير حتى 40%",
    badgeEn: "Save up to 40%",
    gradient: "from-rose-600 via-pink-600 to-rose-700",
    image:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80",
  },
];

const visualCategories = [
  { id: "all", nameAr: "الكل", nameEn: "All", emoji: "🍽️" },
  { id: "برجر", nameAr: "برجر", nameEn: "Burgers", emoji: "🍔" },
  { id: "بيتزا", nameAr: "بيتزا", nameEn: "Pizza", emoji: "🍕" },
  { id: "شاورما", nameAr: "شاورما", nameEn: "Shawarma", emoji: "🌯" },
  { id: "دجاج", nameAr: "دجاج", nameEn: "Chicken", emoji: "🍗" },
  { id: "مشاوي", nameAr: "مشاوي", nameEn: "Grills", emoji: "🥩" },
  { id: "حلويات", nameAr: "حلويات", nameEn: "Desserts", emoji: "🍰" },
  { id: "مشروبات", nameAr: "مشروبات", nameEn: "Drinks", emoji: "☕" },
  { id: "صحي", nameAr: "صحي", nameEn: "Healthy", emoji: "🥗" },
];

function getMealImage(meal: CatalogMeal): string {
  if (
    meal.image_url &&
    !meal.image_url.includes("logo") &&
    !meal.image_url.includes("placeholder") &&
    !meal.image_url.includes(".svg")
  ) {
    return meal.image_url;
  }
  const name = `${meal.name_ar} ${meal.name_en || ""} ${meal.category_ar || ""}`.toLowerCase();
  if (name.includes("برجر") || name.includes("burger"))
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80";
  if (name.includes("بيتزا") || name.includes("pizza"))
    return "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80";
  if (name.includes("شاورما") || name.includes("shawarma"))
    return "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&auto=format&fit=crop&q=80";
  if (name.includes("دجاج") || name.includes("بروستد") || name.includes("chicken"))
    return "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80";
  if (name.includes("حلى") || name.includes("كيك") || name.includes("sweet") || name.includes("dessert"))
    return "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80";
  if (name.includes("قهوة") || name.includes("عصير") || name.includes("drink") || name.includes("coffee"))
    return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80";
  if (name.includes("مشاوي") || name.includes("مندي") || name.includes("لحم"))
    return "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80";
  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80";
}

function getRestaurantCover(r: CatalogRestaurant): string {
  if (r.image_url && !r.image_url.includes("logo") && !r.image_url.includes(".svg")) {
    return r.image_url;
  }
  const name = `${r.name_ar} ${r.name_en || ""} ${r.cuisine_ar || ""}`.toLowerCase();
  if (name.includes("برجر"))
    return "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80";
  if (name.includes("بيتزا"))
    return "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80";
  if (name.includes("شاورما"))
    return "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&auto=format&fit=crop&q=80";
  return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80";
}

export function CustomerDiscovery(p: Props) {
  const [slide, setSlide] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [serviceMode, setServiceMode] = useState<"food" | "market">("food");
  const [marketCategory, setMarketCategory] = useState<string>("all");

  // Auto rotate banner carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((prev) => (prev + 1) % promoBanners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const currentBanner = promoBanners[slide % promoBanners.length]!;

  const marketProducts = useMemo(() => {
    const selectedAisle = FOODHUB_MARKET_CATEGORIES.find((c) => c.id === marketCategory);
    return FOODHUB_MARKET_PRODUCTS.filter((m) => {
      const matchCat =
        marketCategory === "all" ||
        (selectedAisle && m.category_ar === selectedAisle.nameAr) ||
        (selectedAisle && m.category_en?.toLowerCase() === selectedAisle.nameEn.toLowerCase());
      const matchSearch =
        !p.search ||
        `${m.name_ar} ${m.name_en || ""} ${m.description_ar || ""}`
          .toLowerCase()
          .includes(p.search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [marketCategory, p.search]);

  // Match category filters with existing categories
  const categoriesList = useMemo(() => {
    const set = new Set(["all", ...p.categories]);
    visualCategories.forEach((vc) => set.add(vc.id));
    return Array.from(set).map((id) => {
      const match = visualCategories.find((v) => v.id === id);
      return {
        id,
        nameAr: match ? match.nameAr : id,
        nameEn: match ? match.nameEn : id,
        emoji: match ? match.emoji : "🍴",
      };
    });
  }, [p.categories]);

  const restaurants = useMemo(() => {
    const base = p.restaurants.filter(
      (r) =>
        (!p.search || `${r.name_ar} ${r.name_en}`.toLowerCase().includes(p.search.toLowerCase())) &&
        (p.category === "all" || p.meals.some((m) => m.restaurant_id === r.id)) &&
        (activeFilter !== "free" || Number(r.delivery_fee) === 0),
    );
    if (activeFilter === "fast") {
      return [...base].sort((a, b) => Number(a.eta_minutes || 25) - Number(b.eta_minutes || 25));
    }
    return base;
  }, [p.restaurants, p.search, p.category, p.meals, activeFilter]);

  const displayedMeals = useMemo(() => {
    const restMap = new Map(p.restaurants.map((r) => [r.id, r]));
    let list = p.meals;
    if (activeFilter === "free") {
      list = list.filter((m) => {
        const r = restMap.get(m.restaurant_id);
        return !r || Number(r.delivery_fee) === 0;
      });
    } else if (activeFilter === "fast") {
      list = [...list].sort((a, b) => {
        const etaA = Number(restMap.get(a.restaurant_id)?.eta_minutes || 25);
        const etaB = Number(restMap.get(b.restaurant_id)?.eta_minutes || 25);
        return etaA - etaB;
      });
    } else if (activeFilter === "popular") {
      list = [...list].sort((a, b) => Number(Boolean(b.image_url)) - Number(Boolean(a.image_url)));
    }
    return list;
  }, [p.meals, p.restaurants, activeFilter]);

  return (
    <div className="customer-discovery pb-8">
      {/* 0. Top Service Switcher (Restaurants vs. FoodHub Market) */}
      <div className="px-4 pt-2 pb-1.5">
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 shadow-xs">
          <button
            type="button"
            onClick={() => setServiceMode("food")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all ${
              serviceMode === "food"
                ? "bg-white text-slate-900 shadow-sm shadow-slate-200/80"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 text-amber-500" />
            <span>{p.ar ? "المطاعم والمطابخ" : "Restaurants"}</span>
          </button>
          <button
            type="button"
            onClick={() => setServiceMode("market")}
            className={`relative flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all ${
              serviceMode === "market"
                ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm shadow-emerald-600/30 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>FoodHub Market</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black">
              15 د ⚡
            </span>
          </button>
        </div>
      </div>

      {/* 1. Global-Style Search Input */}
      <div className="px-4 pt-1 pb-3">
        <div className="relative flex items-center bg-slate-50 border border-slate-200/90 rounded-2xl shadow-sm hover:border-amber-400 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all duration-200">
          <div className="p-3.5 text-amber-500 flex items-center justify-center">
            <Search className="w-5 h-5 stroke-[2.2]" />
          </div>
          <input
            aria-label={p.ar ? "البحث عن مطعم أو وجبة" : "Search restaurants or meals"}
            placeholder={
              serviceMode === "market"
                ? p.ar
                  ? "ابحث في فود هب ماركت (حليب، بيض، خضار، مقاضي...)"
                  : "Search Market (milk, eggs, fruits, pantry...)"
                : p.ar
                ? "ابحث عن مطعم، وجبة، أو نوع طعام..."
                : "Search restaurants, dishes, cuisines..."
            }
            value={p.search}
            onChange={(e) => p.onSearch(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none pr-1 pl-3"
          />
          {p.search ? (
            <button
              type="button"
              aria-label="مسح البحث"
              onClick={() => p.onSearch("")}
              className="p-2.5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="pl-3 pr-2 text-slate-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2.5 pb-1">
          {[
            { id: "all", labelAr: "الكل", labelEn: "All", icon: Sparkles },
            { id: "market", labelAr: "⚡ فود هب ماركت (15 دقيقة)", labelEn: "⚡ Market (15m)", icon: Zap },
            { id: "popular", labelAr: "الأكثر طلباً", labelEn: "Popular", icon: Flame },
            { id: "fast", labelAr: "أسرع توصيل", labelEn: "Fastest", icon: Clock },
            { id: "free", labelAr: "توصيل مجاني", labelEn: "Free Delivery", icon: Bike },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                if (f.id === "market") {
                  setServiceMode("market");
                } else {
                  if (serviceMode === "market") setServiceMode("food");
                  setActiveFilter(f.id);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                f.id === "market" && serviceMode === "market"
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-bold"
                  : activeFilter === f.id && serviceMode !== "market"
                  ? "bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30 font-bold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 border border-slate-200/60"
              }`}
            >
              <f.icon className="w-3.5 h-3.5" />
              <span>{p.ar ? f.labelAr : f.labelEn}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. High-Impact Promo Banner Carousel */}
      {!p.directory && !p.search && (
        <div className="px-4 mb-5">
          <div
            className={`relative w-full rounded-3xl p-5 text-white overflow-hidden shadow-lg bg-gradient-to-r ${currentBanner.gradient} transition-all duration-500`}
          >
            {/* Background Decorative Blur & Food Image */}
            <div className="absolute top-0 left-0 w-44 h-full pointer-events-none opacity-90 overflow-hidden">
              <img
                src={currentBanner.image}
                alt="Banner Dish"
                className="w-full h-full object-cover rounded-r-3xl mask-radial"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
            </div>

            {/* Banner Text Content */}
            <div className="relative z-10 max-w-[65%] text-start">
              <span className="inline-block px-2.5 py-1 mb-2 text-[11px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md rounded-lg shadow-sm border border-white/20">
                {p.ar ? currentBanner.badgeAr : currentBanner.badgeEn}
              </span>
              <h2 className="text-lg sm:text-xl font-black leading-tight drop-shadow-sm mb-1">
                {p.ar ? currentBanner.titleAr : currentBanner.titleEn}
              </h2>
              <p className="text-xs text-white/90 font-medium leading-relaxed mb-3">
                {p.ar ? currentBanner.descAr : currentBanner.descEn}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (currentBanner.isMarket) {
                    setServiceMode("market");
                  } else {
                    p.onBrowse();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950 text-white rounded-xl text-xs font-bold shadow-md hover:bg-slate-900 transition-transform active:scale-95"
              >
                <span>
                  {currentBanner.isMarket
                    ? p.ar
                      ? "تسوق في الماركت ⚡"
                      : "Shop Market ⚡"
                    : p.ar
                    ? "تصفح المطاعم"
                    : "Explore Now"}
                </span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Banner Carousel Dots */}
            <div className="absolute bottom-3 left-4 z-20 flex items-center gap-1.5">
              {promoBanners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    slide === i ? "w-6 bg-white" : "w-1.5 bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {serviceMode === "market" ? (
        <div className="px-4 space-y-6">
          {/* Market Hero Slogan Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-5 text-white shadow-xl border border-emerald-500/20">
            <div className="relative z-10 text-start">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-md mb-2">
                <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                <span>{p.ar ? "شعارنا التوصيل فى 15 دقيقة ⚡" : "Our Slogan: 15-Minute Delivery ⚡"}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
                FoodHub Market | فود هب ماركت
              </h2>
              <p className="text-xs text-emerald-100 font-medium leading-relaxed max-w-sm mb-3">
                {p.ar
                  ? "مقاضي بيتك والبقالة السريعة مختارة طازجة وتصلك فوراً إلى باب بيتك خلال 15 دقيقة فقط!"
                  : "Your daily grocery & household essentials delivered fresh to your door in 15 minutes flat!"}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-md text-white border border-white/20">
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  <span>توصيل فوري 15 د</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-md text-white border border-white/20">
                  <Bike className="w-3.5 h-3.5 text-emerald-300" />
                  <span>توصيل مجاني 0 ر.س</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-md text-white border border-white/20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-300" />
                  <span>طازج ومضمون 100%</span>
                </span>
              </div>
            </div>

            {/* Background glowing glow */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
          </div>

          {/* Market Aisles / Categories */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{p.ar ? "أقسام فود هب ماركت" : "Market Aisles"}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {FOODHUB_MARKET_CATEGORIES.length} أقسام
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
              {FOODHUB_MARKET_CATEGORIES.map((mc) => {
                const isSelected = marketCategory === mc.id;
                return (
                  <button
                    key={mc.id}
                    type="button"
                    onClick={() => setMarketCategory(mc.id)}
                    className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none transition-all"
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-200 shadow-sm ${
                        isSelected
                          ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white ring-4 ring-emerald-500/25 scale-105 shadow-md shadow-emerald-600/30"
                          : "bg-white border border-slate-200/90 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40"
                      }`}
                    >
                      {mc.emoji}
                    </div>
                    <span
                      className={`text-xs font-semibold tracking-tight transition-colors text-center max-w-[70px] truncate ${
                        isSelected ? "text-emerald-700 font-black" : "text-slate-600 group-hover:text-slate-900"
                      }`}
                    >
                      {p.ar ? mc.nameAr : mc.nameEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Market Products Grid */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>{p.ar ? "منتجات ومقاضي الماركت" : "Market Essentials"}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    {marketProducts.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  {p.ar
                    ? "شعارنا التوصيل فى 15 دقيقة ⚡ أسعار سوبرماركت رسمية"
                    : "Our Slogan: 15-Minute Delivery ⚡ Official Supermarket Prices"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => p.onRestaurant(FOODHUB_MARKET_STORE)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>{p.ar ? "زيارة المتجر الكامل" : "Visit Full Store"}</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {marketProducts.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">
                  {p.ar ? "لا توجد منتجات مطابقة في هذا القسم" : "No products found in this aisle"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
                {marketProducts.map((m) => (
                  <article
                    key={m.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between p-2.5 group"
                  >
                    <div>
                      {/* Product Image with 15-min Badge */}
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 mb-2.5">
                        <img
                          loading="lazy"
                          src={m.image_url || getMealImage(m)}
                          alt={m.name_ar}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* 15 Min Badge */}
                        <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-md">
                          <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                          <span>15 د</span>
                        </span>

                        {/* Floating Quick Add Button */}
                        <button
                          type="button"
                          aria-label={`إضافة ${m.name_ar} للسلة`}
                          onClick={() => p.onAdd(m)}
                          className="absolute bottom-2 left-2 w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 flex items-center justify-center transition-transform active:scale-90"
                        >
                          <Plus className="w-5 h-5 stroke-[2.8]" />
                        </button>
                      </div>

                      {/* Market Badge */}
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1.5 truncate max-w-full">
                        <Zap className="w-2.5 h-2.5 text-amber-500" />
                        <span>FoodHub Market · 15 د</span>
                      </div>

                      {/* Product Title */}
                      <button
                        type="button"
                        onClick={() => p.onMeal(m)}
                        className="text-start font-bold text-sm text-slate-900 leading-snug line-clamp-1 group-hover:text-emerald-700 transition-colors w-full"
                      >
                        {p.ar ? m.name_ar : m.name_en || m.name_ar}
                      </button>

                      {/* Product Category / Description */}
                      <p className="text-[11px] text-slate-400 font-medium line-clamp-1 mt-0.5 text-start">
                        {m.description_ar || m.category_ar}
                      </p>
                    </div>

                    {/* Price Tag */}
                    <div className="pt-2 mt-2 border-t border-slate-50 flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-black text-slate-900">
                          {Number(m.price).toFixed(2)}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700">
                          {p.ar ? "ر.س" : "SAR"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => p.onMeal(m)}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                      >
                        {p.ar ? "التفاصيل" : "Details"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
      {/* 3. Visual Categories (Horizontal Story Bubbles) */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{p.ar ? "التصنيفات" : "Categories"}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
              {categoriesList.length}
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          {categoriesList.map((c) => {
            const isSelected = p.category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => p.onCategory(c.id)}
                className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-200 shadow-sm ${
                    isSelected
                      ? "bg-amber-500 text-slate-950 ring-4 ring-amber-500/25 scale-105 shadow-md shadow-amber-500/20 font-bold"
                      : "bg-white border border-slate-200/90 text-slate-700 hover:border-amber-300 hover:bg-amber-50/50"
                  }`}
                >
                  {c.emoji}
                </div>
                <span
                  className={`text-xs font-semibold tracking-tight transition-colors ${
                    isSelected ? "text-amber-600 font-black" : "text-slate-600 group-hover:text-slate-900"
                  }`}
                >
                  {p.ar ? c.nameAr : c.nameEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Showcase Top Partner Brands */}
      {!p.directory && !p.search && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                {p.ar ? "أشهر المطاعم والمطابخ" : "Top Featured Kitchens"}
              </h2>
              <p className="text-xs text-slate-500">
                {p.ar ? "ماركات عالمية ومحلية موثوقة" : "Top rated global and local brands"}
              </p>
            </div>
            <button
              type="button"
              onClick={p.onBrowse}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <span>{p.ar ? "عرض الكل" : "See all"}</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
            {showcaseRestaurants.map((sr) => (
              <div
                key={sr.id}
                className="w-56 shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer group"
                onClick={() => {
                  const match = p.restaurants.find(
                    (r) =>
                      r.name_ar.includes(sr.nameAr) ||
                      (r.name_en && r.name_en.toLowerCase().includes(sr.nameEn.toLowerCase())),
                  );
                  if (match) p.onRestaurant(match);
                  else p.onBrowse();
                }}
              >
                <div className="h-28 w-full relative overflow-hidden bg-slate-100">
                  <img
                    src={sr.cover}
                    alt={sr.nameAr}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2.5 right-2.5 bg-slate-950/75 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{sr.rating}</span>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {sr.fee}
                  </div>
                </div>

                <div className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-white shadow-xs p-1">
                    <img
                      src={sr.logo.url}
                      alt={sr.nameAr}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-start">
                    <h3 className="font-bold text-sm text-slate-900 truncate">
                      {p.ar ? sr.nameAr : sr.nameEn}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate">
                      {p.ar ? sr.cuisineAr : sr.cuisineEn}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-medium">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {sr.eta} د
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Main Meals Section - 2-Column Responsive Card Grid */}
      <div className="px-4">
        {p.loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold">
              {p.ar ? "جارِ تحضير قوائم الطعام..." : "Loading delicious menus..."}
            </p>
          </div>
        ) : p.error ? (
          <div className="py-12 px-4 text-center bg-red-50 rounded-2xl border border-red-100 my-4">
            <p className="text-red-700 font-bold mb-3">
              {p.ar ? "تعذر تحميل قائمة الوجبات" : "Failed to load menus"}
            </p>
            <Button variant="outline" onClick={p.onRetry} className="bg-white">
              {p.ar ? "إعادة المحاولة" : "Try again"}
            </Button>
          </div>
        ) : (
          <>
            {!p.directory && (
              <>
                <div className="flex items-center justify-between mb-3.5">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span>{p.ar ? "الوجبات الأكثر طلباً" : "Popular Dishes"}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        {displayedMeals.length}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      {p.ar ? "أشهى المأكولات المحضرة طازجة لك" : "Freshly prepared for you"}
                    </p>
                  </div>
                </div>

                {displayedMeals.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <UtensilsCrossed className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-600">
                      {p.ar ? "لا توجد وجبات متاحة حالياً" : "No meals found in this category"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {p.ar ? "جرب اختيار تصنيف آخر أو مسح البحث" : "Try clearing filters"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
                    {displayedMeals.map((m) => {
                      const mealImg = getMealImage(m);
                      const rest = p.restaurants.find((r) => r.id === m.restaurant_id);
                      return (
                        <article
                          key={m.id}
                          className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between p-2.5 group"
                        >
                          <div>
                            {/* Meal Image with Badges */}
                            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 mb-2.5">
                              <img
                                loading="lazy"
                                src={mealImg}
                                alt={m.name_ar}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />

                              {/* Popular Tag */}
                              <span className="absolute top-2 right-2 bg-slate-950/75 backdrop-blur-md text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span>{p.ar ? "مميز" : "Popular"}</span>
                              </span>

                              {/* Floating Quick Add Button */}
                              <button
                                type="button"
                                aria-label={`إضافة ${m.name_ar} للسلة`}
                                onClick={() => p.onAdd(m)}
                                className="absolute bottom-2 left-2 w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30 flex items-center justify-center transition-transform active:scale-90"
                              >
                                <Plus className="w-5 h-5 stroke-[2.8]" />
                              </button>
                            </div>

                            {/* Restaurant Tag Chip */}
                            {rest && (
                              <button
                                type="button"
                                onClick={() => p.onRestaurant(rest)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md mb-1.5 transition-colors truncate max-w-full"
                              >
                                <Store className="w-3 h-3 shrink-0" />
                                <span className="truncate">{rest.name_ar}</span>
                                <ChevronLeft className="w-2.5 h-2.5 shrink-0" />
                              </button>
                            )}

                            {/* Meal Title */}
                            <button
                              type="button"
                              onClick={() => p.onMeal(m)}
                              className="text-start font-bold text-sm text-slate-900 leading-snug line-clamp-1 group-hover:text-amber-600 transition-colors w-full"
                            >
                              {p.ar ? m.name_ar : m.name_en || m.name_ar}
                            </button>

                            {/* Meal Category / Ingredients */}
                            <p className="text-[11px] text-slate-400 font-medium line-clamp-1 mt-0.5 text-start">
                              {m.description_ar || m.category_ar || (p.ar ? "طازج ولذيذ" : "Fresh")}
                            </p>
                          </div>

                          {/* Price Tag */}
                          <div className="pt-2 mt-2 border-t border-slate-50 flex items-baseline justify-between">
                            <div className="flex items-baseline gap-1">
                              <span className="text-base font-black text-slate-900">
                                {Number(m.price).toFixed(2)}
                              </span>
                              <span className="text-[10px] font-bold text-amber-600">
                                {p.ar ? "ر.س" : "SAR"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => p.onMeal(m)}
                              className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                            >
                              {p.ar ? "التفاصيل" : "Details"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* 6. Active Restaurants Strip / List */}
            <div className="mt-8 mb-4">
              <div className="flex items-center justify-between mb-3.5">
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    {p.ar ? "المطاعم والمطابخ المعتمدة" : "Active Restaurants"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {p.ar ? "متاحة للتوصيل المباشر لمنطقتك" : "Available for direct delivery"}
                  </p>
                </div>
                {!p.directory && (
                  <button
                    type="button"
                    onClick={p.onBrowse}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    <span>{p.ar ? "عرض الكل" : "View all"}</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className={p.directory ? "grid gap-3.5" : "flex gap-3 overflow-x-auto no-scrollbar py-1"}>
                {restaurants.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center w-full">
                    {p.ar ? "لا توجد مطابخ أخرى متوفرة حالياً" : "No other restaurants available"}
                  </p>
                ) : (
                  restaurants.map((r) => {
                    const coverImg = getRestaurantCover(r);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => p.onRestaurant(r)}
                        className={`bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden text-start group flex flex-col ${
                          p.directory ? "w-full" : "w-64 shrink-0"
                        }`}
                      >
                        <div className="h-32 w-full relative overflow-hidden bg-slate-100">
                          <img
                            loading="lazy"
                            src={coverImg}
                            alt={r.name_ar}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2.5 right-2.5 bg-slate-950/80 backdrop-blur-md text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span>4.8</span>
                          </div>
                          <div className="absolute bottom-2.5 left-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                            {Number(r.delivery_fee) === 0
                              ? p.ar
                                ? "توصيل مجاني"
                                : "Free Delivery"
                              : `${Number(r.delivery_fee).toFixed(2)} ${p.ar ? "ر.س توصيل" : "SAR"}`}
                          </div>
                        </div>

                        <div className="p-3.5 flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center shrink-0 text-amber-600 shadow-xs">
                            <Store className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-sm text-slate-900 group-hover:text-amber-600 transition-colors truncate">
                              {p.ar ? r.name_ar : r.name_en || r.name_ar}
                            </h3>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {r.cuisine_ar || (p.ar ? "وجبات سريعة وأطباق طازجة" : "Fast food & dishes")}
                            </p>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2 font-medium">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{r.eta_minutes || 25} دقيقة</span>
                              </span>
                              <span>•</span>
                              <span>حد أدنى {r.min_order || 20} ر.س</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
        </>
      )}
    </div>
  );
}
