import type { SupabaseClient } from '@supabase/supabase-js';
import { confirmLoginOtp } from './login-otp';

// OTP lifetime is enforced by Cloud Auth's hosted Email OTP expiration setting.
export function requestAdminLoginOtp(auth: SupabaseClient['auth'], email: string) {
  return auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
}

export async function confirmAdminLoginOtp(client: SupabaseClient, email: string, token: string) {
  await confirmLoginOtp(client.auth, 'email', email, token);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('تعذر التحقق من الحساب');
  const role = await client.rpc('has_role', { _user_id: data.user.id, _role: 'admin' });
  if (role.error || role.data !== true) {
    await client.auth.signOut();
    throw new Error('هذا الحساب غير مخوّل بالدخول إلى لوحة الإدارة');
  }
}