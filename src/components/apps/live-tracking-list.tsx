import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { useRealtime } from "@/lib/realtime";
import { LiveOrderMap } from "./live-order-map";

const statuses: Record<string, string> = {
  pending: "جديد",
  accepted: "مقبول",
  preparing: "قيد التحضير",
  ready: "جاهز للاستلام",
  on_the_way: "في الطريق",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};
export function LiveTrackingList({ customerOnly = false }: { customerOnly?: boolean }) {
  const { user, loading } = useSession();
  useRealtime(["orders"], ["live-tracking-orders"], "tracking-list");
  const orders = useQuery({
    queryKey: ["live-tracking-orders", user?.id, customerOnly],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("orders")
        .select("id,status,address,pickup_address")
        .not("status", "in", "(delivered,cancelled)")
        .order("created_at", { ascending: false })
        .limit(30);
      if (customerOnly) query = query.eq("customer_id", user.id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  if (loading || (orders.isPending && user))
    return <p className="p-4 text-muted-foreground">جارِ تحميل الطلبات…</p>;
  if (!user) return <p className="p-4 text-muted-foreground">سجّل الدخول لعرض طلباتك</p>;
  if (orders.isError)
    return (
      <p role="alert" className="p-4 text-destructive">
        تعذر تحميل الطلبات
      </p>
    );
  return (
    <div dir="rtl" className="space-y-4 p-4 text-foreground">
      {!orders.data?.length ? (
        <p className="text-muted-foreground">لا توجد طلبات نشطة</p>
      ) : (
        orders.data.map((o) => (
          <article key={o.id} className="rounded-lg border bg-card p-4">
            <div className="flex justify-between gap-2">
              <h3 className="font-bold">#{o.id.slice(0, 8)}</h3>
              <span className="text-sm">{statuses[o.status]}</span>
            </div>
            <p className="mt-2 text-sm">الاستلام: {o.pickup_address ?? "لم يحدد بعد"}</p>
            <p className="mt-2 text-sm">التسليم: {o.address}</p>
            <LiveOrderMap orderId={o.id} />
          </article>
        ))
      )}
    </div>
  );
}
