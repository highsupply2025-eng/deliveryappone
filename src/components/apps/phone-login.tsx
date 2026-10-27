import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Smartphone } from 'lucide-react';
import { normalizeOtpDestination, requestLoginOtp, confirmLoginOtp, type OtpMethod } from '@/lib/login-otp';

export function PhoneLogin({ onComplete }: { onComplete?: () => void }) {
  const [method,setMethod]=useState<OtpMethod>('email');
  const [destination,setDestination]=useState(''); const [code,setCode]=useState('');
  const [sent,setSent]=useState(false); const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');
    try {
      const normalized=normalizeOtpDestination(method,destination);
      if(!sent){
        const {error}=await requestLoginOtp(supabase.auth,method,normalized);
        if(error) throw new Error(error.message.includes('disabled') ? (method==='phone'?'إرسال رموز الجوال غير مفعّل حاليًا':'تسجيل البريد غير مفعّل حاليًا') : error.status===429?'انتظر قليلًا قبل طلب رمز جديد':`تعذر إرسال الرمز: ${error.message}`);
        setDestination(normalized);
        setSent(true);
      }else{
        await confirmLoginOtp(supabase.auth,method,normalized,code);
        onComplete?.();
      }
    }catch(e){setError(e instanceof Error?e.message:'تعذر تسجيل الدخول');}finally{setBusy(false);}
  };
  return <form dir="rtl" onSubmit={submit} className="w-full space-y-4">
    <Tabs value={method} onValueChange={value=>{if(value!=='email'&&value!=='phone')return;setMethod(value);setSent(false);setDestination('');setCode('');setError('');}} dir="rtl">
      <TabsList className="grid w-full grid-cols-2" aria-label="طريقة تسجيل الدخول">
        <TabsTrigger value="email" disabled={busy}><Mail className="size-4"/>البريد الإلكتروني</TabsTrigger>
        <TabsTrigger value="phone" disabled={busy}><Smartphone className="size-4"/>رقم الجوال</TabsTrigger>
      </TabsList>
    </Tabs>
    <label className="block space-y-2 text-sm"><span>{method==='email'?'البريد الإلكتروني':'رقم الجوال'}</span><Input aria-label={method==='email'?'البريد الإلكتروني':'رقم الجوال'} type={method==='email'?'email':'tel'} dir="ltr" autoComplete={method==='email'?'email':'tel'} maxLength={method==='email'?254:25} placeholder={method==='email'?'name@example.com':'05xxxxxxxx'} value={destination} disabled={sent||busy} required onChange={e=>setDestination(e.target.value)}/></label>
    {sent&&<><p role="status" className="text-sm text-muted-foreground">{method==='email'?'أدخل الرمز المرسل إلى بريدك الإلكتروني؛ تحقق من البريد غير المرغوب فيه أيضًا':'أدخل الرمز المرسل إلى جوالك'}</p><label className="block space-y-2 text-sm"><span>رمز التفعيل</span><Input aria-label="رمز التفعيل" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={8} required value={code} disabled={busy} onChange={e=>setCode(e.target.value.replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/\D/g,''))}/></label></>}
    {error&&<p role="alert" className="text-sm text-destructive break-words">{error}</p>}
    <Button className="w-full" disabled={busy} type="submit">{busy?'جارِ التحقق…':sent?'تأكيد الرمز':'إرسال رمز التفعيل'}</Button>
    {sent&&<Button className="w-full" variant="ghost" type="button" disabled={busy} onClick={()=>{setSent(false);setCode('');setError('');}}>{method==='email'?'تغيير البريد أو إعادة الإرسال':'تغيير الرقم أو إعادة الإرسال'}</Button>}
  </form>;
}