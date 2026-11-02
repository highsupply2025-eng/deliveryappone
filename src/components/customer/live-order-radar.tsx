import { useQuery } from "@tanstack/react-query";
import { LiveOrderMap } from "@/components/apps/live-order-map";
import { supabase } from "@/integrations/supabase/client";
interface LiveOrderRadarProps {orderId?:string|undefined;restaurantName?:string|undefined;deliveryAddress?:string|undefined;status?:string|undefined;createdTime?:string;}
export function LiveOrderRadar({orderId,restaurantName,deliveryAddress,status}:LiveOrderRadarProps) {
 const labels:Record<string,string>={pending:"بانتظار قبول المندوب",accepted:"قيد التحضير",preparing:"قيد التحضير",ready:"قيد التحضير",on_the_way:"المندوب في الطريق إليك",delivered:"تم التسليم",cancelled:"ملغي"};
 const code=useQuery({queryKey:["customer-delivery-code"],queryFn:async()=>{const {data:u}=await supabase.auth.getUser();if(!u.user)return null;const {data,error}=await supabase.from("profiles").select("delivery_code").eq("id",u.user.id).maybeSingle();if(error)throw error;return data?.delivery_code??null;}});
 if(!orderId) return <p className="text-muted-foreground">لا يوجد طلب نشط</p>;
 return <section dir="rtl" className="space-y-3 border-b pb-4 text-foreground"><h3 className="font-bold">{restaurantName}</h3><p>{status?labels[status]:""}</p><p className="text-sm">{deliveryAddress}</p>{code.data&&status!=="delivered"&&status!=="cancelled"&&<p className="rounded-lg border bg-card p-3 text-center">كود التسليم — أعطه للمندوب عند الاستلام: <strong dir="ltr" className="ms-2 text-2xl tracking-[0.3em]">{code.data}</strong></p>}<LiveOrderMap orderId={orderId}/></section>;
}
