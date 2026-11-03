import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  ChefHat,
  PackageCheck,
  Bike,
  CheckCircle2,
  MapPin,
  Store,
  KeyRound,
  Receipt,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { useRealtime } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import { LiveOrderMap } from "./live-order-map";

const statuses: Record<string, string> = {
  pending: "بانتظار قبول أقرب مندوب (نطاق 10 كم)",
  accepted: "تم قبول الطلب وتوجيهه للمطعم",
  preparing: "قيد التحضير في المطبخ",
  ready: "جاهز في المطعم بانتظار استلام المندوب",
  on_the_way: "المندوب في الطريق إليك الآن",
  delivered: "تم التسليم بنجاح ✓",
  cancelled: "ملغي",
};

export function LiveTrackingList({ customerOnly = false }: { customerOnly?: boolean }) {
  const { user, loading } = useSession();
  const [view, setView] = useState<"active" | "past">("active");
  useRealtime(["orders", "order_items"], ["live-tracking-orders"], "tracking-list");

  const profile = useQuery({
    queryKey: ["tracking-delivery-code", user?.id],
    enabled: !!user && customerOnly,
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("delivery_code")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const orders = useQuery({
    queryKey: ["live-tracking-orders", user?.id, customerOnly],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("orders")
        .select(
          "id,status,address,pickup_address,total,subtotal,delivery_fee,created_at,updated_at,restaurants(name_ar),order_items(name_ar,quantity,price)",
        )
        .order("created_at", { ascending: false })
        .limit(40);
      if (customerOnly) query = query.eq("customer_id", user.id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  if (loading || (orders.isPending && user))
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
        جارِ تحميل طلباتك الحية…
      </div>
    );
  if (!user)
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
        سجّل الدخول لعرض وتتبع طلباتك لحظياً
      </div>
    );
  if (orders.isError)
    return (
      <p
        role="alert"
        className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
      >
        تعذر تحميل الطلبات
      </p>
    );

  const all = orders.data ?? [];
  const activeOrders = all.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  );
  const pastOrders = all.filter(
    (o) => o.status === "delivered" || o.status === "cancelled",
  );
  const shown = view === "active" ? activeOrders : pastOrders;

  return (
    <div dir="rtl" className="space-y-4 text-foreground">
      {/* Delivery Verification Code Banner for Customer */}
      {customerOnly && profile.data?.delivery_code && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-400/50 bg-amber-50/90 p-3.5 text-slate-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
              <KeyRound className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold">كود تأكيد استلام الطلب (أعطه للمندوب عند الوصول)</p>
              <p className="text-[11px] text-slate-600">
                لا تسلم هذا الكود للمندوب إلا عند استلام وجبتك فعلياً
              </p>
            </div>
          </div>
          <span
            dir="ltr"
            className="rounded-xl bg-slate-950 px-3.5 py-1.5 font-mono text-lg font-black tracking-widest text-amber-400"
          >
            {profile.data.delivery_code}
          </span>
        </div>
      )}

      {/* Active vs Past Orders Toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border bg-card p-1.5 shadow-xs">
        <Button
          size="sm"
          variant={view === "active" ? "default" : "ghost"}
          onClick={() => setView("active")}
          className="gap-1.5 text-xs"
        >
          <Bike className="size-4" />
          الطلبات النشطة ({activeOrders.length})
        </Button>
        <Button
          size="sm"
          variant={view === "past" ? "default" : "ghost"}
          onClick={() => setView("past")}
          className="gap-1.5 text-xs"
        >
          <Receipt className="size-4" />
          السابقة ({pastOrders.length})
        </Button>
      </div>

      {!shown.length ? (
        <div className="rounded-2xl border bg-card py-12 text-center text-muted-foreground shadow-xs">
          <PackageCheck className="mx-auto mb-3 size-10 opacity-60" />
          <p className="font-bold text-foreground">
            {view === "active"
              ? "لا توجد طلبات نشطة حالياً"
              : "لا توجد طلبات سابقة في السجل"}
          </p>
          <p className="mt-1 text-xs">
            {view === "active"
              ? "اطلب وجبتك المفضلة الآن وتابع تحضيرها وحركة المندوب مباشرة على الخريطة"
              : "ستظهر هنا جميع طلباتك المكتملة فور تسليمها"}
          </p>
        </div>
      ) : (
        shown.map((o) => {
          const restName =
            (o.restaurants as { name_ar?: string } | null)?.name_ar ?? "مطعم FoodHub";
          const step =
            o.status === "pending"
              ? 1
              : o.status === "accepted" || o.status === "preparing"
                ? 2
                : o.status === "ready"
                  ? 3
                  : 4;

          return (
            <article
              key={o.id}
              className="space-y-3.5 rounded-2xl border bg-card p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base">طلب #{o.id.slice(0, 8)}</h3>
                    <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                      <Store className="size-3.5" />
                      {restName}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(o.created_at).toLocaleString("ar-SA")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      o.status === "delivered"
                        ? "bg-emerald-500/15 text-emerald-700"
                        : o.status === "cancelled"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-amber-500/15 text-amber-800"
                    }`}
                  >
                    {statuses[o.status] ?? o.status}
                  </span>
                  <span className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-black">
                    {Number(o.total).toFixed(2)} ر.س
                  </span>
                </div>
              </div>

              {/* 4-Step Visual Progress Tracker for Active Orders */}
              {view === "active" && (
                <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-secondary/40 p-2 text-center text-[10px]">
                  {[
                    { s: 1, label: "توجيه للمندوب", icon: Clock },
                    { s: 2, label: "تحضير المطعم", icon: ChefHat },
                    { s: 3, label: "جاهز للاستلام", icon: PackageCheck },
                    { s: 4, label: "في الطريق إليك", icon: Bike },
                  ].map((st) => {
                    const done = step > st.s;
                    const active = step === st.s;
                    return (
                      <div
                        key={st.s}
                        className={`flex flex-col items-center gap-1 rounded-lg p-1.5 font-semibold ${
                          active
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : done
                              ? "bg-emerald-500/15 text-emerald-700"
                              : "text-muted-foreground"
                        }`}
                      >
                        <span className="flex size-4 items-center justify-center rounded-full border border-current text-[9px] font-bold">
                          {done ? <Check className="size-2.5" /> : st.s}
                        </span>
                        <span>{st.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Order Items */}
              {o.order_items && o.order_items.length > 0 && (
                <div className="rounded-xl bg-secondary/30 p-3 space-y-1 text-xs">
                  {o.order_items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="font-semibold">
                        {item.quantity} × {item.name_ar}
                      </span>
                      <span className="text-muted-foreground">
                        {(Number(item.price) * item.quantity).toFixed(2)} ر.س
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <Store className="size-3.5 text-primary shrink-0" />
                  <span>الاستلام: {o.pickup_address ?? restName}</span>
                </p>
                <p className="flex items-center gap-1.5 text-foreground font-medium">
                  <MapPin className="size-3.5 text-primary shrink-0" />
                  <span>التسليم: {o.address}</span>
                </p>
              </div>

              {view === "active" && <LiveOrderMap orderId={o.id} />}
            </article>
          );
        })
      )}
    </div>
  );
}
