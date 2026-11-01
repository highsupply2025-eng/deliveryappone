import { useState } from 'react';
import { Mail, KeyRound, LoaderCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeOtpDestination } from '@/lib/login-otp';
import { requestAdminLoginOtp, confirmAdminLoginOtp } from '@/lib/admin-login-otp';

export function AdminEmailLogin({ onComplete }: { onComplete?: () => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const normalized = normalizeOtpDestination('email', email);
      if (sent) {
        await confirmAdminLoginOtp(supabase, normalized, code);
        onComplete?.();
      } else {
        const result = await requestAdminLoginOtp(supabase.auth, normalized);
        if (result.error) throw new Error(result.error.status === 429
          ? 'انتظر قليلًا قبل طلب رمز جديد'
          : 'تعذر إرسال الرمز؛ تحقق من البريد المسجل وحاول مجددًا');
        setEmail(normalized);
        setSent(true);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'تعذر تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  }

  return <form dir="rtl" onSubmit={submit} className="w-full space-y-4">
    <label className="block space-y-2 text-sm">
      <span>البريد الإلكتروني</span>
      <Input aria-label="البريد الإلكتروني" type="email" dir="ltr" autoComplete="email" maxLength={254}
        value={email} disabled={sent || busy} required onChange={event => setEmail(event.target.value)} />
    </label>
    {sent && <>
      <p role="status" className="break-words text-sm text-muted-foreground">أدخل الرمز المرسل إلى بريدك الإلكتروني.</p>
      <label className="block space-y-2 text-sm">
        <span>رمز الدخول</span>
        <Input aria-label="رمز الدخول" inputMode="numeric" autoComplete="one-time-code" dir="ltr"
          autoFocus maxLength={8} value={code} required disabled={busy}
          onChange={event => setCode(event.target.value.replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/\D/g, ''))} />
      </label>
    </>}
    {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
    <Button type="submit" className="w-full" disabled={busy}>
      {busy ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : sent ? <KeyRound className="size-4" /> : <Mail className="size-4" />}
      {busy ? 'جارِ التحقق…' : sent ? 'دخول لوحة الإدارة' : 'إرسال رمز الدخول'}
    </Button>
    {sent && <Button type="button" variant="ghost" className="w-full" disabled={busy}
      onClick={() => { setSent(false); setCode(''); setError(''); }}>تغيير البريد أو طلب رمز جديد</Button>}
  </form>;
}