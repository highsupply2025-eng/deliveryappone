CREATE TABLE public.restaurant_payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
  requested_by uuid NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT ON public.restaurant_payout_requests TO authenticated;
GRANT ALL ON public.restaurant_payout_requests TO service_role;
ALTER TABLE public.restaurant_payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY payout_read ON public.restaurant_payout_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.request_restaurant_payout(p_restaurant_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sales numeric; v_claimed numeric; v_amount numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM restaurants WHERE id = p_restaurant_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  PERFORM 1 FROM restaurants WHERE id = p_restaurant_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM restaurant_payout_requests WHERE restaurant_id = p_restaurant_id AND status = 'pending') THEN
    RAISE EXCEPTION 'pending request exists';
  END IF;
  SELECT coalesce(sum(subtotal),0) INTO v_sales FROM orders WHERE restaurant_id = p_restaurant_id AND status = 'delivered';
  SELECT coalesce(sum(amount),0) INTO v_claimed FROM restaurant_payout_requests WHERE restaurant_id = p_restaurant_id AND status IN ('pending','paid');
  v_amount := v_sales - v_claimed;
  IF v_amount <= 0 THEN RAISE EXCEPTION 'nothing to claim'; END IF;
  INSERT INTO restaurant_payout_requests(restaurant_id, requested_by, amount) VALUES (p_restaurant_id, auth.uid(), v_amount);
  RETURN v_amount;
END $$;
REVOKE ALL ON FUNCTION public.request_restaurant_payout(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_restaurant_payout(uuid) TO authenticated;

CREATE POLICY menu_images_owner_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'menu-images' AND (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id::text = (storage.foldername(name))[1] AND r.owner_id = auth.uid())));