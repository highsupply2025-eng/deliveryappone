ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS address text, ADD COLUMN IF NOT EXISTS latitude double precision, ADD COLUMN IF NOT EXISTS longitude double precision;

CREATE OR REPLACE FUNCTION public.enforce_order_totals_on_insert()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.restaurants;
BEGIN
  SELECT * INTO r FROM public.restaurants WHERE id = NEW.restaurant_id;
  NEW.subtotal := 0;
  NEW.delivery_fee := COALESCE(r.delivery_fee, 0);
  NEW.total := NEW.delivery_fee;
  NEW.pickup_address := NULLIF(btrim(coalesce(r.address,'')),'');
  NEW.pickup_latitude := r.latitude;
  NEW.pickup_longitude := r.longitude;
  NEW.delivery_neighborhood := NULLIF(btrim(coalesce(NEW.delivery_neighborhood, NEW.address)),'');
  IF NEW.delivery_latitude IS NOT NULL AND NOT (NEW.delivery_latitude BETWEEN -90 AND 90 AND NEW.delivery_longitude BETWEEN -180 AND 180) THEN
    RAISE EXCEPTION 'موقع التسليم غير صحيح';
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.dispatch_ready_order()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE s public.courier_shifts;
BEGIN
  IF NEW.status='ready' AND NEW.courier_id IS NULL AND length(btrim(coalesce(NEW.pickup_address,'')))>0 AND NEW.delivery_neighborhood IS NOT NULL THEN
    SELECT * INTO s FROM public.courier_shifts cs
     WHERE cs.status='active' AND public.shift_work_seconds(cs)<36000
       AND (cs.break_ends_at IS NULL OR now()>=cs.break_ends_at)
       AND NEW.delivery_neighborhood = ANY(cs.neighborhoods)
       AND (cs.rejected_order_id IS NULL OR cs.rejected_order_id<>NEW.id)
       AND NOT EXISTS(SELECT 1 FROM public.orders o WHERE o.courier_id=cs.courier_id AND o.status IN ('ready','on_the_way') AND o.id<>NEW.id)
     ORDER BY cs.started_at FOR UPDATE SKIP LOCKED LIMIT 1;
    IF FOUND THEN NEW.courier_id := s.courier_id; END IF;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS orders_dispatch_ready ON public.orders;
CREATE TRIGGER orders_dispatch_ready BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.dispatch_ready_order();

CREATE OR REPLACE FUNCTION public.sync_restaurant_pickup()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.orders SET pickup_address=NULLIF(btrim(coalesce(NEW.address,'')),''), pickup_latitude=NEW.latitude, pickup_longitude=NEW.longitude
   WHERE restaurant_id=NEW.id AND status NOT IN ('on_the_way','delivered','cancelled');
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS restaurants_sync_pickup ON public.restaurants;
CREATE TRIGGER restaurants_sync_pickup AFTER UPDATE OF address, latitude, longitude ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.sync_restaurant_pickup();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='restaurants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;
  END IF;
END $$;