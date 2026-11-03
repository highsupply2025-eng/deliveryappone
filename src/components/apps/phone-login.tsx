import { useState } from "react";
import { Mail, KeyRound, LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeOtpDestination, requestLoginOtp, confirmLoginOtp } from "@/lib/login-otp";

export function PhoneLogin({ onComplete }: { onComplete?: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const normalized = normalizeOtpDestination("email", email);
      if (!sent) {
        const { error } = await requestLoginOtp(supabase.auth, "email", normalized);
        if (error) {
          throw new Error(
            error.message.includes("disabled")
              ? "تسجيل البريد غير مفعّل حاليًا"
              : error.status === 429
                ? "انتظر قليلًا قبل طلب رمز جديد"
                : `تعذر إرسال الرمز: ${error.message}`,
          );
        }
        setEmail(normalized);
        setSent(true);
      } else {
        await confirmLoginOtp(supabase.auth, "email", normalized, code);
        onComplete?.();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تسجيل الدخول");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form dir="rtl" onSubmit={submit} className="w-full space-y-4">
      <label className="block space-y-2 text-sm">
        <span>البريد الإلكتروني</span>
        <Input
          aria-label="البريد الإلكتروني"
          type="email"
          dir="ltr"
          autoComplete="email"
          maxLength={254}
          value={email}
          disabled={sent || busy}
          required
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {sent && (
        <>
          <p role="status" className="break-words text-sm text-muted-foreground">
            أدخل الرمز المرسل إلى بريدك الإلكتروني.
          </p>
          <label className="block space-y-2 text-sm">
            <span>رمز الدخول</span>
            <Input
              aria-label="رمز الدخول"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              autoFocus
              maxLength={8}
              required
              value={code}
              disabled={busy}
              onChange={(e) =>
                setCode(
                  e.target.value
                    .replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)))
                    .replace(/\D/g, ""),
                )
              }
            />
          </label>
        </>
      )}
      {error && (
        <p role="alert" className="break-words text-sm text-destructive">
          {error}
        </p>
      )}
      <Button className="w-full" disabled={busy} type="submit">
        {busy ? (
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
        ) : sent ? (
          <KeyRound className="size-4" />
        ) : (
          <Mail className="size-4" />
        )}
        {busy ? "جارِ التحقق…" : sent ? "تأكيد رمز الدخول" : "إرسال رمز الدخول"}
      </Button>
      {sent && (
        <Button
          className="w-full"
          variant="ghost"
          type="button"
          disabled={busy}
          onClick={() => {
            setSent(false);
            setCode("");
            setError("");
          }}
        >
          تغيير البريد أو طلب رمز جديد
        </Button>
      )}
    </form>
  );
}
