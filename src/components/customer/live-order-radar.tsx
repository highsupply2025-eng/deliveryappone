import { LiveOrderMap } from "@/components/apps/live-order-map";
interface LiveOrderRadarProps {orderId?:string|undefined;restaurantName?:string|undefined;deliveryAddress?:string|undefined;status?:string|undefined;createdTime?:string;}
export function LiveOrderRadar({orderId,restaurantName,deliveryAddress,status}:LiveOrderRadarProps) {
 const labels:Record<string,string>={pending:"بانتظار قبول المندوب",accepted:"قيد التحضير",preparing:"قيد التحضير",ready:"قيد التحضير",on_the_way:"المندوب في الطريق إليك",delivered:"تم التسليم",cancelled:"ملغي"};
 if(!orderId) return <p className="text-muted-foreground">لا يوجد طلب نشط</p>;
 return <section dir="rtl" className="space-y-3 border-b pb-4 text-foreground"><h3 className="font-bold">{restaurantName}</h3><p>{status?labels[status]:""}</p><p className="text-sm">{deliveryAddress}</p><LiveOrderMap orderId={orderId}/></section>;
}
