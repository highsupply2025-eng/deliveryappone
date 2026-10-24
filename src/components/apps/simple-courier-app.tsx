import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bike, Clock, Coffee, LogOut, MapPin, Navigation, RefreshCw, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { courierShiftAction } from "@/lib/courier-shifts.functions";
import { WORK_SECONDS, workedSeconds, canRequestBreak, canRejectOrder, courierAvailable } from "@/lib/courier-shift-rules";
import { Button } from "@/components/ui/button";
import { PhoneLogin } from "./phone-login";
import { StaffOnboarding } from "./staff-onboarding";
import { useRealtime } from "@/lib/realtime";
import { useCourierLocation } from "@/lib/live-location";
import { LiveOrderMap } from "./live-order-map";

const duration = (seconds: number) => `${Math.floor(seconds/3600).toString().padStart(2,"0")}:${Math.floor(seconds%3600/60).toString().padStart(2,"0")}:${Math.floor(seconds%60).toString().padStart(2,"0")}`;

export function SimpleCourierApp() {
  const {user,role,loading} = useSession();
  if(loading) return <div dir="rtl" className="min-h-screen bg-background p-6 text-foreground">جارِ التحميل…</div>;
  if(!user) return <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
    <img src="/app-logo.png" alt="FoodHub" className="mb-5 size-16 object-contain" />
    <h1 className="mb-8 text-2xl font-bold tracking-normal">FoodHub المندوب</h1>
    <div className="w-full max-w-sm"><PhoneLogin /></div>
  </div>;
  if(role!=="courier") return <StaffOnboarding userId={user.id} type="courier" />;
  return <CourierWork userId={user.id} />;
}

