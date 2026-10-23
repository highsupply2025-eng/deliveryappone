import { describe, expect, test } from "bun:test";
import { customerCatalog, validCatalogCart, type CatalogRestaurant, type CatalogMeal } from "../src/lib/customer-catalog";

const seed: CatalogRestaurant = {id:"11111111-1111-1111-1111-111111111111",name_ar:"برجر هاوس",name_en:"Burger House",owner_id:null,is_active:true,created_at:"",cuisine_ar:"",cuisine_en:"",image_url:null,rating:0,delivery_fee:10,min_order:25,eta_minutes:30};
const real: CatalogRestaurant = {...seed,id:"b243a340-6f19-4a1e-8df4-0526df16c952",name_ar:"اسم مسجل",owner_id:"owner"};
const meal: CatalogMeal = {id:"real-item",restaurant_id:real.id,name_ar:"صنف مسجل",name_en:"Stored item",description_ar:"",description_en:"",category_ar:"أطباق",category_en:"Meals",price:27,image_url:null,is_available:true,created_at:""};
describe("customer catalog uses stored business data only", () => {
  test("excludes known unclaimed seed restaurants and their meals", () => {
    const catalog = customerCatalog([seed, real],[{...meal,id:"seed-item",restaurant_id:seed.id},meal]);
    expect(catalog.restaurants.map(r => r.id)).toEqual([real.id]);
    expect(catalog.meals.map(m => m.id)).toEqual(["real-item"]);
  });
  test("empty data never produces sample restaurants or meals", () => {
    expect(customerCatalog([],[])).toEqual({restaurants:[],meals:[]});
  });
  test("unavailable meals and inactive restaurants stay out of catalog", () => {
    expect(customerCatalog([{...real,is_active:false}],[meal]).meals).toHaveLength(0);
    expect(customerCatalog([real],[{...meal,is_available:false}]).meals).toHaveLength(0);
  });
  test("cart cannot contain fake or altered-price items", () => {
    expect(validCatalogCart([{id:"meal-prime-1",restaurant_id:real.id,price:27}],[meal])).toBe(false);
    expect(validCatalogCart([{id:meal.id,restaurant_id:real.id,price:1}],[meal])).toBe(false);
    expect(validCatalogCart([{id:meal.id,restaurant_id:real.id,price:27}],[meal])).toBe(true);
  });
});