import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import { emailBrand as brand } from './brand'

export interface OtpEmailProps { siteName: string; token: string; signup?: boolean }

export function OtpEmail({ siteName, token, signup = false }: OtpEmailProps) {
  const title = signup ? 'رمز تأكيد البريد' : 'رمز تسجيل الدخول'
  return (
    <Html lang="ar" dir="rtl">
      <Head />
      <Preview>{title} — {siteName}</Preview>
      <Body style={{ backgroundColor: brand.background, color: brand.foreground, fontFamily: brand.font }}>
        <Container style={{ maxWidth: '480px', padding: '32px 24px' }}>
          <Text style={{ color: brand.foreground, fontSize: '24px', fontWeight: 'bold', borderBottom: `4px solid ${brand.accent}`, paddingBottom: '16px' }}>{siteName}</Text>
          <Heading style={{ fontSize: '22px', margin: '24px 0' }}>{title}</Heading>
          <Text style={{ fontSize: '16px', lineHeight: '1.8' }}>أدخل الرمز التالي داخل تطبيق FoodHub لإكمال تسجيل الدخول:</Text>
          <Text dir="ltr" style={{ textAlign: 'center', fontSize: '32px', fontFamily: 'Courier, monospace', fontWeight: 'bold', backgroundColor: brand.accent, color: brand.accentForeground, borderRadius: '8px', padding: '20px', margin: '24px 0' }}>{token}</Text>
          <Text style={{ color: brand.muted, fontSize: '14px', lineHeight: '1.8' }}>لا تشارك الرمز مع أي شخص. إذا لم تطلب تسجيل الدخول، تجاهل هذه الرسالة.</Text>
        </Container>
      </Body>
    </Html>
  )
}