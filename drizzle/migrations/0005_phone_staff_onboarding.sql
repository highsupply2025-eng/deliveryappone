CREATE TABLE public.staff_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE, type text NOT NULL CHECK(type IN ('courier','restaurant')), full_name text NOT NULL, business_name text, vehicle text CHECK(vehicle IN ('car','motorcycle')), documents jsonb NOT NULL DEFAULT '{}'::jsonb, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), rejection_reason text, created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz
);
GRANT SELECT ON public.staff_applications TO authenticated;
GRANT ALL ON public.staff_applications TO service_role;
ALTER TABLE public.staff_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY application_read ON public.staff_applications FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY applicant_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='onboarding-documents' AND (storage.foldername(name))[1]=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.staff_applications WHERE user_id=auth.uid() AND status IN ('pending','approved')));
CREATE POLICY applicant_document_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='onboarding-documents' AND ((storage.foldername(name))[1]=auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.profiles(id,full_name,phone) VALUES(NEW.id,coalesce(NEW.raw_user_meta_data->>'full_name',''),coalesce(NEW.phone,NEW.raw_user_meta_data->>'phone')) ON CONFLICT(id) DO NOTHING;
 INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'customer') ON CONFLICT DO NOTHING;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.submit_staff_application(p_type text,p_full_name text,p_business_name text,p_vehicle text,p_documents jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,storage AS $$
DECLARE uid uuid:=auth.uid(); expected text[]; k text; path text; verified_phone text;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'سجل الدخول أولاً'; END IF;
 SELECT phone INTO verified_phone FROM auth.users WHERE id=uid AND phone_confirmed_at IS NOT NULL;
 IF verified_phone IS NULL THEN RAISE EXCEPTION 'يجب تأكيد رقم الجوال'; END IF;
 IF public.has_role(uid,'admin') OR public.has_role(uid,'courier') OR public.has_role(uid,'restaurant') THEN RAISE EXCEPTION 'الحساب معتمد بالفعل'; END IF;
 IF p_type NOT IN ('courier','restaurant') OR length(btrim(p_full_name)) NOT BETWEEN 2 AND 100 THEN RAISE EXCEPTION 'بيانات غير صحيحة'; END IF;
 IF p_type='courier' THEN
 IF p_vehicle IS NULL OR p_vehicle NOT IN ('car','motorcycle') THEN RAISE EXCEPTION 'حدد سيارة أو دباب'; END IF;
 expected:=ARRAY['identity','driving_license','portrait'];
 ELSE
 IF p_business_name IS NULL OR length(btrim(p_business_name)) NOT BETWEEN 2 AND 150 THEN RAISE EXCEPTION 'اسم المطعم مطلوب'; END IF;
 expected:=ARRAY['storefront','municipal_license','commercial_registration','owner_identity'];
 END IF;
 IF jsonb_typeof(p_documents) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(p_documents))<>cardinality(expected) THEN RAISE EXCEPTION 'أكمل جميع المستندات'; END IF;
 FOREACH k IN ARRAY expected LOOP
 path:=p_documents->>k;
 IF path IS NULL OR split_part(path,'/',1)<>uid::text OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='onboarding-documents' AND name=path AND coalesce((metadata->>'size')::bigint,0) BETWEEN 1 AND 10485760 AND metadata->>'mimetype' IN ('image/jpeg','image/png','image/webp','application/pdf')) THEN RAISE EXCEPTION 'مستند غير صالح'; END IF;
 END LOOP;
 INSERT INTO public.staff_applications(user_id,type,full_name,business_name,vehicle,documents) VALUES(uid,p_type,btrim(p_full_name),CASE WHEN p_type='restaurant' THEN btrim(p_business_name) END,CASE WHEN p_type='courier' THEN p_vehicle END,p_documents)
 ON CONFLICT(user_id) DO UPDATE SET type=excluded.type,full_name=excluded.full_name,business_name=excluded.business_name,vehicle=excluded.vehicle,documents=excluded.documents,status='pending',rejection_reason=NULL,reviewed_at=NULL WHERE staff_applications.status='rejected';
 IF NOT FOUND THEN RAISE EXCEPTION 'لديك طلب قيد المراجعة أو معتمد'; END IF;
 UPDATE public.profiles SET full_name=btrim(p_full_name),phone=verified_phone WHERE id=uid;
END; $$;
REVOKE ALL ON FUNCTION public.submit_staff_application(text,text,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_staff_application(text,text,text,text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.review_staff_application(p_id uuid,p_approve boolean,p_reason text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.staff_applications;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
 SELECT * INTO a FROM public.staff_applications WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR a.status<>'pending' THEN RAISE EXCEPTION 'الطلب ليس قيد المراجعة'; END IF;
 IF p_approve THEN
 INSERT INTO public.user_roles(user_id,role) VALUES(a.user_id,a.type::public.app_role) ON CONFLICT DO NOTHING;
 IF a.type='restaurant' THEN INSERT INTO public.restaurants(owner_id,name_ar,name_en,is_active) VALUES(a.user_id,a.business_name,a.business_name,true); END IF;
 ELSE
 IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 2 AND 500 THEN RAISE EXCEPTION 'اذكر سبب الرفض'; END IF;
 END IF;
 UPDATE public.staff_applications SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,reviewed_at=now(),rejection_reason=CASE WHEN NOT p_approve THEN btrim(p_reason) END WHERE id=a.id;
END; $$;
REVOKE ALL ON FUNCTION public.review_staff_application(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_staff_application(uuid,boolean,text) TO authenticated;