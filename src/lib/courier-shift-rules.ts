import { z } from "zod";

export const WORK_SECONDS = 10 * 60 * 60;
export const BREAK_SECONDS = 60 * 60;
export const MAX_COURIER_RADIUS_KM = 10;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function evaluateOrderCourierProximity(params: {
  courierLat?: number | null | undefined;
  courierLng?: number | null | undefined;
  pickupLat?: number | null | undefined;
  pickupLng?: number | null | undefined;
  deliveryLat?: number | null | undefined;
  deliveryLng?: number | null | undefined;
  maxRadiusKm?: number | undefined;
}) {
  const maxRadiusKm = params.maxRadiusKm ?? MAX_COURIER_RADIUS_KM;
  const hasCourier =
    params.courierLat != null &&
    params.courierLng != null &&
    Number.isFinite(params.courierLat) &&
    Number.isFinite(params.courierLng);

  const hasPickup =
    params.pickupLat != null &&
    params.pickupLng != null &&
    Number.isFinite(params.pickupLat) &&
    Number.isFinite(params.pickupLng);

  const hasDelivery =
    params.deliveryLat != null &&
    params.deliveryLng != null &&
    Number.isFinite(params.deliveryLat) &&
    Number.isFinite(params.deliveryLng);

  const restaurantDistanceKm =
    hasCourier && hasPickup
      ? haversineKm(params.courierLat!, params.courierLng!, params.pickupLat!, params.pickupLng!)
      : null;

  const customerDistanceKm =
    hasCourier && hasDelivery
      ? haversineKm(params.courierLat!, params.courierLng!, params.deliveryLat!, params.deliveryLng!)
      : null;

  const distanceKm =
    restaurantDistanceKm != null && customerDistanceKm != null
      ? Math.min(restaurantDistanceKm, customerDistanceKm)
      : restaurantDistanceKm ?? customerDistanceKm;

  const withinRadius =
    !hasCourier || (!hasPickup && !hasDelivery)
      ? true
      : (restaurantDistanceKm != null && restaurantDistanceKm <= maxRadiusKm) ||
        (customerDistanceKm != null && customerDistanceKm <= maxRadiusKm);

  return {
    restaurantDistanceKm,
    customerDistanceKm,
    distanceKm,
    withinRadius,
  };
}
export const canRequestBreak = (status: string, breakStatus: string, used: boolean, seconds: number) => status === "active" && breakStatus === "none" && !used && seconds < WORK_SECONDS;
export const canRejectOrder = (rejectedOrderId: string | null, orderStatus: string, seconds: number) => rejectedOrderId === null && ["pending","accepted","preparing","ready"].includes(orderStatus) && seconds < WORK_SECONDS;
export const courierAvailable = (status: string, seconds: number, onBreak: boolean) => status === "active" && seconds < WORK_SECONDS && !onBreak;
export const shiftAssignmentSchema = z.object({
  courier_id: z.string().uuid(),
  scheduled_start: z.string().datetime({ offset: true }),
  neighborhoods: z.array(z.string().trim().min(2).max(100)).length(3)
    .refine((areas) => new Set(areas).size === 3, "الأحياء يجب أن تكون مختلفة"),
  adjacent_confirmed: z.literal(true),
});

export function workedSeconds(start: number, end: number, breakStart?: number, breakEnd?: number) {
  const pause = breakStart === undefined || breakEnd === undefined ? 0 : Math.max(0, Math.min(end, breakEnd) - Math.max(start, breakStart));
  return Math.min(WORK_SECONDS, Math.max(0, Math.floor((end - start - pause) / 1000)));
}
export const salaryDayEligible = (seconds: number) => seconds >= WORK_SECONDS;

export const ADMIN_COMPLETED_ORDER_RETENTION_MS = 24 * 60 * 60 * 1000;
export const ADMIN_INCOMPLETE_ORDER_RETENTION_MS = 48 * 60 * 60 * 1000;

export function isAdminOrderVisible(
  order: { status: string; created_at: string; updated_at?: string | null | undefined },
  nowMs: number = Date.now(),
): boolean {
  const isCompleted = order.status === "delivered";
  const refIso = isCompleted ? order.updated_at || order.created_at : order.created_at;
  const refMs = Date.parse(refIso);
  if (!Number.isFinite(refMs)) return true;
  const elapsedMs = Math.max(0, nowMs - refMs);
  const maxRetentionMs = isCompleted
    ? ADMIN_COMPLETED_ORDER_RETENTION_MS
    : ADMIN_INCOMPLETE_ORDER_RETENTION_MS;
  return elapsedMs < maxRetentionMs;
}

export function getAdminOrderNonArrivalReason(order: {
  status: string;
  courier_id?: string | null | undefined;
  pickup_address?: string | null | undefined;
  delivery_neighborhood?: string | null | undefined;
  notes?: string | null | undefined;
}): string {
  if (order.status === "delivered") {
    return "وصل الطلب للعميل واكتمل بنجاح";
  }
  if (order.status === "cancelled") {
    return order.notes?.trim() ? `تم إلغاء الطلب (${order.notes.trim()})` : "تم إلغاء الطلب قبل الوصول";
  }
  if (!order.pickup_address || !order.delivery_neighborhood) {
    return "لم يكتمل تحديد موقع الاستلام أو حي التسليم للطلب";
  }
  if (!order.courier_id) {
    return "لم يستلمه مندوب بعد (بانتظار مندوب متاح ضمن النطاق)";
  }
  if (order.status === "pending" || order.status === "accepted" || order.status === "preparing") {
    return "الطلب قيد التحضير في المطعم ولم يخرج للتوصيل بعد";
  }
  if (order.status === "ready") {
    return "الطلب جاهز في المطعم بانتظار استلام المندوب له";
  }
  if (order.status === "on_the_way") {
    return "الطلب مع المندوب في الطريق للعميل ولم يتم تأكيد التسليم بعد";
  }
  return "قيد المتابعة لمعرفة سبب عدم الوصول";
}
