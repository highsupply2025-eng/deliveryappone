ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS delivery_code text DEFAULT lpad(floor(random()*10000)::int::text,4,'0');
UPDATE public.profiles SET delivery_code=lpad(floor(random()*10000)::int::text,4,'0') WHERE delivery_code IS NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_accepted_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_code_attempts integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.pick_courier_for_order(p_order_id uuid, p_neighborhood text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.courier_shifts;
BEGIN
  SELECT * INTO s FROM public.courier_shifts cs
   WHERE cs.status='active' AND public.shift_work_seconds(cs)<36000
     AND (cs.break_ends_at IS NULL OR now()>=cs.break_ends_at)
     AND EXISTS(SELECT 1 FROM unnest(cs.neighborhoods) n WHERE public.norm_area(n)=public.norm_area(p_neighborhood))
     AND (cs.rejected_order_id IS NULL OR cs.rejected_order_id<>p_order_id)
     AND NOT EXISTS(SELECT 1 FROM public.orders o WHERE o.courier_id=cs.courier_id AND o.status IN ('pending','accepted','preparing','ready','on_the_way') AND o.id<>p_order_id)
   ORDER BY cs.started_at FOR UPDATE SKIP LOCKED LIMIT 1;
  RETURN s.courier_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.pick_courier_for_order(uuid,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dispatch_ready_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.courier_id IS NULL THEN NEW.courier_accepted_at := NULL; END IF;
  IF NEW.status IN ('pending','preparing','ready') AND NEW.courier_id IS NULL
     AND length(btrim(coalesce(NEW.pickup_address,'')))>0 AND NEW.delivery_neighborhood IS NOT NULL THEN
    NEW.courier_id := public.pick_courier_for_order(NEW.id, NEW.delivery_neighborhood);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS orders_zz_dispatch_new ON public.orders;
CREATE TRIGGER orders_zz_dispatch_new BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.dispatch_ready_order();

CREATE OR REPLACE FUNCTION public.guard_order_direct_update()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF current_user='authenticated' AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.courier_id := OLD.courier_id; NEW.courier_accepted_at := OLD.courier_accepted_at; NEW.delivery_code_attempts := OLD.delivery_code_attempts;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
      (OLD.status='preparing' AND NEW.status='ready' AND OLD.courier_accepted_at IS NOT NULL)
      OR (OLD.status IN ('pending','accepted') AND NEW.status='cancelled')) THEN
      RAISE EXCEPTION 'لا يمكن تغيير حالة الطلب الآن';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_aa_guard ON public.orders;
CREATE TRIGGER orders_aa_guard BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_order_direct_update();

CREATE OR REPLACE FUNCTION public.complete_due_courier_shifts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.courier_shifts;
BEGIN
 FOR s IN SELECT * FROM public.courier_shifts WHERE status='active' AND public.shift_work_seconds(courier_shifts)>=36000 FOR UPDATE SKIP LOCKED LOOP
 UPDATE public.orders SET courier_id=NULL WHERE courier_id=s.courier_id AND status IN ('pending','accepted','preparing','ready');
 IF NOT EXISTS(SELECT 1 FROM public.orders WHERE courier_id=s.courier_id AND status='on_the_way') THEN
 UPDATE public.courier_shifts SET status='completed',ended_at=started_at+interval '10 hours'+CASE WHEN break_started_at IS NOT NULL THEN interval '1 hour' ELSE interval '0 hour' END WHERE id=s.id;
 END IF;
 END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.courier_shift_action(p_shift_id uuid, p_action text, p_order_id uuid DEFAULT NULL::uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.courier_shifts; o public.orders; uid uuid:=auth.uid(); seconds integer;
BEGIN
 IF uid IS NULL OR NOT public.has_role(uid,'courier') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
 SELECT * INTO s FROM public.courier_shifts WHERE id=p_shift_id AND courier_id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'الشيفت غير موجود'; END IF;
 IF p_action='start' THEN
 PERFORM public.complete_due_courier_shifts();
 IF s.status<>'scheduled' OR now()<s.scheduled_start THEN RAISE EXCEPTION 'لم يبدأ موعد الشيفت أو تم بدء الشيفت مسبقاً'; END IF;
 UPDATE public.courier_shifts SET status='active',started_at=now() WHERE id=s.id RETURNING * INTO s;
 ELSIF p_action='request_break' THEN
 IF s.status<>'active' OR s.break_status<>'none' OR s.break_request_used OR public.shift_work_seconds(s)>=36000 THEN RAISE EXCEPTION 'البريك متاح مرة واحدة فقط خلال الشيفت'; END IF;
 IF EXISTS(SELECT 1 FROM public.orders WHERE courier_id=uid AND status IN ('pending','accepted','preparing','ready','on_the_way')) THEN RAISE EXCEPTION 'أكمل الطلب الحالي أولاً'; END IF;
 UPDATE public.courier_shifts SET break_status='requested',break_request_used=true WHERE id=s.id RETURNING * INTO s;
 ELSIF p_action='accept' THEN
 IF s.status<>'active' OR public.shift_work_seconds(s)>=36000 OR (s.break_ends_at IS NOT NULL AND now()<s.break_ends_at) THEN RAISE EXCEPTION 'الشيفت غير متاح'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id AND courier_id=uid AND courier_accepted_at IS NULL AND status IN ('pending','accepted','preparing','ready') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'الطلب غير متاح للقبول'; END IF;
 UPDATE public.orders SET courier_accepted_at=now(), status=CASE WHEN status IN ('pending','accepted') THEN 'preparing'::public.order_status ELSE status END WHERE id=o.id;
 ELSIF p_action='reject' THEN
 IF s.status<>'active' OR public.shift_work_seconds(s)>=36000 OR (s.break_ends_at IS NOT NULL AND now()<s.break_ends_at) THEN RAISE EXCEPTION 'الشيفت غير متاح'; END IF;
 IF s.rejected_order_id IS NOT NULL THEN RAISE EXCEPTION 'يمكن رفض طلب واحد فقط خلال الشيفت'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id AND courier_id=uid AND status IN ('pending','accepted','preparing','ready') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'يمكن رفض الطلب قبل استلامه فقط'; END IF;
 UPDATE public.courier_shifts SET rejected_order_id=o.id WHERE id=s.id RETURNING * INTO s;
 UPDATE public.orders SET courier_id=NULL WHERE id=o.id;
 ELSIF p_action='pickup' THEN
 IF s.status<>'active' OR (s.break_started_at IS NOT NULL AND now()<s.break_ends_at) THEN RAISE EXCEPTION 'الشيفت غير نشط أو الاستراحة مستمرة'; END IF;
 IF public.shift_work_seconds(s)>=36000 THEN RAISE EXCEPTION 'انتهى الشيفت؛ لا يمكن استلام طلب جديد'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id AND courier_id=uid AND courier_accepted_at IS NOT NULL AND status IN ('preparing','ready') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'حالة الطلب غير صحيحة'; END IF;
 UPDATE public.orders SET status='on_the_way' WHERE id=o.id;
 ELSIF p_action='deliver' THEN RAISE EXCEPTION 'أدخل كود العميل لتسليم الطلب';
 ELSIF p_action<>'sync' THEN RAISE EXCEPTION 'لا يمكن إغلاق التوفر أو إنهاء الشيفت يدوياً'; END IF;
 seconds:=public.shift_work_seconds(s);
 IF s.status='active' AND seconds>=36000 THEN
 UPDATE public.orders SET courier_id=NULL WHERE courier_id=uid AND status IN ('pending','accepted','preparing','ready');
 IF NOT EXISTS(SELECT 1 FROM public.orders WHERE courier_id=uid AND status='on_the_way') THEN
 UPDATE public.courier_shifts SET ended_at=started_at+interval '10 hours'+CASE WHEN break_started_at IS NOT NULL THEN interval '1 hour' ELSE interval '0 hour' END,status='completed' WHERE id=s.id RETURNING * INTO s;
 END IF;
 END IF;
 IF s.status='active' AND seconds<36000 AND (s.break_ends_at IS NULL OR now()>=s.break_ends_at) AND NOT EXISTS(SELECT 1 FROM public.orders WHERE courier_id=uid AND status IN ('pending','accepted','preparing','ready','on_the_way')) THEN
 SELECT * INTO o FROM public.orders WHERE courier_id IS NULL AND status IN ('pending','preparing','ready') AND length(btrim(coalesce(pickup_address,'')))>0
   AND EXISTS(SELECT 1 FROM unnest(s.neighborhoods) n WHERE public.norm_area(n)=public.norm_area(delivery_neighborhood))
   AND (s.rejected_order_id IS NULL OR id<>s.rejected_order_id) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1;
 IF FOUND THEN UPDATE public.orders SET courier_id=uid WHERE id=o.id; END IF;
 END IF;
 RETURN jsonb_build_object('shift',to_jsonb(s),'worked_seconds',public.shift_work_seconds(s),'server_now',now(),'available',s.status='active' AND public.shift_work_seconds(s)<36000 AND (s.break_ends_at IS NULL OR now()>=s.break_ends_at));
END; $$;

CREATE OR REPLACE FUNCTION public.courier_deliver_order(p_order_id uuid, p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid:=auth.uid(); o public.orders; code text;
BEGIN
 IF uid IS NULL OR NOT public.has_role(uid,'courier') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id AND courier_id=uid AND status='on_the_way' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'الطلب ليس في الطريق'; END IF;
 IF o.delivery_code_attempts>=5 THEN RAISE EXCEPTION 'تجاوزت المحاولات؛ تواصل مع الإدارة'; END IF;
 SELECT delivery_code INTO code FROM public.profiles WHERE id=o.customer_id;
 IF code IS NULL OR btrim(coalesce(p_code,''))<>code THEN
   UPDATE public.orders SET delivery_code_attempts=delivery_code_attempts+1 WHERE id=o.id;
   RETURN jsonb_build_object('ok',false,'remaining',4-o.delivery_code_attempts);
 END IF;
 UPDATE public.orders SET status='delivered' WHERE id=o.id;
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE EXECUTE ON FUNCTION public.courier_deliver_order(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.courier_deliver_order(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.publish_courier_location(p_order_id uuid, p_latitude double precision, p_longitude double precision, p_accuracy double precision DEFAULT NULL::double precision, p_heading double precision DEFAULT NULL::double precision, p_speed double precision DEFAULT NULL::double precision)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid:=auth.uid(); s public.courier_shifts; o public.orders;
BEGIN
 IF uid IS NULL OR NOT public.has_role(uid,'courier') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
 IF p_latitude IS NULL OR p_longitude IS NULL OR NOT(p_latitude BETWEEN -90 AND 90) OR NOT(p_longitude BETWEEN -180 AND 180) OR (p_accuracy IS NOT NULL AND NOT(p_accuracy BETWEEN 0 AND 10000)) OR (p_heading IS NOT NULL AND NOT(p_heading BETWEEN 0 AND 360)) OR (p_speed IS NOT NULL AND NOT(p_speed BETWEEN 0 AND 100)) THEN RAISE EXCEPTION 'إحداثيات غير صحيحة'; END IF;
 SELECT * INTO s FROM public.courier_shifts WHERE courier_id=uid AND status='active' FOR UPDATE;
 IF NOT FOUND OR (s.break_ends_at IS NOT NULL AND now()<s.break_ends_at) THEN RAISE EXCEPTION 'الشيفت غير نشط'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id AND courier_id=uid AND status IN ('pending','accepted','preparing','ready','on_the_way') FOR UPDATE;
 IF NOT FOUND OR (o.status<>'on_the_way' AND public.shift_work_seconds(s)>=36000) THEN RAISE EXCEPTION 'الطلب غير مسند إليك أو انتهى الشيفت'; END IF;
 INSERT INTO public.order_live_locations(order_id,courier_id,latitude,longitude,accuracy,heading,speed,updated_at) VALUES(o.id,uid,p_latitude,p_longitude,p_accuracy,p_heading,p_speed,now()) ON CONFLICT(order_id) DO UPDATE SET courier_id=uid,latitude=excluded.latitude,longitude=excluded.longitude,accuracy=excluded.accuracy,heading=excluded.heading,speed=excluded.speed,updated_at=now();
END; $$;