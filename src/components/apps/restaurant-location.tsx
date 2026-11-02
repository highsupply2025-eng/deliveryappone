import { lazy, Suspense, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { PickedLocation } from "./location-picker";

const LocationPicker = lazy(() => import("./location-picker"));

export function RestaurantLocation({ restaurantId }: { restaurantId: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["restaurant-location", restaurantId], queryFn: async () => {
    const { data, error } = await supabase.from("restaurants").select("address,latitude,longitude").eq("id", restaurantId).single();
    if (error) throw error; return data;
  } });
  if (q.isPending) return <p>جارِ التحميل…</p>;
  if (q.isError) return <p role="alert" className="text-destructive">تعذر تحميل موقع المطعم</p>;
  return <Form key={restaurantId} restaurantId={restaurantId} initial={q.data} onSaved={() => void qc.invalidateQueries({ queryKey: ["restaurant-location"] })} />;
}

function Form({ restaurantId, initial, onSaved }: { restaurantId: string; initial: { address: string | null; latitude: number | null; longitude: number | null }; onSaved: () => void }) {
  const [address, setAddress] = useState(initial.address ?? "");
  const [loc, setLoc] = useState<PickedLocation | null>(initial.latitude != null && initial.longitude != null ? { latitude: initial.latitude, longitude: initial.longitude } : null);
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim().length < 3 || !loc) { toast.error("اكتب العنوان وحدد الموقع على الخريطة"); return; }
    setBusy(true);
    const { error } = await supabase.from("restaurants").update({ address: address.trim(), latitude: loc.latitude, longitude: loc.longitude }).eq("id", restaurantId);
    setBusy(false);
    if (error) toast.error("تعذر حفظ الموقع"); else { toast.success("تم حفظ موقع المطعم"); onSaved(); }
  };
  return <form onSubmit={save} className="space-y-3 rounded-lg border bg-card p-4">
    <h2 className="font-bold">موقع الاستلام</h2>
    <p className="text-sm text-muted-foreground">يظهر هذا الموقع للمندوب والعميل والإدارة في كل طلب، ولا يصل الطلب للمندوب بدونه.</p>
    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="عنوان المطعم (الحي والشارع)" required />
    <Suspense fallback={<p className="text-sm text-muted-foreground">جارِ تحميل الخريطة…</p>}><LocationPicker value={loc} onChange={setLoc} /></Suspense>
    <Button type="submit" disabled={busy} className="w-full">حفظ الموقع</Button>
  </form>;
}
