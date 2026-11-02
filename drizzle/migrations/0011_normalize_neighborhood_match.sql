CREATE OR REPLACE FUNCTION public.norm_area(t text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT translate(regexp_replace(btrim(coalesce(t,'')),'\s+',' ','g'),'ةأإآى','هاااي')
$$;

CREATE OR REPLACE FUNCTION public.dispatch_ready_order()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE s public.courier_shifts;
BEGIN
  IF NEW.status='ready' AND NEW.courier_id IS NULL AND length(btrim(coalesce(NEW.pickup_address,'')))>0 AND NEW.delivery_neighborhood IS NOT NULL THEN
    SELECT * INTO s FROM public.courier_shifts cs
     WHERE cs.status='active' AND public.shift_work_seconds(cs)<36000
       AND (cs.break_ends_at IS NULL OR now()>=cs.break_ends_at)
       AND EXISTS(SELECT 1 FROM unnest(cs.neighborhoods) n WHERE public.norm_area(n)=public.norm_area(NEW.delivery_neighborhood))
       AND (cs.rejected_order_id IS NULL OR cs.rejected_order_id<>NEW.id)
       AND NOT EXISTS(SELECT 1 FROM public.orders o WHERE o.courier_id=cs.courier_id AND o.status IN ('ready','on_the_way') AND o.id<>NEW.id)
     ORDER BY cs.started_at FOR UPDATE SKIP LOCKED LIMIT 1;
    IF FOUND THEN NEW.courier_id := s.courier_id; END IF;
  END IF;
  RETURN NEW;
END $function$;