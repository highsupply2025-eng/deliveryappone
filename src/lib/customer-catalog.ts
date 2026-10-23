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
  const realRestaurants = restaurants.filter(r => r.is_active && !(r.owner_id === null && seedRestaurants.get(r.id) === r.name_ar));
  const ids = new Set(realRestaurants.map(r => r.id));
  return { restaurants: realRestaurants, meals: items.filter(m => m.is_available && ids.has(m.restaurant_id)) };
}

export function catalogCategories(meals: CatalogMeal[]) {
  return [...new Set(meals.map(m => m.category_ar).filter(Boolean))];
}

export function validCatalogCart(lines: {id: string; restaurant_id: string; price: number}[], meals: CatalogMeal[]) {
  return lines.every(l => meals.some(m => m.id === l.id && m.restaurant_id === l.restaurant_id && Number(m.price) === l.price && m.is_available));
}