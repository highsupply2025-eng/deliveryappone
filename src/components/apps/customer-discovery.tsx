import { useState } from "react";
import { Search, ChevronLeft, Plus, SlidersHorizontal, Store, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import burgerBanner from "@/assets/customer-burger-banner.jpg";
import type { Meal, Restaurant } from "./customer-mobile-app";

interface Category { id: string; nameAr: string; nameEn: string; emoji: string }
interface Props {
  ar: boolean;
  categories: Category[];
  category: string;
  onCategory: (id: string) => void;
  search: string;
  onSearch: (value: string) => void;
  meals: Meal[];
  restaurants: Restaurant[];
  onRestaurant: (restaurant: Restaurant) => void;
  onMeal: (meal: Meal) => void;
  onAdd: (meal: Meal) => void;
  onBrowse: () => void;
  directory?: boolean;
}

export function CustomerDiscovery(p: Props) {
  const [slide, setSlide] = useState(0);
  const slides = [
    { title: p.ar ? "برجر على مزاجك" : "Your burger favourites", sub: p.ar ? "وجبتك المفضلة من مطاعم FoodHub" : "Your favourite meals from FoodHub", category: "burger" },
    { title: p.ar ? "خفيفة ولذيذة" : "Fresh and delicious", sub: p.ar ? "اكتشف خيارات الوجبات الصحية" : "Explore healthy meal options", category: "healthy" },
    { title: p.ar ? "خلّها حلوة" : "Something sweet", sub: p.ar ? "حلى وقهوة تكمل يومك" : "Desserts and coffee for your day", category: "sweets" },
  ];
  const current = slides[slide] ?? slides[0];
  const restaurants = p.restaurants.filter(r => (p.category === "all" || r.category === p.category) && (!p.search || r.nameAr.includes(p.search) || r.nameEn.toLowerCase().includes(p.search.toLowerCase())));
  return <div className="customer-discovery">
    <div className="customer-search">
      <Search aria-hidden="true" />
      <input aria-label={p.ar ? "البحث عن مطعم أو وجبة" : "Search restaurants or meals"} placeholder={p.ar ? "وش ودّك تاكل اليوم؟" : "What are you craving today?"} value={p.search} onChange={e => p.onSearch(e.target.value)} />
      {p.search && <Button variant="ghost" size="icon" aria-label="مسح البحث" onClick={() => p.onSearch("")}>×</Button>}
    </div>
    {!p.directory && !p.search && <section className={`customer-food-banner customer-food-banner--${slide}`}>
      <img src={slide === 0 ? burgerBanner : p.restaurants.find(r => r.category === current.category)?.image ?? burgerBanner} alt={current.title} width={1536} height={1024} />
      <div className="customer-banner-copy">
        <span>FOODHUB</span><h1>{current.title}</h1><p>{current.sub}</p>
        <Button onClick={() => p.onCategory(current.category)} className="customer-banner-cta">{p.ar ? "شوف الوجبات" : "Explore meals"}<ChevronLeft /></Button>
      </div>
      <div className="customer-banner-dots">{slides.map((s, i) => <Button key={s.category} variant="ghost" aria-label={s.title} aria-pressed={slide === i} onClick={() => setSlide(i)} className={slide === i ? "is-selected" : ""} />)}</div>
    </section>}
    <div className="customer-discovery-content">
      <Button variant="ghost" className="customer-browse-band" onClick={p.onBrowse}>
        <span className="customer-browse-icon"><UtensilsCrossed /></span>
        <span><strong>{p.ar ? "مطاعمك المفضلة، في مكان واحد" : "Your favourite restaurants, together"}</strong><small>{p.ar ? "اكتشف المطاعم وتصفّح قوائم الوجبات" : "Discover restaurants and explore their menus"}</small></span><ChevronLeft />
      </Button>
      {p.directory && <>
        <div className="customer-section-heading"><h2>{p.ar ? "الأقسام" : "Categories"}</h2><Store /></div>
        <div className="customer-category-grid">{p.categories.filter(c => c.id !== "all").map(c => <Button variant="ghost" key={c.id} onClick={() => p.onCategory(c.id)} aria-pressed={p.category === c.id} className={p.category === c.id ? "is-selected" : ""}><span>{c.emoji}</span><strong>{p.ar ? c.nameAr : c.nameEn}</strong></Button>)}</div>
      </>}
      <div className="customer-filters">
        <Button variant="outline" size="icon" aria-label={p.ar ? "عرض كل الوجبات" : "Show all meals"} onClick={() => p.onCategory("all")}><SlidersHorizontal /></Button>
        {p.categories.map(c => <Button variant="outline" key={c.id} aria-pressed={p.category === c.id} onClick={() => p.onCategory(c.id)} className={p.category === c.id ? "is-selected" : ""}><span>{c.emoji}</span>{p.ar ? c.nameAr : c.nameEn}</Button>)}
      </div>
      {!p.directory && <>
        <div className="customer-section-heading"><h2>{p.ar ? "وجبات تختارها أنت" : "Meals for you"}</h2><span>{p.meals.length} {p.ar ? "وجبة" : "meals"}</span></div>
        <div className="customer-meal-grid">{p.meals.map(m => <article key={m.id} className="customer-meal">
          <div className="customer-meal-picture"><Button variant="ghost" onClick={() => p.onMeal(m)} aria-label={m.nameAr} className="customer-picture-button"><img loading="lazy" src={m.image} alt={m.nameAr} width={240} height={240} /></Button><Button variant="outline" size="icon" className="customer-add" aria-label={`إضافة ${m.nameAr} للسلة`} onClick={() => p.onAdd(m)}><Plus /></Button></div>
          <Button variant="ghost" className="customer-restaurant-tag" onClick={() => { const r = p.restaurants.find(r => r.id === m.restaurantId); if (r) p.onRestaurant(r); }}>{p.restaurants.find(r => r.id === m.restaurantId)?.nameAr.split(" (")[0]}<ChevronLeft /></Button>
          <Button variant="ghost" className="customer-meal-name" onClick={() => p.onMeal(m)}>{p.ar ? m.nameAr : m.nameEn}</Button>
          <small>{m.calories} {p.ar ? "سعرة حرارية" : "kcal"}</small><strong className="customer-meal-price">{m.price.toFixed(2)} <span>{p.ar ? "ر.س" : "SAR"}</span></strong>
        </article>)}</div>
        {p.meals.length === 0 && <p className="customer-empty">{p.ar ? "لا توجد وجبات تطابق بحثك" : "No meals match your search"}</p>}
      </>}
      <div className="customer-section-heading"><h2>{p.ar ? "المطاعم والمطابخ" : "Restaurants & kitchens"}</h2>{!p.directory && <Button variant="ghost" onClick={p.onBrowse}>{p.ar ? "عرض الكل" : "View all"}<ChevronLeft /></Button>}</div>
      <div className={p.directory ? "customer-restaurant-list" : "customer-restaurant-strip"}>{restaurants.map(r => <Button key={r.id} variant="ghost" onClick={() => p.onRestaurant(r)} className="customer-restaurant-card"><img loading="lazy" src={r.image} alt={r.nameAr} width={300} height={180} /><span><strong>{p.ar ? r.nameAr : r.nameEn}</strong><small>{r.tagAr}</small><small>{r.eta} · {r.deliveryFee === 0 ? "توصيل مجاني" : `${r.deliveryFee} ر.س`}</small></span></Button>)}</div>
      {restaurants.length === 0 && p.directory && <p className="customer-empty">{p.ar ? "لا توجد مطاعم تطابق بحثك" : "No restaurants match your search"}</p>}
    </div>
  </div>;
}