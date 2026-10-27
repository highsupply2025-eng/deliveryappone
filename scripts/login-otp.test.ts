import { describe, it, expect, mock } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeOtpDestination, requestLoginOtp, confirmLoginOtp } from '../src/lib/login-otp';

function client(result: unknown) {
  const signInWithOtp = mock(async () => ({error:null}));
  const verifyOtp = mock(async () => result);
  return { auth: {signInWithOtp, verifyOtp} as unknown as SupabaseClient['auth'], signInWithOtp, verifyOtp };
}
describe('Cloud verified login OTP', () => {
  it('requests a genuine email code without assigning staff roles', async () => {
    const c=client(null);
    await requestLoginOtp(c.auth,'email','owner@example.com');
    expect(c.signInWithOtp.mock.calls[0]).toEqual([{email:'owner@example.com',options:{shouldCreateUser:true}}]);
  });
  it('keeps phone SMS OTP',async()=>{
    const c=client(null);
    await requestLoginOtp(c.auth,'phone','+966501234567');
    expect(c.signInWithOtp.mock.calls[0]).toEqual([{phone:'+966501234567'}]);
  });
  it('requires hosted email verification and a real session',async()=>{
    const c=client({error:null,data:{session:{access_token:'unit-test-only'},user:{id:'unit-test-user'}}});
    await confirmLoginOtp(c.auth,'email','owner@example.com','123456');
    expect(c.verifyOtp.mock.calls[0]).toEqual([{email:'owner@example.com',token:'123456',type:'email'}]);
  });
  it('never accepts a rejected code',async()=>{
    const c=client({error:{message:'expired'},data:{session:null,user:null}});
    await expect(confirmLoginOtp(c.auth,'email','owner@example.com','123456')).rejects.toThrow();
  });
  it('never treats a missing session as authenticated',async()=>{
    const c=client({error:null,data:{session:null,user:null}});
    await expect(confirmLoginOtp(c.auth,'email','owner@example.com','123456')).rejects.toThrow();
  });
  it('rejects incomplete codes before contacting auth',async()=>{
    const c=client(null);
    await expect(confirmLoginOtp(c.auth,'email','owner@example.com','123')).rejects.toThrow();
    expect(c.verifyOtp).not.toHaveBeenCalled();
  });
  it('validates email destinations',()=>{
    expect(normalizeOtpDestination('email',' owner@example.com ')).toBe('owner@example.com');
    expect(()=>normalizeOtpDestination('email','not-an-email')).toThrow();
  });
});