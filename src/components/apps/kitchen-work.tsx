import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { useRealtime } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import { PhoneLogin } from "./phone-login";
import { StaffOnboarding } from "./staff-onboarding";
import { LiveOrderMap } from "./live-order-map";
import { RestaurantMenu } from "./restaurant-menu";
import { toast } from "sonner";

export function KitchenWork() {
  const {user,role,loading}=useSession();
  if(loading)return <p className="p-6 text-muted-foreground">جارِ الفتح…</p>;
  if(!user)return <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground"><div className="w-full max-w-sm space-y-5"><img src="/app-logo.png" alt="FoodHub" className="size-16"/><h1 className="text-xl font-bold">FoodHub المطعم</h1><PhoneLogin /></div></div>;
  if(role!=="restaurant"&&role!=="admin")return <StaffOnboarding userId={user.id} type="restaurant" />;
  return <Tickets userId={user.id} admin={role==="admin"}/>;
}
function Tickets({userId,admin}:{userId:string;admin:boolean}) {
  const qc=useQueryClient();
  const [busy,setBusy]=useState(false);
  const [tab,setTab]=useState<"orders"|"products"|"offers"|"tracking">("orders");
  useRealtime(["orders","order_items"],["kitchen-live-orders"],"kitchen-live");
  const restaurant=useQuery({queryKey:["kitchen-restaurant",userId],queryFn:async()=>{
    let q=supabase.from("restaurants").select("id,name_ar");if(!admin)q=q.eq("owner_id",userId);
    const {data,error}=await q.limit(1).maybeSingle();if(error)throw error;return data;
  }});
  const orders=useQuery({queryKey:["kitchen-live-orders",restaurant.data?.id],enabled:!!restaurant.data,queryFn:async()=>{
    if(!restaurant.data)return [];
    const {data,error}=await supabase.from("orders").select("id,status,address,total,order_items(name_ar,quantity)").eq("restaurant_id",restaurant.data.id).not("status","in","(delivered,cancelled)").order("created_at");
    if(error)throw error;return data;
  }});
  const advance=async(id:string,status:"preparing"|"ready")=>{setBusy(true);const {error}=await supabase.from("orders").update({status}).eq("id",id);setBusy(false);if(error)toast.error("تعذر تحديث الطلب");else void qc.invalidateQueries({queryKey:["kitchen-live-orders"]});};
  return <div dir="rtl" className="min-h-screen bg-background text-foreground"><header className="flex items-center justify-between border-b bg-card p-4"><h1 className="font-bold">{restaurant.data?.name_ar??"FoodHub المطعم"}</h1><Button variant="ghost" onClick={()=>void supabase.auth.signOut()}>خروج</Button></header><main className="mx-auto max-w-xl space-y-4 p-4">{restaurant.isError||orders.isError?<p role="alert" className="text-destructive">تعذر تحميل الطلبات</p>:restaurant.isPending||orders.isPending&&restaurant.data?<p>جارِ تحميل الطلبات…</p>:!restaurant.data?<p>لا يوجد مطعم مرتبط بحسابك</p>:!orders.data?.length?<p className="text-muted-foreground">لا توجد طلبات نشطة</p>:orders.data.map(o=><article key={o.id} className="space-y-3 rounded-lg border bg-card p-4"><div className="flex justify-between"><h2 className="font-bold">#{o.id.slice(0,8)}</h2><span>{o.status==="pending"||o.status==="accepted"?"جديد":o.status==="preparing"?"قيد التحضير":o.status==="ready"?"جاهز للاستلام":"مع المندوب"}</span></div>{o.order_items.map((i,n)=><p key={n} className="text-sm">{i.quantity} × {i.name_ar}</p>)}<p className="text-sm">{o.address}</p>{["pending","accepted","preparing"].includes(o.status)&&<Button disabled={busy} onClick={()=>void advance(o.id,o.status==="preparing"?"ready":"preparing")}>{o.status==="preparing"?"جاهز للاستلام":"قبول وبدء التحضير"}</Button>}<LiveOrderMap orderId={o.id}/></article>)}</main></div>;
}