import { useState } from 'react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { documentLabels } from '@/lib/phone-onboarding';

export function AdminApplications({type}:{type:'courier'|'restaurant'}){
  const qc=useQueryClient();const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [reason,setReason]=useState<Record<string,string>>({});
  const applications=useQuery({queryKey:['admin-app-applications',type],queryFn:async()=>{
    const {data,error}=await supabase.from('staff_applications').select('*').eq('type',type).eq('status','pending').order('created_at');if(error)throw error;return data;
  }});
  const review=async(id:string,approve:boolean)=>{setBusy(true);setError('');try{
    const {error}=await supabase.rpc('review_staff_application',{p_id:id,p_approve:approve,p_reason:reason[id]??''});if(error)throw error;
    await qc.invalidateQueries({predicate:q=>String(q.queryKey[0]).startsWith('admin-app')});
  }catch(e){setError(e instanceof Error?e.message:'تعذر المراجعة');}finally{setBusy(false);}};
  const view=async(path:string)=>{setError('');const {data,error}=await supabase.storage.from('onboarding-documents').createSignedUrl(path,60);if(error){setError('تعذر فتح المستند');return;}window.open(data.signedUrl,'_blank','noopener,noreferrer');};
  return <section className="space-y-3"><h2 className="font-bold">طلبات التسجيل</h2>
    {(applications.isError||error)&&<p role="alert" className="text-sm text-destructive">{error||'تعذر تحميل طلبات التسجيل'}</p>}
    {applications.isPending?<p>جارِ التحميل…</p>:!applications.data?.length?<p className="text-sm text-muted-foreground">لا توجد طلبات قيد المراجعة</p>:applications.data.map(a=><article key={a.id} className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="font-bold">{a.business_name||a.full_name}</h3><p className="text-sm">{a.full_name}{a.vehicle?` · ${a.vehicle==='car'?'سيارة':'دباب'}`:''}</p>
      <div className="flex flex-wrap gap-2">{Object.entries(a.documents as Record<string,string>).map(([key,path])=><Button key={key} variant="outline" size="sm" onClick={()=>void view(path)}>{documentLabels[key as keyof typeof documentLabels]??key}</Button>)}</div>
      <Input aria-label="سبب الرفض" placeholder="سبب الرفض عند الحاجة" maxLength={500} value={reason[a.id]??''} onChange={e=>setReason(r=>({...r,[a.id]:e.target.value}))}/>
      <div className="flex gap-2"><Button disabled={busy} onClick={()=>void review(a.id,true)}>موافقة</Button><Button variant="outline" disabled={busy||(reason[a.id]?.trim().length??0)<2} onClick={()=>void review(a.id,false)}>رفض</Button></div>
    </article>)}
  </section>;
}