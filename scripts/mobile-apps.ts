export const mobileApps = {
  customer: { id: "delivery.foodhub.customer", name: "FoodHub" },
  captain: { id: "delivery.foodhub.captain", name: "FoodHub Rider" },
  kitchen: { id: "delivery.foodhub.kitchen", name: "FoodHub Store" },
  admin: { id: "delivery.foodhub.admin", name: "FoodHub Admin" },
} as const;

export function getMobileApp(role = "customer") {
  if (role !== "customer" && role !== "captain" && role !== "kitchen" && role !== "admin") {
    throw new Error(`Unknown mobile app: ${role}`);
  }
  return {
    ...mobileApps[role],
    role,
    url:
      role === "admin"
        ? "https://foodhub.delivery/admin-app?app=admin"
        : `https://foodhub.delivery/?app=${role}`,
  };
}
