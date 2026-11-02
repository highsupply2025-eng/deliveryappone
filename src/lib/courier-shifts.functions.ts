import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { shiftAssignmentSchema } from "./courier-shift-rules";

export const assignCourierShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => shiftAssignmentSchema.parse(d))
  .handler(async ({data, context}) => {
    const {data: admin, error: roleError} = await context.supabase.rpc("has_role", {_user_id: context.userId, _role:"admin"});
    if (roleError || !admin) throw new Error("غير مصرح");
    const {data: row, error} = await context.supabase.from("courier_shifts").insert({...data, created_by:context.userId}).select().single();
    if(error) throw new Error(error.message);
    return row;
  });

export const courierShiftAction = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({shift_id:z.string().uuid(), action:z.enum(["start","sync","request_break","reject","accept","pickup"]), order_id:z.string().uuid().optional()}).parse(d))
  .handler(async ({data, context}) => {
    const {data: result, error} = await context.supabase.rpc("courier_shift_action", {p_shift_id:data.shift_id,p_action:data.action,...(data.order_id ? {p_order_id:data.order_id} : {})});
    if(error) throw new Error(error.message);
    return result;
  });

export const reviewCourierBreak = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({shift_id:z.string().uuid(),approve:z.boolean()}).parse(d))
  .handler(async ({data,context}) => {
    const {error} = await context.supabase.rpc("review_courier_break", {p_shift_id:data.shift_id,p_approve:data.approve});
    if(error) throw new Error(error.message);
    return {ok:true};
  });

export const courierDeliverOrder = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({order_id:z.string().uuid(),code:z.string().trim().regex(/^\d{4}$/,"الكود 4 أرقام")}).parse(d))
  .handler(async ({data,context}) => {
    const {data: result, error} = await context.supabase.rpc("courier_deliver_order", {p_order_id:data.order_id,p_code:data.code});
    if(error) throw new Error(error.message);
    return result as {ok:boolean;remaining?:number};
  });

export const courierSetOnline = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({online:z.boolean()}).parse(d))
  .handler(async ({data,context}) => {
    const {data: result, error} = await context.supabase.rpc("courier_set_online", {p_online:data.online});
    if(error) throw new Error(error.message);
    return result as {online:boolean};
  });
