import { describe, expect, test } from 'bun:test'
import { loginEmailProps } from '../src/lib/email-templates/login-email-props'

describe('hosted email OTP forwarding', () => {
  test('preserves the exact hosted token, including leading zeroes', () => {
    expect(loginEmailProps('FoodHub', { token: '012345' }).token).toBe('012345')
  })
  test('never creates a fixed code when the hosted token is missing', () => {
    expect(loginEmailProps('FoodHub', {}).token).toBe('')
  })
})