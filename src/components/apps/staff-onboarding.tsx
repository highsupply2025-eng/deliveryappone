import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { documentLabels, requiredDocuments, validateDocument } from '@/lib/phone-onboarding';

export function StaffOnboarding({ userId,type }: { userId:string; type:'courier'|'restaurant' }) {
  const [name,setName]=useState('');const [business,setBusiness]=useState('');
  const [vehicle,setVehicle]=useState<'car'|'motorcycle'>('car');
  const [files,setFiles]=useState<Record<string,File>>({});const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const application=useQuery({queryKey:['staff-application',userId],queryFn:async()=>{
    const {data,error}=await supabase.from('staff_applications').select('*').eq('user_id',userId).maybeSingle();if(error)throw error;return data;
  },refetchInterval:15000});
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');
    try{
      if(name.trim().length<2)throw new Error('أدخل الاسم الكامل');
      if(type==='restaurant'&&business.trim().length<2)throw new Error('أدخل اسم المطعم');
      const documents:Record<string,string>={};
      for(const key of requiredDocuments(type)){
        const file=files[key];if(!file)throw new Error(`أرفق ${documentLabels[key]}`);validateDocument(file);
        const path=`${userId}/${crypto.randomUUID()}/${key}`;
        const {error}=await supabase.storage.from('onboarding-documents').upload(path,file,{contentType:file.type});if(error)throw error;documents[key]=path;
      }
      const {error}=await supabase.rpc('submit_staff_application',{p_type:type,p_full_name:name.trim(),p_business_name:business.trim(),p_vehicle:vehicle,p_documents:documents});if(error)throw error;
      await application.refetch();
    }catch(e){setError(e instanceof Error?e.message:'تعذر إرسال المستندات');}finally{setBusy(false);}
  };
  return <main dir="rtl" className="mx-auto min-h-screen max-w-lg space-y-5 bg-background p-6 text-foreground">
    <header className="flex items-center justify-between"><h1 className="text-xl font-bold">{type==='courier'?'تسجيل المندوب':'تسجيل المطعم'}</h1><Button variant="ghost" onClick={()=>void supabase.auth.signOut()}>خروج</Button></header>
    {application.isPending?<p>جارِ التحميل…</p>:application.isError?<p role="alert" className="text-destructive">تعذر تحميل طلب التسجيل</p>:application.data?.status==='pending'?<><h2 className="font-bold">طلبك قيد مراجعة الأدمن</h2><p className="text-muted-foreground">تم استلام المستندات. يمكنك فتح حساب العمل بعد الموافقة.</p><Button variant="outline" onClick={()=>void application.refetch()}>تحديث الحالة</Button></>:application.data?.status==='approved'?<><p>تم اعتماد حسابك؛ سجّل الدخول مجددًا لفتح حساب العمل.</p><Button onClick={()=>void supabase.auth.signOut()}>تسجيل الخروج</Button></>:<>
      {application.data?.status==='rejected'&&<p role="alert" className="text-destructive">أعد إرسال الطلب: {application.data.rejection_reason}</p>}
      <form className="space-y-4" onSubmit={submit}>
        <label className="block space-y-2"><span>{type==='courier'?'الاسم الكامل':'اسم مالك المطعم'}</span><Input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
        {type==='restaurant'?<label className="block space-y-2"><span>اسم المطعم</span><Input required minLength={2} maxLength={150} value={business} onChange={e=>setBusiness(e.target.value)}/></label>:<fieldset className="space-y-2"><legend>وسيلة التوصيل</legend><div className="flex gap-6"><label><input type="radio" name="vehicle" checked={vehicle==='car'} onChange={()=>setVehicle('car')}/> سيارة</label><label><input type="radio" name="vehicle" checked={vehicle==='motorcycle'} onChange={()=>setVehicle('motorcycle')}/> دباب</label></div></fieldset>}
        {requiredDocuments(type).map(key=><label key={key} className="block space-y-2 border-b pb-4"><span>{documentLabels[key]}{key==='driving_license'?(vehicle==='car'?' للسيارة':' للدباب'):''}</span><Input type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>{const file=e.target.files?.[0];if(file)setFiles(f=>({...f,[key]:file}));}}/></label>)}
        <p className="text-sm text-muted-foreground">صور أو PDF — حتى 10 ميجابايت لكل مستند</p>
        {error&&<p role="alert" className="text-sm text-destructive break-words">{error}</p>}
        <Button className="w-full" type="submit" disabled={busy}>{busy?'جارِ رفع المستندات…':'إرسال للموافقة'}</Button>
      </form></>}
  </main>;
}