import { describe, it, expect, mock } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requestAdminLoginOtp, confirmAdminLoginOtp } from '../src/lib/admin-login-otp';

function client(allowed: boolean, rejected = false) {
  const signInWithOtp = mock(async () => ({ error: null }));
  const verifyOtp = mock(async () => rejected
    ? { error: { message: 'expired' }, data: { session: null, user: null } }
    : { error: null, data: { session: { access_token: 'unit-test-only' }, user: { id: 'admin-test' } } });
  const getUser = mock(async () => ({ error: null, data: { user: { id: 'admin-test' } } }));
  const signOut = mock(async () => ({ error: null }));
  const rpc = mock(async () => ({ error: null, data: allowed }));
  return { value: { auth: { signInWithOtp, verifyOtp, getUser, signOut }, rpc } as unknown as SupabaseClient,
    signInWithOtp, verifyOtp, getUser, signOut, rpc };
}

describe('Admin real email OTP', () => {
  it('requests email OTP only for an existing account without signup', async () => {
    const c = client(true);
    await requestAdminLoginOtp(c.value.auth, 'admin@example.com');
    expect(c.signInWithOtp.mock.calls[0]).toEqual([{ email: 'admin@example.com', options: { shouldCreateUser: false } }]);
  });
  it('revalidates identity and the stored admin role after genuine verification', async () => {
    const c = client(true);
    await confirmAdminLoginOtp(c.value, 'admin@example.com', '123456');
    expect(c.verifyOtp.mock.calls[0]).toEqual([{ email: 'admin@example.com', token: '123456', type: 'email' }]);
    expect(c.getUser).toHaveBeenCalledTimes(1);
    expect(c.rpc.mock.calls[0]).toEqual(['has_role', { _user_id: 'admin-test', _role: 'admin' }]);
    expect(c.signOut).not.toHaveBeenCalled();
  });
  it('denies non-admin accounts and clears their session', async () => {
    const c = client(false);
    await expect(confirmAdminLoginOtp(c.value, 'customer@example.com', '123456')).rejects.toThrow();
    expect(c.signOut).toHaveBeenCalledTimes(1);
  });
  it('never accepts a code rejected as expired by hosted authentication', async () => {
    const c = client(true, true);
    await expect(confirmAdminLoginOtp(c.value, 'admin@example.com', '123456')).rejects.toThrow();
    expect(c.rpc).not.toHaveBeenCalled();
  });
});