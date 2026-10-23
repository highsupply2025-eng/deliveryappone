import { validCoordinates } from "./tracking-rules";

import type { StyleSpecification } from "maplibre-gl";

export const FALLBACK_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
export function orderMapStyle(token: string | undefined): string | StyleSpecification {
  if (!token || !token.startsWith("pk.")) return FALLBACK_MAP_STYLE;
  return {
    version: 8,
    sources: {
      mapbox: {
        type: "raster", tileSize: 512,
        tiles: [`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${encodeURIComponent(token)}`],
        attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    },
    layers: [{ id: "mapbox", type: "raster", source: "mapbox" }],
  };
}
export const ORDER_MAP_STYLE = orderMapStyle(import.meta.env["VITE_LOVABLE_CONNECTOR_MAPBOX_PUBLIC_TOKEN"] as string | undefined);
export type OrderMapPoint = { id: "pickup" | "delivery" | "courier"; label: string; coordinates: [number, number] };
type Coordinates = { latitude: number | null; longitude: number | null };
export function orderMapPoints(order: {
  pickup_latitude: number | null; pickup_longitude: number | null;
  delivery_latitude: number | null; delivery_longitude: number | null;
} | null | undefined, courier: Coordinates | null | undefined): OrderMapPoint[] {
  const points: OrderMapPoint[] = [];
  const add = (id: OrderMapPoint["id"], label: string, lat: number | null | undefined, lng: number | null | undefined) => {
    if (typeof lat === "number" && typeof lng === "number" && validCoordinates(lat, lng)) {
      points.push({ id, label, coordinates: [lng, lat] });
    }
  };
  add("pickup", "الاستلام", order?.pickup_latitude, order?.pickup_longitude);
  add("delivery", "التسليم", order?.delivery_latitude, order?.delivery_longitude);
  add("courier", "المندوب", courier?.latitude, courier?.longitude);
  return points;
}