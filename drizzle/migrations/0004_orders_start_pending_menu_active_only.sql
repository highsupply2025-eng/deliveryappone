CREATE OR REPLACE FUNCTION public.force_new_order_pending()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.status := 'pending';
  NEW.courier_id := NULL;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.force_new_order_pending() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS orders_force_pending ON public.orders;
CREATE TRIGGER orders_force_pending BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.force_new_order_pending();

DROP POLICY IF EXISTS "public read menu" ON public.menu_items;
DROP POLICY IF EXISTS "auth read menu" ON public.menu_items;
CREATE POLICY "public read active menu" ON public.menu_items FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_items.restaurant_id AND r.is_active));
CREATE POLICY "auth read menu" ON public.menu_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_items.restaurant_id AND (r.is_active OR r.owner_id = auth.uid()))
         OR public.has_role(auth.uid(), 'admin'));