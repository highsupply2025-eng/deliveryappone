import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const statusLabel: Record<string, string> = { pending: "قيد المراجعة", paid: "تم التحويل", rejected: "مرفوضة" };

/** مبيعات المطعم من الطلبات المسلّمة، والمطالبة بالمستحق (يُحسب في قاعدة البيانات). */
export function RestaurantSales({ restaurantId }: { restaurantId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const data = useQuery({ queryKey: ["restaurant-sales", restaurantId], queryFn: async () => {
    const [o, p] = await Promise.all([
      supabase.from("orders").select("subtotal,created_at").eq("restaurant_id", restaurantId).eq("status", "delivered"),
      supabase.from("restaurant_payout_requests").select("id,amount,status,created_at").eq("restaurant_id", restaurantId).order("created_at", { ascending: false }),
    ]);
    if (o.error) throw o.error; if (p.error) throw p.error;
    return { orders: o.data, payouts: p.data };
  } });
  if (data.isError) return <p role="alert" className="text-destructive">تعذر تحميل المبيعات</p>;
  if (data.isPending) return <p>جارِ التحميل…</p>;
  const today = new Date().toDateString();
  const sum = (xs: { subtotal: number }[]) => xs.reduce((a, x) => a + Number(x.subtotal), 0);
  const total = sum(data.data.orders);
  const todayTotal = sum(data.data.orders.filter((x) => new Date(x.created_at).toDateString() === today));
  const claimed = data.data.payouts.filter((x) => x.status !== "rejected").reduce((a, x) => a + Number(x.amount), 0);
  const due = Math.max(0, total - claimed);
  const pending = data.data.payouts.some((x) => x.status === "pending");
  const claim = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("request_restaurant_payout", { p_restaurant_id: restaurantId });
    setBusy(false);
    if (error) toast.error("تعذر إرسال المطالبة"); else { toast.success("أُرسلت المطالبة للإدارة"); void qc.invalidateQueries({ queryKey: ["restaurant-sales", restaurantId] }); }
  };
  const Card = ({ label, value }: { label: string; value: number }) => <div className="rounded-lg border bg-card p-3"><p className="text-sm text-muted-foreground">{label}</p><p className="text-lg font-bold">{value.toFixed(2)} ر.س</p></div>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Card label="مبيعات اليوم" value={todayTotal} />
        <Card label="إجمالي المبيعات" value={total} />
        <Card label="تمت المطالبة به" value={claimed} />
        <Card label="المستحق الآن" value={due} />
      </div>
      <p className="text-sm text-muted-foreground">عدد الطلبات المسلّمة: {data.data.orders.length}</p>
      <Button className="w-full" disabled={busy || pending || due <= 0} onClick={() => void claim()}>{pending ? "لديك مطالبة قيد المراجعة" : "المطالبة بالمستحق"}</Button>
      <section className="space-y-2">
        <h2 className="font-bold">المطالبات السابقة</h2>
        {!data.data.payouts.length ? <p className="text-muted-foreground">لا توجد مطالبات بعد</p> : data.data.payouts.map((x) => (
          <div key={x.id} className="flex justify-between rounded-lg border bg-card p-3 text-sm"><span>{Number(x.amount).toFixed(2)} ر.س · {new Date(x.created_at).toLocaleDateString("ar-SA")}</span><span>{statusLabel[x.status] ?? x.status}</span></div>
        ))}
      </section>
    </div>
  );
}
