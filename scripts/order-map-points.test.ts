import { expect, test } from "bun:test";
import { orderMapPoints } from "../src/lib/order-map-points";

test("pickup and delivery remain visible before courier shares GPS", () => {
  expect(orderMapPoints({ pickup_latitude: 24.71, pickup_longitude: 46.67, delivery_latitude: 24.75, delivery_longitude: 46.72 }, null)).toEqual([
    { id: "pickup", label: "الاستلام", coordinates: [46.67, 24.71] },
    { id: "delivery", label: "التسليم", coordinates: [46.72, 24.75] },
  ]);
});
test("live GPS changes courier coordinates without changing pickup or delivery", () => {
  const order = { pickup_latitude: 24.71, pickup_longitude: 46.67, delivery_latitude: 24.75, delivery_longitude: 46.72 };
  const before = orderMapPoints(order, { latitude: 24.72, longitude: 46.68 });
  const after = orderMapPoints(order, { latitude: 24.73, longitude: 46.69 });
  expect(after.slice(0, 2)).toEqual(before.slice(0, 2));
  expect(after[2]?.coordinates).toEqual([46.69, 24.73]);
  expect(after[2]?.coordinates).not.toEqual(before[2]?.coordinates);
});
test("missing or invalid endpoints never produce invented markers", () => {
  expect(orderMapPoints({ pickup_latitude: null, pickup_longitude: null, delivery_latitude: 91, delivery_longitude: 46 }, null)).toEqual([]);
  expect(orderMapPoints(null, { latitude: 0, longitude: 0 })[0]?.coordinates).toEqual([0, 0]);
});
import { orderMapStyle, FALLBACK_MAP_STYLE } from "../src/lib/order-map-points";
test("uses Mapbox tiles with a public token, free map otherwise", () => {
  expect(orderMapStyle(undefined)).toBe(FALLBACK_MAP_STYLE);
  expect(orderMapStyle("sk.secret")).toBe(FALLBACK_MAP_STYLE);
  expect(JSON.stringify(orderMapStyle("pk.abc"))).toContain("api.mapbox.com");
});
