import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { normalizePhone } from './phone-onboarding';

export type OtpMethod = 'email' | 'phone';

export function normalizeOtpDestination(method: OtpMethod, value: string) {
  if (method === 'phone') return normalizePhone(value);
  const email = z.string().email().safeParse(value.trim());
  if (!email.success) throw new Error('أدخل بريدًا إلكترونيًا صحيحًا');
  return email.data;
}

export async function requestLoginOtp(auth: SupabaseClient['auth'], method: OtpMethod, destination: string) {
  return method === 'email'
    ? auth.signInWithOtp({ email: destination, options: { shouldCreateUser: true } })
    : auth.signInWithOtp({ phone: destination });
}

export async function confirmLoginOtp(auth: SupabaseClient['auth'], method: OtpMethod, destination: string, token: string) {
  if (!/^\d{6,8}$/.test(token)) throw new Error('أدخل رمز التفعيل كاملًا');
  const result = method === 'email'
    ? await auth.verifyOtp({ email: destination, token, type: 'email' })
    : await auth.verifyOtp({ phone: destination, token, type: 'sms' });
  if (result.error) throw new Error('الرمز غير صحيح أو انتهت صلاحيته');
  if (!result.data.session || !result.data.user) throw new Error('تعذر تأكيد تسجيل الدخول؛ حاول مجددًا');
  return result;
}