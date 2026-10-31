CREATE OR REPLACE FUNCTION public.enforce_order_totals_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fee numeric;
BEGIN
  SELECT delivery_fee INTO fee FROM public.restaurants WHERE id = NEW.restaurant_id;
  NEW.subtotal := 0;
  NEW.delivery_fee := COALESCE(fee, 0);
  NEW.total := NEW.delivery_fee;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS enforce_order_totals_on_insert ON public.orders;
CREATE TRIGGER enforce_order_totals_on_insert BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_totals_on_insert();

CREATE OR REPLACE FUNCTION public.recompute_order_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s numeric;
BEGIN
  SELECT COALESCE(SUM(price * quantity), 0) INTO s FROM public.order_items WHERE order_id = NEW.order_id;
  UPDATE public.orders SET subtotal = s, total = s + delivery_fee WHERE id = NEW.order_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS recompute_order_totals ON public.order_items;
CREATE TRIGGER recompute_order_totals AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.recompute_order_totals();

CREATE OR REPLACE FUNCTION public.block_order_total_edits()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF pg_trigger_depth() = 1 AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.subtotal := OLD.subtotal; NEW.delivery_fee := OLD.delivery_fee; NEW.total := OLD.total;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS block_order_total_edits ON public.orders;
CREATE TRIGGER block_order_total_edits BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.block_order_total_edits();

REVOKE EXECUTE ON FUNCTION public.enforce_order_totals_on_insert(), public.recompute_order_totals() FROM PUBLIC, anon, authenticated;