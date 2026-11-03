import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  CheckCircle2,
  Clock,
  Receipt,
  PackageCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const statusLabel: Record<string, string> = {
  pending: "قيد المراجعة",
  paid: "تم التحويل ✓",
  rejected: "مرفوضة",
};

/** مبيعات المطعم من الطلبات المسلّمة، والمطالبة بالمستحق (يُحسب في قاعدة البيانات). */
export function RestaurantSales({ restaurantId }: { restaurantId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const data = useQuery({
    queryKey: ["restaurant-sales", restaurantId],
    queryFn: async () => {
      const [o, p] = await Promise.all([
        supabase
          .from("orders")
          .select("id,subtotal,total,created_at,updated_at,address")
          .eq("restaurant_id", restaurantId)
          .eq("status", "delivered")
          .order("updated_at", { ascending: false }),
        supabase
          .from("restaurant_payout_requests")
          .select("id,amount,status,created_at")
          .eq("restaurant_id", restaurantId)
          .order("created_at", { ascending: false }),
      ]);
      if (o.error) throw o.error;
      if (p.error) throw p.error;
      return { orders: o.data, payouts: p.data };
    },
  });

  if (data.isError)
    return (
      <p
        role="alert"
        className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
      >
        تعذر تحميل المبيعات والمستحقات المالية
      </p>
    );
  if (data.isPending)
    return (
      <div className="rounded-2xl border bg-card py-12 text-center text-sm text-muted-foreground">
        جارِ تحميل التقارير المالية…
      </div>
    );

  const today = new Date().toDateString();
  const sum = (xs: { subtotal: number }[]) =>
    xs.reduce((a, x) => a + Number(x.subtotal), 0);

  const deliveredOrders = data.data.orders;
  const payouts = data.data.payouts;

  const total = sum(deliveredOrders);
  const todayOrders = deliveredOrders.filter(
    (x) => new Date(x.created_at).toDateString() === today,
  );
  const todayTotal = sum(todayOrders);
  const claimed = payouts
    .filter((x) => x.status !== "rejected")
    .reduce((a, x) => a + Number(x.amount), 0);
  const due = Math.max(0, total - claimed);
  const pending = payouts.some((x) => x.status === "pending");
  const avgOrder =
    deliveredOrders.length > 0 ? total / deliveredOrders.length : 0;

  const claim = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("request_restaurant_payout", {
      p_restaurant_id: restaurantId,
    });
    setBusy(false);
    if (error) {
      toast.error("تعذر إرسال المطالبة المالية");
    } else {
      toast.success("تم إرسال المطالبة المالية للإدارة بنجاح ✓");
      void qc.invalidateQueries({
        queryKey: ["restaurant-sales", restaurantId],
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Financial KPI Grid */}
      <section className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>مبيعات اليوم</span>
            <TrendingUp className="size-4 text-primary" />
          </div>
          <p className="mt-1 text-xl font-black text-primary">
            {todayTotal.toFixed(2)} <span className="text-xs font-bold">ر.س</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {todayOrders.length} طلب مسلّم اليوم
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>إجمالي المبيعات</span>
            <Receipt className="size-4 text-primary" />
          </div>
          <p className="mt-1 text-xl font-black">
            {total.toFixed(2)} <span className="text-xs font-bold">ر.س</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            متوسط الطلب: {avgOrder.toFixed(0)} ر.س
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>تمت المطالبة به</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-xl font-black text-emerald-700">
            {claimed.toFixed(2)} <span className="text-xs font-bold">ر.س</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            من إجمالي {deliveredOrders.length} طلب مكتمل
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>الرصيد المستحق الآن</span>
            <Wallet className="size-4 text-amber-600" />
          </div>
          <p className="mt-1 text-xl font-black text-amber-700">
            {due.toFixed(2)} <span className="text-xs font-bold">ر.س</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {due > 0 ? "متاح لطلب التحويل" : "لا يوجد رصيد معلق"}
          </p>
        </div>
      </section>

      {/* Claim Payout Action Card */}
      <section className="rounded-2xl border bg-card p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm">طلب تحويل المستحقات المالية</h2>
            <p className="text-xs text-muted-foreground">
              عدد الطلبات المسلمة للعملاء بنجاح: <strong>{deliveredOrders.length}</strong> طلب
            </p>
          </div>
          <PackageCheck className="size-6 text-primary" />
        </div>
        <Button
          className="w-full gap-1.5"
          disabled={busy || pending || due <= 0}
          onClick={() => void claim()}
        >
          <Wallet className="size-4" />
          {pending
            ? "لديك مطالبة مالية قيد المراجعة لدى الإدارة"
            : `المطالبة بالمستحق المالي (${due.toFixed(2)} ر.س)`}
        </Button>
      </section>

      {/* Payout Requests History */}
      <section className="space-y-2.5">
        <h2 className="font-bold text-sm">سجل المطالبات والتحويلات المالية ({payouts.length})</h2>
        {!payouts.length ? (
          <div className="rounded-2xl border bg-card py-8 text-center text-xs text-muted-foreground">
            لا توجد مطالبات مالية سابقة بعد
          </div>
        ) : (
          payouts.map((x) => (
            <div
              key={x.id}
              className="flex items-center justify-between rounded-2xl border bg-card p-3.5 text-xs shadow-xs"
            >
              <div className="space-y-0.5">
                <p className="font-bold text-sm">{Number(x.amount).toFixed(2)} ر.س</p>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" />
                  {new Date(x.created_at).toLocaleDateString("ar-SA")}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 font-bold ${
                  x.status === "paid"
                    ? "bg-emerald-500/15 text-emerald-700"
                    : x.status === "rejected"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-amber-500/15 text-amber-800"
                }`}
              >
                {statusLabel[x.status] ?? x.status}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
