import type { Tables } from "@/integrations/supabase/types";

export type CatalogRestaurant = Tables<"restaurants">;
export type CatalogMeal = Tables<"menu_items">;

// Exact fixtures from the initial seed migration, not business accounts.
const seedRestaurants = new Map([
  ["11111111-1111-1111-1111-111111111111", "برجر هاوس"],
  ["22222222-2222-2222-2222-222222222222", "شاورما الشام"],
  ["33333333-3333-3333-3333-333333333333", "بيتزا روما"],
  ["44444444-4444-4444-4444-444444444444", "سوشي تايم"],
  ["55555555-5555-5555-5555-555555555555", "كافيه لاتيه"],
  ["66666666-6666-6666-6666-666666666666", "مندي الأصايل"],
]);

export function customerCatalog(restaurants: CatalogRestaurant[], items: CatalogMeal[]) {
  const realRestaurants = restaurants.filter(
    (r) => r.is_active && !(r.owner_id === null && seedRestaurants.get(r.id) === r.name_ar),
  );
  const ids = new Set(realRestaurants.map((r) => r.id));
  return {
    restaurants: realRestaurants,
    meals: items.filter((m) => m.is_available && ids.has(m.restaurant_id)),
  };
}

export function catalogCategories(meals: CatalogMeal[]) {
  return [...new Set(meals.map((m) => m.category_ar).filter(Boolean))];
}

export function validCatalogCart(
  lines: { id: string; restaurant_id: string; price: number }[],
  meals: CatalogMeal[],
) {
  return lines.every((l) =>
    meals.some(
      (m) =>
        m.id === l.id &&
        m.restaurant_id === l.restaurant_id &&
        Number(m.price) === l.price &&
        m.is_available,
    ),
  );
}

export interface CategoryVisual {
  id: string;
  nameAr: string;
  nameEn: string;
  emoji: string;
  bgGradient: string;
  textColor: string;
  badgeBg: string;
}