function CourierWork({userId}:{userId:string}) {
  useRealtime(["orders","courier_shifts"],["courier-work-shifts","courier-work-orders"],"courier-work");
  const qc = useQueryClient();
  const actionFn = useServerFn(courierShiftAction);
  const [now,setNow] = useState(Date.now());
  const [busy,setBusy] = useState(false);
  const shifts = useQuery({queryKey:["courier-work-shifts",userId],queryFn:async()=>{
    const {data,error} = await supabase.from("courier_shifts").select("*").eq("courier_id",userId).order("scheduled_start",{ascending:false}).limit(30);
    if(error) throw error; return data;
  },refetchInterval:15000});
  const shift = shifts.data?.find(s=>s.status==="active") ?? shifts.data?.filter(s=>s.status==="scheduled").sort((a,b)=>a.scheduled_start.localeCompare(b.scheduled_start))[0];
  const orders = useQuery({queryKey:["courier-work-orders",userId],queryFn:async()=>{
    const {data,error} = await supabase.from("orders").select("id,status,address,pickup_address,restaurants(name_ar)").eq("courier_id",userId).in("status",["ready","on_the_way"]).order("created_at");
    if(error) throw error; return data;
  },refetchInterval:10000});
  const refresh = () => void qc.invalidateQueries({predicate:q=>String(q.queryKey[0]).startsWith("courier-work")});
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(timer);},[]);
  useEffect(()=>{
    if(!shift || shift.status!=="active") return;
    let cancelled=false;
    const sync=async()=>{try {await actionFn({data:{shift_id:shift.id,action:"sync"}}); if(!cancelled) refresh();} catch {/* query error is surfaced below */}};
    void sync(); const timer=setInterval(()=>void sync(),15000);
    return ()=>{cancelled=true;clearInterval(timer);};
  },[shift?.id,shift?.status,actionFn]);
  const act=async(action:"start"|"request_break"|"reject"|"pickup"|"deliver",orderId?:string)=>{
    if(!shift) return;
    if(action==="reject" && !window.confirm("رفض هذا الطلب سيستخدم الرفض الوحيد المتاح خلال الشيفت. هل تؤكد؟")) return;
    setBusy(true);
    try {await actionFn({data:{shift_id:shift.id,action,order_id:orderId}}); refresh();toast.success(action==="request_break"?"أُرسل طلب البريك للإدارة":"تم الحفظ");}
    catch(e){toast.error(e instanceof Error?e.message:"تعذر الحفظ");} finally{setBusy(false);}
  };
  const work=shift?.started_at?workedSeconds(Date.parse(shift.started_at),now,shift.break_started_at?Date.parse(shift.break_started_at):undefined,shift.break_ends_at?Date.parse(shift.break_ends_at):undefined):0;
  const onBreak=!!shift?.break_ends_at && now<Date.parse(shift.break_ends_at);
  const available=!!shift && courierAvailable(shift.status,work,onBreak);
  const gpsError=useCourierLocation(orders.data?.[0]?.id,!!shift&&shift.status==="active"&&!onBreak);
  return <div dir="rtl" className="min-h-screen bg-background pb-8 text-foreground">
    <header className="flex items-center justify-between border-b bg-card px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2"><img src="/app-logo.png" alt="" className="size-9 object-contain"/><h1 className="text-lg font-bold tracking-normal">FoodHub المندوب</h1></div>
      <div className="flex gap-1"><Button size="icon" variant="ghost" aria-label="تحديث" onClick={refresh}><RefreshCw className="size-4"/></Button><Button size="icon" variant="ghost" aria-label="خروج" onClick={()=>void supabase.auth.signOut()}><LogOut className="size-4"/></Button></div>
    </header>
    <main className="mx-auto max-w-lg space-y-6 p-4">
      {gpsError&&<p role="alert" className="text-sm text-destructive">{gpsError}</p>}
      {(shifts.isError||orders.isError)&&<p role="alert" className="text-destructive">تعذر تحميل البيانات. حاول التحديث.</p>}
      {!shift?<section className="py-12 text-center"><Clock className="mx-auto mb-3 size-10 text-muted-foreground"/><h2 className="font-bold tracking-normal">غير متاح</h2><p className="mt-3 text-muted-foreground">{shifts.data?.[0]?.status==="completed"?"اكتمل الشيفت؛ يمكنك العودة إلى المنزل":"لا يوجد شيفت محدد"}</p></section>:<>
        <section className="space-y-3 border-b pb-5">
          <div className="flex items-center justify-between"><h2 className="font-bold tracking-normal">الشيفت</h2><span className="text-sm text-muted-foreground">{available?"متاح":onBreak?"غير متاح — بريك":"غير متاح"}</span></div>
          <p className="text-sm">{new Date(shift.scheduled_start).toLocaleString("ar-SA",{timeZone:"Asia/Riyadh",dateStyle:"medium",timeStyle:"short"})}</p>
          <p className="flex gap-2 text-sm text-muted-foreground"><MapPin className="size-4 shrink-0"/>{shift.neighborhoods.join(" · ")}</p>
          <div className="py-3 text-center"><p className="text-sm text-muted-foreground">ساعات العمل الفعلية</p><p dir="ltr" className="mt-2 text-4xl font-bold tabular-nums">{duration(work)}</p><p className="mt-2 text-sm">المتبقي: {duration(WORK_SECONDS-work)}</p></div>
          {onBreak&&<p className="text-center text-sm text-muted-foreground">ينتهي البريك خلال {duration(Math.max(0,(Date.parse(shift.break_ends_at??"")-now)/1000))}</p>}
          {shift.break_status==="requested"&&<p className="text-sm text-muted-foreground">طلب البريك بانتظار موافقة الإدارة</p>}
          {shift.break_status==="rejected"&&<p className="text-sm text-destructive">لم توافق الإدارة على طلب البريك</p>}
          {work>=WORK_SECONDS&&<p className="text-sm text-muted-foreground">{orders.data?.some(o=>o.status==="on_the_way")?"انتهت ساعات الشيفت؛ سلّم الطلب الحالي ثم يمكنك العودة إلى المنزل":"اكتمل الشيفت؛ يمكنك العودة إلى المنزل"}</p>}
          {shift.status==="scheduled"?<Button className="w-full" disabled={busy||now<Date.parse(shift.scheduled_start)} onClick={()=>void act("start")}><Bike className="size-4"/>بدء الشيفت</Button>:<Button className="w-full" variant="outline" disabled={busy||onBreak||!canRequestBreak(shift.status,shift.break_status,shift.break_request_used,work)||!!orders.data?.length} onClick={()=>void act("request_break")}><Coffee className="size-4"/>طلب بريك ساعة</Button>}
        </section>
        <section className="space-y-3"><h2 className="font-bold tracking-normal">الطلب الحالي</h2>
          {!orders.data?.length?<div className="py-8 text-center text-muted-foreground"><PackageCheck className="mx-auto mb-3 size-10"/><p>{onBreak?"أنت في البريك":"لا يوجد طلب حالياً"}</p></div>:orders.data.map(o=><article key={o.id} className="space-y-4 rounded-lg border bg-card p-4">
            <p className="font-bold">طلب #{o.id.slice(0,8)}</p>
            <Location title={`الاستلام · ${o.restaurants?.name_ar??"المطعم"}`} address={o.pickup_address??"لم تحدد الإدارة موقع الاستلام"}/>
            <Location title="التسليم" address={o.address}/>
            <LiveOrderMap orderId={o.id}/>
            <Button className="w-full" disabled={busy||onBreak||(o.status==="ready"&&work>=WORK_SECONDS)} onClick={()=>void act(o.status==="ready"?"pickup":"deliver",o.id)}>{o.status==="ready"?"تم استلام الطلب":"تم تسليم الطلب"}</Button>
            {o.status==="ready"&&<Button className="w-full" variant="outline" disabled={busy||onBreak||!canRejectOrder(shift.rejected_order_id,o.status,work)} onClick={()=>void act("reject",o.id)}>رفض الطلب</Button>}
          </article>)}
        </section>
      </>}
      {!!shifts.data?.filter(s=>['completed','incomplete'].includes(s.status)).length&&<section className="border-t pt-4"><h2 className="mb-3 text-sm font-bold tracking-normal">سجل الأيام</h2>{shifts.data.filter(s=>['completed','incomplete'].includes(s.status)).map(s=><div key={s.id} className="flex justify-between gap-3 py-2 text-sm"><span>{new Date(s.scheduled_start).toLocaleDateString("ar-SA")}</span><span className={s.salary_day_eligible?"text-success":"text-destructive"}>{s.salary_day_eligible?"يوم مستحق":"غير مستحق — أقل من 10 ساعات"}</span></div>)}</section>}
    </main>
  </div>;
}
function Location({title,address}:{title:string;address:string}) {
  return <div><p className="mb-1 text-xs text-muted-foreground">{title}</p><p className="text-sm leading-7">{address}</p><Button asChild variant="outline" size="sm" className="mt-2"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer"><Navigation className="size-4"/>الموقع</a></Button></div>;
}