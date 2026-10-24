import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizePhone } from '@/lib/phone-onboarding';

export function PhoneLogin({ onComplete }: { onComplete?: () => void }) {
  const [phone,setPhone]=useState(''); const [code,setCode]=useState('');
  const [sent,setSent]=useState(false); const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');
    try {
      const normalized=normalizePhone(phone);
      if(!sent){
        const {error}=await supabase.auth.signInWithOtp({phone:normalized});
        if(error) throw new Error(error.message.includes('disabled') ? 'إرسال رموز الجوال غير مفعّل حاليًا' : `تعذر إرسال الرمز: ${error.message}`);
        setSent(true);
      }else{
        if(!/^\d{6,8}$/.test(code))throw new Error('أدخل رمز التفعيل');
        const {error}=await supabase.auth.verifyOtp({phone:normalized,token:code,type:'sms'});
        if(error)throw new Error('الرمز غير صحيح أو انتهت صلاحيته');
        onComplete?.();
      }
    }catch(e){setError(e instanceof Error?e.message:'تعذر تسجيل الدخول');}finally{setBusy(false);}
  };
  return <form dir="rtl" onSubmit={submit} className="w-full space-y-4">
    <label className="block space-y-2 text-sm"><span>رقم الجوال</span><Input aria-label="رقم الجوال" type="tel" dir="ltr" autoComplete="tel" maxLength={25} placeholder="05xxxxxxxx" value={phone} disabled={sent} required onChange={e=>setPhone(e.target.value)}/></label>
    {sent&&<><p className="text-sm text-muted-foreground">أدخل الرمز المرسل إلى جوالك</p><label className="block space-y-2 text-sm"><span>رمز التفعيل</span><Input aria-label="رمز التفعيل" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={8} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label></>}
    {error&&<p role="alert" className="text-sm text-destructive break-words">{error}</p>}
    <Button className="w-full" disabled={busy} type="submit">{busy?'جارِ التحقق…':sent?'تأكيد الرمز':'إرسال رمز التفعيل'}</Button>
    {sent&&<Button className="w-full" variant="ghost" type="button" disabled={busy} onClick={()=>{setSent(false);setCode('');setError('');}}>تغيير الرقم أو إعادة الإرسال</Button>}
  </form>;
}