export function getCategoryVisual(name: string): CategoryVisual {
  const norm = (name || "").toLowerCase().trim();

  if (norm === "all" || norm === "الكل") {
    return {
      id: "all",
      nameAr: "الكل",
      nameEn: "All",
      emoji: "🍽️",
      bgGradient: "from-amber-400 to-amber-500",
      textColor: "text-slate-950",
      badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
    };
  }

  if (norm.includes("بروستد") || norm.includes("broast") || norm.includes("مسحب") || norm.includes("مقلي")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Broasted Chicken",
      emoji: "🍗",
      bgGradient: "from-orange-500 to-amber-500",
      textColor: "text-white",
      badgeBg: "bg-orange-50 text-orange-800 border-orange-200",
    };
  }

  if (norm.includes("برجر") || norm.includes("burger")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Burgers",
      emoji: "🍔",
      bgGradient: "from-amber-500 to-yellow-500",
      textColor: "text-slate-950",
      badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
    };
  }

  if (norm.includes("بيتزا") || norm.includes("pizza")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Pizza",
      emoji: "🍕",
      bgGradient: "from-rose-500 to-red-500",
      textColor: "text-white",
      badgeBg: "bg-rose-50 text-rose-800 border-rose-200",
    };
  }

  if (norm.includes("شاورما") || norm.includes("shawarma")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Shawarma",
      emoji: "🌯",
      bgGradient: "from-amber-600 to-orange-500",
      textColor: "text-white",
      badgeBg: "bg-amber-50 text-amber-900 border-amber-300",
    };
  }

  if (norm.includes("دجاج") || norm.includes("chicken")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Chicken",
      emoji: "🍗",
      bgGradient: "from-amber-500 to-orange-400",
      textColor: "text-slate-950",
      badgeBg: "bg-orange-50 text-orange-800 border-orange-200",
    };
  }

  if (norm.includes("مشاوي") || norm.includes("كباب") || norm.includes("أوصال") || norm.includes("grill") || norm.includes("steak")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Grills",
      emoji: "🥩",
      bgGradient: "from-red-600 to-rose-700",
      textColor: "text-white",
      badgeBg: "bg-red-50 text-red-800 border-red-200",
    };
  }

  if (norm.includes("مندي") || norm.includes("كبسة") || norm.includes("بخاري") || norm.includes("أرز") || norm.includes("سعودية")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Saudi & Mandi",
      emoji: "🍛",
      bgGradient: "from-amber-600 to-yellow-600",
      textColor: "text-white",
      badgeBg: "bg-amber-50 text-amber-900 border-amber-300",
    };
  }

  if (norm.includes("ألبان") || norm.includes("حليب") || norm.includes("جبن") || norm.includes("بيض") || norm.includes("dairy")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Dairy & Eggs",
      emoji: "🥛",
      bgGradient: "from-sky-400 to-blue-500",
      textColor: "text-white",
      badgeBg: "bg-sky-50 text-sky-800 border-sky-200",
    };
  }

  if (norm.includes("مخبوزات") || norm.includes("توست") || norm.includes("خبز") || norm.includes("bakery")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Bakery & Toast",
      emoji: "🍞",
      bgGradient: "from-amber-400 to-yellow-500",
      textColor: "text-slate-950",
      badgeBg: "bg-yellow-50 text-yellow-800 border-yellow-200",
    };
  }

  if (norm.includes("خضار") || norm.includes("فواكه") || norm.includes("produce") || norm.includes("fruit")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Fresh Produce",
      emoji: "🍎",
      bgGradient: "from-emerald-500 to-teal-600",
      textColor: "text-white",
      badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    };
  }

  if (norm.includes("عصائر") || norm.includes("مشروبات") || norm.includes("مياه") || norm.includes("drink") || norm.includes("juice")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Drinks & Juices",
      emoji: "🧃",
      bgGradient: "from-teal-400 to-cyan-500",
      textColor: "text-slate-950",
      badgeBg: "bg-teal-50 text-teal-800 border-teal-200",
    };
  }

  if (norm.includes("سناك") || norm.includes("شوكولاتة") || norm.includes("شيبس") || norm.includes("snack")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Snacks & Chocolate",
      emoji: "🍫",
      bgGradient: "from-amber-700 to-yellow-800",
      textColor: "text-white",
      badgeBg: "bg-amber-50 text-amber-900 border-amber-300",
    };
  }

  if (norm.includes("لحوم") || norm.includes("دواجن") || norm.includes("meat")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Fresh Meats",
      emoji: "🥩",
      bgGradient: "from-rose-600 to-red-600",
      textColor: "text-white",
      badgeBg: "bg-rose-50 text-rose-800 border-rose-200",
    };
  }

  if (norm.includes("قهوة") || norm.includes("شاي") || norm.includes("كافيه") || norm.includes("coffee") || norm.includes("tea")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Coffee & Tea",
      emoji: "☕",
      bgGradient: "from-stone-600 to-amber-800",
      textColor: "text-white",
      badgeBg: "bg-stone-50 text-stone-800 border-stone-200",
    };
  }

  if (norm.includes("تموين") || norm.includes("زيوت") || norm.includes("معلبات") || norm.includes("pantry")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Pantry & Oils",
      emoji: "🍚",
      bgGradient: "from-amber-400 to-yellow-600",
      textColor: "text-slate-950",
      badgeBg: "bg-yellow-50 text-yellow-800 border-yellow-200",
    };
  }

  if (norm.includes("منظف") || norm.includes("عناية") || norm.includes("soap") || norm.includes("care")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Home Care",
      emoji: "🧼",
      bgGradient: "from-cyan-500 to-blue-500",
      textColor: "text-white",
      badgeBg: "bg-cyan-50 text-cyan-800 border-cyan-200",
    };
  }

  if (norm.includes("مثلجات") || norm.includes("آيس") || norm.includes("ايس") || norm.includes("ice cream")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Ice Cream",
      emoji: "🍦",
      bgGradient: "from-pink-400 to-rose-400",
      textColor: "text-slate-950",
      badgeBg: "bg-pink-50 text-pink-800 border-pink-200",
    };
  }

  if (norm.includes("حلويات") || norm.includes("حلى") || norm.includes("كيك") || norm.includes("dessert")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Desserts",
      emoji: "🍰",
      bgGradient: "from-pink-500 to-rose-500",
      textColor: "text-white",
      badgeBg: "bg-pink-50 text-pink-800 border-pink-200",
    };
  }

  if (norm.includes("صحي") || norm.includes("سلطة") || norm.includes("healthy") || norm.includes("salad")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Healthy & Salads",
      emoji: "🥗",
      bgGradient: "from-emerald-400 to-green-500",
      textColor: "text-slate-950",
      badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    };
  }

  if (norm.includes("بحري") || norm.includes("سمك") || norm.includes("روبيان") || norm.includes("جمبري") || norm.includes("seafood") || norm.includes("sushi")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Seafood",
      emoji: "🍤",
      bgGradient: "from-blue-500 to-indigo-600",
      textColor: "text-white",
      badgeBg: "bg-blue-50 text-blue-800 border-blue-200",
    };
  }

  if (norm.includes("ساندوتش") || norm.includes("فطائر") || norm.includes("معجنات") || norm.includes("sandwich")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Sandwiches",
      emoji: "🥪",
      bgGradient: "from-amber-400 to-orange-400",
      textColor: "text-slate-950",
      badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
    };
  }

  if (norm.includes("باستا") || norm.includes("معكرونة") || norm.includes("مكرونة") || norm.includes("pasta")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Pasta",
      emoji: "🍝",
      bgGradient: "from-orange-500 to-amber-500",
      textColor: "text-white",
      badgeBg: "bg-orange-50 text-orange-800 border-orange-200",
    };
  }

  if (norm.includes("فطور") || norm.includes("إفطار") || norm.includes("breakfast")) {
    return {
      id: name,
      nameAr: name,
      nameEn: "Breakfast",
      emoji: "🍳",
      bgGradient: "from-amber-300 to-yellow-400",
      textColor: "text-slate-950",
      badgeBg: "bg-yellow-50 text-yellow-800 border-yellow-200",
    };
  }

  // Default attractive meal visual
  return {
    id: name,
    nameAr: name,
    nameEn: name,
    emoji: "🍱",
    bgGradient: "from-amber-400 to-orange-500",
    textColor: "text-slate-950",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
  };
}

