CREATE OR REPLACE FUNCTION public.courier_set_online(p_online boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid:=auth.uid(); s public.courier_shifts; last public.courier_shifts;
BEGIN
 IF uid IS NULL OR NOT public.has_role(uid,'courier') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
 PERFORM public.complete_due_courier_shifts();
 SELECT * INTO s FROM public.courier_shifts WHERE courier_id=uid AND status='active' ORDER BY started_at DESC LIMIT 1 FOR UPDATE;
 IF p_online THEN
  IF FOUND THEN RETURN jsonb_build_object('online',true); END IF;
  SELECT * INTO s FROM public.courier_shifts WHERE courier_id=uid AND status='scheduled' ORDER BY scheduled_start LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
   SELECT * INTO last FROM public.courier_shifts WHERE courier_id=uid ORDER BY created_at DESC LIMIT 1;
   IF NOT FOUND THEN RAISE EXCEPTION 'لم تحدد الإدارة أحياء التغطية لك بعد'; END IF;
   INSERT INTO public.courier_shifts(courier_id,scheduled_start,neighborhoods,adjacent_confirmed,created_by)
   VALUES(uid,now(),last.neighborhoods,true,uid) RETURNING * INTO s;
  END IF;
  UPDATE public.courier_shifts SET status='active',started_at=now() WHERE id=s.id;
  RETURN jsonb_build_object('online',true);
 END IF;
 IF NOT FOUND THEN RETURN jsonb_build_object('online',false); END IF;
 IF EXISTS(SELECT 1 FROM public.orders WHERE courier_id=uid AND (status='on_the_way' OR (courier_accepted_at IS NOT NULL AND status IN ('preparing','ready')))) THEN
  RAISE EXCEPTION 'أكمل الطلب الحالي قبل التحول إلى أوفلاين';
 END IF;
 UPDATE public.orders SET courier_id=NULL WHERE courier_id=uid AND status IN ('pending','accepted','preparing','ready');
 UPDATE public.courier_shifts SET status=CASE WHEN public.shift_work_seconds(s)>=36000 THEN 'completed' ELSE 'incomplete' END, ended_at=now() WHERE id=s.id;
 RETURN jsonb_build_object('online',false);
END $$;
REVOKE ALL ON FUNCTION public.courier_set_online(boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.courier_set_online(boolean) TO authenticated;