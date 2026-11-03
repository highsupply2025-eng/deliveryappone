import { lazy, Suspense, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Navigation, Store, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { PickedLocation } from "./location-picker";

const LocationPicker = lazy(() => import("./location-picker"));

export function RestaurantLocation({ restaurantId }: { restaurantId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["restaurant-location", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select(
          "name_ar,cuisine_ar,address,latitude,longitude,eta_minutes,delivery_fee,min_order",
        )
        .eq("id", restaurantId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (q.isPending)
    return (
      <div className="rounded-2xl border bg-card py-12 text-center text-sm text-muted-foreground">
        جارِ تحميل موقع وإعدادات المتجر…
      </div>
    );
  if (q.isError)
    return (
      <p
        role="alert"
        className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
      >
        تعذر تحميل موقع المتجر
      </p>
    );

  return (
    <Form
      key={restaurantId}
      restaurantId={restaurantId}
      initial={q.data}
      onSaved={() => {
        void qc.invalidateQueries({ queryKey: ["restaurant-location"] });
        void qc.invalidateQueries({ queryKey: ["kitchen-restaurant"] });
      }}
    />
  );
}

function Form({
  restaurantId,
  initial,
  onSaved,
}: {
  restaurantId: string;
  initial: {
    name_ar: string;
    cuisine_ar: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    eta_minutes: number;
    delivery_fee: number;
    min_order: number;
  };
  onSaved: () => void;
}) {
  const [nameAr, setNameAr] = useState(initial.name_ar ?? "");
  const [cuisineAr, setCuisineAr] = useState(initial.cuisine_ar ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [etaMinutes, setEtaMinutes] = useState(String(initial.eta_minutes ?? 25));
  const [deliveryFee, setDeliveryFee] = useState(String(initial.delivery_fee ?? 10));
  const [minOrder, setMinOrder] = useState(String(initial.min_order ?? 0));
  const [loc, setLoc] = useState<PickedLocation | null>(
    initial.latitude != null && initial.longitude != null
      ? { latitude: initial.latitude, longitude: initial.longitude }
      : null,
  );
  const [busy, setBusy] = useState(false);

  const detectCurrentGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("متصفحك لا يدعم تحديد الموقع الجغرافي");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        });
        toast.success("تم التقاط إحداثيات موقعك الحالي بنجاح ✓");
      },
      () => {
        toast.error("تعذر التقاط موقع GPS — يمكنك التحديد بالنقر على الخريطة");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim().length < 3 || !loc) {
      toast.error("اكتب عنوان المتجر وحدد الموقع على الخريطة");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("restaurants")
      .update({
        name_ar: nameAr.trim() || initial.name_ar,
        cuisine_ar: cuisineAr.trim() || initial.cuisine_ar,
        address: address.trim(),
        latitude: loc.latitude,
        longitude: loc.longitude,
        eta_minutes: Math.max(5, Number(etaMinutes) || 25),
        delivery_fee: Math.max(0, Number(deliveryFee) || 0),
        min_order: Math.max(0, Number(minOrder) || 0),
      })
      .eq("id", restaurantId);
    setBusy(false);
    if (error) {
      toast.error("تعذر حفظ بيانات وموقع المتجر");
    } else {
      toast.success("تم حفظ موقع وإعدادات المتجر بنجاح ✓");
      onSaved();
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      {/* Store Pickup Location Card */}
      <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            <h2 className="font-bold text-sm">موقع استلام الطلبات (نطاق 10 كم للمناديب)</h2>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={detectCurrentGps}
            className="h-8 gap-1.5 text-xs"
          >
            <Navigation className="size-3.5 text-primary" />
            التقاط موقعي عبر GPS
          </Button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          يظهر هذا الموقع للمندوب والعميل والإدارة في كل طلب، ويُستخدم لتوجيه الطلبات تلقائياً للمناديب المتواجدين في حيز 10 كيلومتر من المتجر.
        </p>

        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="عنوان المتجر التفصيلي (الحي، الشارع، المعلم البارز)"
          required
        />

        {loc && (
          <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800">
            <span className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-600" />
              الإحداثيات المحددة حالياً:
            </span>
            <span dir="ltr" className="font-mono font-bold">
              {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
            </span>
          </div>
        )}

        <Suspense
          fallback={
            <div className="flex h-64 items-center justify-center rounded-xl border bg-muted text-sm text-muted-foreground">
              جارِ تحميل الخريطة التفاعلية…
            </div>
          }
        >
          <LocationPicker value={loc} onChange={setLoc} />
        </Suspense>
      </section>

      {/* Store Operational Settings Card */}
      <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Store className="size-4 text-primary" />
          <h2 className="font-bold text-sm">إعدادات المتجر والتوصيل</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">اسم المتجر أو المطعم</span>
            <Input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="اسم المطعم"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">تصنيف المتجر (نوع المأكولات)</span>
            <Input
              value={cuisineAr}
              onChange={(e) => setCuisineAr(e.target.value)}
              placeholder="مثال: مشويات، برجر، مأكولات عربية"
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">وقت التحضير (دقيقة)</span>
            <Input
              type="number"
              inputMode="numeric"
              value={etaMinutes}
              onChange={(e) => setEtaMinutes(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">رسوم التوصيل (ر.س)</span>
            <Input
              type="number"
              inputMode="decimal"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">الحد الأدنى (ر.س)</span>
            <Input
              type="number"
              inputMode="decimal"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
            />
          </label>
        </div>

        <Button type="submit" disabled={busy} className="w-full">
          حفظ موقع وإعدادات المتجر
        </Button>
      </section>
    </form>
  );
}