export function getMealImage(meal: Partial<CatalogMeal>): string {
  if (
    meal.image_url &&
    !meal.image_url.includes("placeholder") &&
    !meal.image_url.includes("logo") &&
    !meal.image_url.includes(".svg")
  ) {
    return meal.image_url;
  }

  const name = `${meal.name_ar || ""} ${meal.name_en || ""} ${meal.description_ar || ""} ${meal.category_ar || ""}`.toLowerCase();

  if (name.includes("بروستد") || name.includes("broast") || name.includes("مسحب") || name.includes("مقلي") || name.includes("كنتاكي") || name.includes("البيك")) {
    return "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("برجر") || name.includes("burger")) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("بيتزا") || name.includes("pizza")) {
    return "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("شاورما") || name.includes("shawarma")) {
    return "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("مندي") || name.includes("كبسة") || name.includes("بخاري") || name.includes("حاشي") || name.includes("مظبي") || name.includes("أرز")) {
    return "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("مشاوي") || name.includes("كباب") || name.includes("شيش") || name.includes("أوصال") || name.includes("لحم")) {
    return "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("دجاج") || name.includes("chicken")) {
    return "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("بطاطس") || name.includes("فرايز") || name.includes("fries")) {
    return "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("حليب") || name.includes("لبن") || name.includes("زبادي") || name.includes("قشطة") || name.includes("ألبان") || name.includes("جبن")) {
    return "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("بيض") || name.includes("egg")) {
    return "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("توست") || name.includes("خبز") || name.includes("مخبوزات") || name.includes("صامولي") || name.includes("كرواسون")) {
    return "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("موز") || name.includes("banana")) {
    return "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("طماطم") || name.includes("خيار") || name.includes("خضار") || name.includes("بصل")) {
    return "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("تفاح") || name.includes("برتقال") || name.includes("فواكه") || name.includes("عنب") || name.includes("فراولة")) {
    return "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("ماء") || name.includes("مياه") || name.includes("water") || name.includes("نوفا") || name.includes("هنا")) {
    return "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("بيبسي") || name.includes("كولا") || name.includes("سفن") || name.includes("غازي") || name.includes("soda")) {
    return "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("عصير") || name.includes("موهيتو") || name.includes("سموذي") || name.includes("juice")) {
    return "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("قهوة") || name.includes("اسبريسو") || name.includes("لاتيه") || name.includes("كافيه") || name.includes("كابتشينو") || name.includes("coffee")) {
    return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("شاي") || name.includes("tea")) {
    return "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("شوكولاتة") || name.includes("شيبس") || name.includes("سناكس") || name.includes("بسكويت") || name.includes("كوكيز")) {
    return "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("كيك") || name.includes("حلى") || name.includes("سينابون") || name.includes("تشيز كيك") || name.includes("حلويات") || name.includes("sweet") || name.includes("dessert")) {
    return "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("سلطة") || name.includes("صحي") || name.includes("دايت") || name.includes("فتوش") || name.includes("تبولة")) {
    return "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("صابون") || name.includes("منظف") || name.includes("تايد") || name.includes("كلوركس") || name.includes("شامبو") || name.includes("مناديل")) {
    return "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("زيت") || name.includes("سمن") || name.includes("تموين") || name.includes("معلبات") || name.includes("تونة")) {
    return "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("سمك") || name.includes("بحري") || name.includes("روبيان") || name.includes("جمبري") || name.includes("سوشي")) {
    return "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("ساندوتش") || name.includes("فطائر") || name.includes("معجنات")) {
    return "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80";
  }
  if (name.includes("باستا") || name.includes("معكرونة") || name.includes("مكرونة")) {
    return "https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=600&auto=format&fit=crop&q=80";
  }

  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80";
}
