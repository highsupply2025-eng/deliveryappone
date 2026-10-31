CREATE OR REPLACE FUNCTION public.submit_staff_application(p_type text, p_full_name text, p_business_name text, p_vehicle text, p_documents jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'storage'
AS $function$
DECLARE uid uuid:=auth.uid(); expected text[]; k text; path text; verified_phone text; verified boolean;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'سجل الدخول أولاً'; END IF;
 SELECT CASE WHEN phone_confirmed_at IS NOT NULL THEN phone END, (phone_confirmed_at IS NOT NULL OR email_confirmed_at IS NOT NULL) INTO verified_phone, verified FROM auth.users WHERE id=uid;
 IF NOT coalesce(verified,false) THEN RAISE EXCEPTION 'يجب تأكيد الجوال أو البريد'; END IF;
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
 UPDATE public.profiles SET full_name=btrim(p_full_name),phone=coalesce(verified_phone,phone) WHERE id=uid;
END; $function$;