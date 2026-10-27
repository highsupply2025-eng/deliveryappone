import { useState } from "react";
import { Search, ChevronLeft, Plus, Store, UtensilsCrossed, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoRomansiah from "@/assets/restaurant-alromansiah.png.asset.json";
import logoShawarmaHouse from "@/assets/restaurant-shawarma-house.png.asset.json";
import logoKfc from "@/assets/restaurant-kfc.png.asset.json";
import logoMcdonalds from "@/assets/restaurant-mcdonalds.png.asset.json";
import type { CatalogMeal, CatalogRestaurant } from "@/lib/customer-catalog";

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
  { id: "alromansiah", nameAr: "الرومانسية", nameEn: "Al Romansiah", logo: logoRomansiah },
  { id: "shawarma-house", nameAr: "بيت الشاورما", nameEn: "Shawarma House", logo: logoShawarmaHouse },
  { id: "kfc", nameAr: "كنتاكى", nameEn: "KFC", logo: logoKfc },
  { id: "mcdonalds", nameAr: "ماكدونالز", nameEn: "McDonald's", logo: logoMcdonalds },
];
export function CustomerDiscovery(p: Props) {
  const [slide, setSlide] = useState(0);
  const featured = p.restaurants.filter((r) => r.image_url).slice(0, 5);
  const current = featured[slide] ?? featured[0];
  const restaurants = p.restaurants.filter(
    (r) =>
      (!p.search || `${r.name_ar} ${r.name_en}`.toLowerCase().includes(p.search.toLowerCase())) &&
      (p.category === "all" || p.meals.some((m) => m.restaurant_id === r.id)),
  );
  return (
    <div className="customer-discovery">
      <div className="customer-search">
        <Search aria-hidden="true" />
        <input
          aria-label={p.ar ? "البحث عن مطعم أو وجبة" : "Search restaurants or meals"}
          placeholder={p.ar ? "ابحث عن مطعم أو وجبة" : "Search restaurants or meals"}
          value={p.search}
          onChange={(e) => p.onSearch(e.target.value)}
        />
        {p.search && (
          <Button variant="ghost" size="icon" aria-label="مسح البحث" onClick={() => p.onSearch("")}>
            <X />
          </Button>
        )}
      </div>
      {!p.directory && !p.search && current && (
        <section className="customer-food-banner">
          <img src={current.image_url ?? ""} alt={current.name_ar} width={900} height={500} />
          <div className="customer-banner-copy">
            <span>FOODHUB</span>
            <h1>{p.ar ? current.name_ar : current.name_en}</h1>
            <p>{p.ar ? current.cuisine_ar : current.cuisine_en}</p>
            <Button onClick={() => p.onRestaurant(current)} className="customer-banner-cta">
              {p.ar ? "شوف القائمة" : "Explore menu"}
              <ChevronLeft />
            </Button>
          </div>
          <div className="customer-banner-dots">
            {featured.map((r, i) => (
              <Button
                key={r.id}
                variant="ghost"
                aria-label={r.name_ar}
                aria-pressed={slide === i}
                onClick={() => setSlide(i)}
                className={slide === i ? "is-selected" : ""}
              />
            ))}
          </div>
        </section>
      )}
      <div className="customer-discovery-content">
        {!p.directory && p.restaurants.length > 0 && <Button variant="ghost" className="customer-browse-band" onClick={p.onBrowse}>
          <span className="customer-browse-icon">
            <UtensilsCrossed />
          </span>
          <span>
            <strong>{p.ar ? "المطاعم والمطابخ" : "Restaurants & kitchens"}</strong>
            <small>{p.ar ? "تصفّح قوائم الطعام" : "Explore the menus"}</small>
          </span>
          <ChevronLeft />
        </Button>}
        {p.directory && <h1 className="customer-directory-title">{p.ar ? "المطاعم" : "Restaurants"}</h1>}
        {p.loading ? (
          <div className="customer-empty">
            {p.ar ? "جارِ تحميل المطاعم…" : "Loading restaurants…"}
          </div>
        ) : p.error ? (
          <div className="customer-empty" role="alert">
            <p>تعذر تحميل المطاعم</p>
            <Button variant="outline" onClick={p.onRetry}>
              إعادة المحاولة
            </Button>
          </div>
        ) : p.restaurants.length === 0 ? (
          <div className="customer-empty">
            <div className="customer-showcase">
              {showcaseRestaurants.map((r) => (
                <article key={r.id} className="customer-showcase-item">
                  <img src={r.logo.url} alt={p.ar ? r.nameAr : r.nameEn} width={48} height={48} loading="lazy" />
                  <div className="customer-showcase-copy">
                    <strong>{p.ar ? r.nameAr : r.nameEn}</strong>
                    <span className="customer-showcase-rating" aria-label={p.ar ? "التقييم 5 من 5" : "Rating 5 of 5"}>
                      <Star aria-hidden="true" /> 5
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <>
            {p.categories.length > 0 && (
            <div className="customer-filters">
              <Button
                variant="outline"
                onClick={() => p.onCategory("all")}
                aria-pressed={p.category === "all"}
                className={p.category === "all" ? "is-selected" : ""}
              >
                {p.ar ? "الكل" : "All"}
              </Button>
              {p.categories.map((c) => (
                <Button
                  variant="outline"
                  key={c}
                  aria-pressed={p.category === c}
                  onClick={() => p.onCategory(c)}
                  className={p.category === c ? "is-selected" : ""}
                >
                  {c}
                </Button>
              ))}
            </div>)}
            {!p.directory && (
              <>
                <div className="customer-section-heading">
                  <h2>{p.ar ? "الوجبات" : "Meals"}</h2>
                  <span>{p.meals.length}</span>
                </div>
                <div className="customer-meal-grid">
                  {p.meals.map((m) => (
                    <article key={m.id} className="customer-meal">
                      <div className="customer-meal-picture">
                        <Button
                          variant="ghost"
                          onClick={() => p.onMeal(m)}
                          aria-label={m.name_ar}
                          className="customer-picture-button"
                        >
                          {m.image_url ? (
                            <img
                              loading="lazy"
                              src={m.image_url}
                              alt={m.name_ar}
                              width={240}
                              height={240}
                            />
                          ) : (
                            <UtensilsCrossed aria-label="بدون صورة" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="customer-add"
                          aria-label={`إضافة ${m.name_ar} للسلة`}
                          onClick={() => p.onAdd(m)}
                        >
                          <Plus />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        className="customer-restaurant-tag"
                        onClick={() => {
                          const r = p.restaurants.find((r) => r.id === m.restaurant_id);
                          if (r) p.onRestaurant(r);
                        }}
                      >
                        {p.restaurants.find((r) => r.id === m.restaurant_id)?.name_ar}
                        <ChevronLeft />
                      </Button>
                      <Button
                        variant="ghost"
                        className="customer-meal-name"
                        onClick={() => p.onMeal(m)}
                      >
                        {p.ar ? m.name_ar : m.name_en}
                      </Button>
                      <small>{m.category_ar}</small>
                      <strong className="customer-meal-price">
                        {Number(m.price).toFixed(2)} <span>{p.ar ? "ر.س" : "SAR"}</span>
                      </strong>
                    </article>
                  ))}
                </div>
                {p.meals.length === 0 && (
                  <p className="customer-empty">
                    {p.ar ? "لا توجد وجبات متاحة" : "No meals available"}
                  </p>
                )}
              </>
            )}
            <div className="customer-section-heading">
              <h2>{p.ar ? "المطاعم والمطابخ" : "Restaurants & kitchens"}</h2>
              {!p.directory && (
                <Button variant="ghost" onClick={p.onBrowse}>
                  عرض الكل
                  <ChevronLeft />
                </Button>
              )}
            </div>
            <div className={p.directory ? "customer-restaurant-list" : "customer-restaurant-strip"}>
              {restaurants.map((r) => (
                <Button
                  key={r.id}
                  variant="ghost"
                  onClick={() => p.onRestaurant(r)}
                  className="customer-restaurant-card"
                >
                  {r.image_url ? (
                    <img
                      loading="lazy"
                      src={r.image_url}
                      alt={r.name_ar}
                      width={300}
                      height={180}
                    />
                  ) : (
                    <Store />
                  )}
                  <span>
                    <strong>{p.ar ? r.name_ar : r.name_en}</strong>
                    <small>{p.ar ? r.cuisine_ar : r.cuisine_en}</small>
                    <small>
                      {r.eta_minutes} {p.ar ? "دقيقة تحضير" : "min preparation"} ·{" "}
                      {Number(r.delivery_fee).toFixed(2)} {p.ar ? "ر.س توصيل" : "SAR delivery"}
                    </small>
                  </span>
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
