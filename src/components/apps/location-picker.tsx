import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { Button } from "@/components/ui/button";
import { LocateFixed } from "lucide-react";
import { ORDER_MAP_STYLE } from "@/lib/order-map-points";

export type PickedLocation = { latitude: number; longitude: number };

/** Map where the user taps (or uses GPS) to choose a real location. Browser-only; lazy-load it. */
export default function LocationPicker({ value, onChange }: { value: PickedLocation | null; onChange: (v: PickedLocation) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const change = useRef(onChange);
  change.current = onChange;
  const [gpsError, setGpsError] = useState("");

  const place = (lat: number, lng: number, fly = false) => {
    void import("maplibre-gl").then((api) => {
      if (!map.current) return;
      if (!marker.current) {
        const el = document.createElement("div");
        el.className = "order-map-marker order-map-marker--delivery";
        el.textContent = "الموقع";
        marker.current = new api.Marker({ element: el, anchor: "bottom" }).setLngLat([lng, lat]).addTo(map.current);
      } else marker.current.setLngLat([lng, lat]);
      if (fly) map.current.flyTo({ center: [lng, lat], zoom: 16, duration: 0 });
    });
  };

  useEffect(() => {
    let disposed = false;
    void Promise.all([import("maplibre-gl"), import("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url")]).then(([api, worker]) => {
      if (disposed || !box.current) return;
      api.setWorkerUrl(worker.default);
      const m = new api.Map({ container: box.current, style: ORDER_MAP_STYLE, center: value ? [value.longitude, value.latitude] : [46.6753, 24.7136], zoom: value ? 16 : 11, attributionControl: { compact: true } });
      map.current = m;
      m.on("load", () => { if (value) place(value.latitude, value.longitude); });
      m.on("click", (e) => { place(e.lngLat.lat, e.lngLat.lng); change.current({ latitude: e.lngLat.lat, longitude: e.lngLat.lng }); });
    });
    return () => { disposed = true; marker.current?.remove(); marker.current = null; map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gps = () => {
    setGpsError("");
    if (!navigator.geolocation) return setGpsError("تحديد الموقع غير مدعوم في هذا الجهاز");
    navigator.geolocation.getCurrentPosition(
      (p) => { place(p.coords.latitude, p.coords.longitude, true); change.current({ latitude: p.coords.latitude, longitude: p.coords.longitude }); },
      () => setGpsError("اسمح بالوصول للموقع أو اضغط على الخريطة"),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return <div className="space-y-2">
    <div ref={box} dir="ltr" role="region" aria-label="اختر الموقع على الخريطة" className="order-map-canvas h-64 w-full overflow-hidden rounded-lg border bg-muted" />
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{value ? "تم تحديد الموقع ✓" : "اضغط على الخريطة لتحديد الموقع"}</span>
      <Button type="button" variant="outline" size="sm" onClick={gps}><LocateFixed className="size-4" />موقعي الحالي</Button>
    </div>
    {gpsError && <p role="alert" className="text-sm text-destructive">{gpsError}</p>}
  </div>;
}
