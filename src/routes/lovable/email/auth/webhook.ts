import * as React from 'react'
import { createAuthEmailHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'
import { loginEmailProps } from '@/lib/email-templates/login-email-props'
import { SignupEmail } from '@/lib/email-templates/signup'
import { InviteEmail } from '@/lib/email-templates/invite'
import { MagicLinkEmail } from '@/lib/email-templates/magic-link'
import { RecoveryEmail } from '@/lib/email-templates/recovery'
import { EmailChangeEmail } from '@/lib/email-templates/email-change'
import { ReauthenticationEmail } from '@/lib/email-templates/reauthentication'

// Configuration
const SITE_NAME = "FoodHub"
const SENDER_DOMAIN = "admin.foodhub.delivery"
const ROOT_DOMAIN = "foodhub.delivery"
const FROM_DOMAIN = "foodhub.delivery"
const SITE_URL = `https://${ROOT_DOMAIN}`

// The SDK handler owns verification, dispatch, and retry semantics; this file
// owns only the email decisions: subjects, templates, and per-type props.
export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const handler = createAuthEmailHandler({
          apiKey: process.env['LOVABLE_API_KEY']!,
          from: { name: SITE_NAME, address: `noreply@${FROM_DOMAIN}` },
          replyTo: { name: SITE_NAME, address: "foodhub@foodhub.delivery" },
          senderDomain: SENDER_DOMAIN,
          sendUrl: process.env['LOVABLE_SEND_URL'],
          emails: {
            signup: {
              subject: 'FoodHub — رمز تأكيد البريد',
              render: (data) =>
                React.createElement(SignupEmail, {
                  ...loginEmailProps(SITE_NAME, data),
                }),
            },
            invite: {
              subject: 'FoodHub — دعوة للانضمام',
              render: (data) =>
                React.createElement(InviteEmail, {
                  siteName: SITE_NAME,
                  siteUrl: SITE_URL,
                  confirmationUrl: data.url,
                }),
            },
            magiclink: {
              subject: 'FoodHub — رمز تسجيل الدخول',
              render: (data) =>
                React.createElement(MagicLinkEmail, loginEmailProps(SITE_NAME, data)),
            },
            recovery: {
              subject: 'FoodHub — إعادة تعيين كلمة المرور',
              render: (data) =>
                React.createElement(RecoveryEmail, {
                  siteName: SITE_NAME,
                  confirmationUrl: data.url,
                }),
            },
            email_change: {
              subject: 'FoodHub — تأكيد تغيير البريد',
              render: (data) =>
                React.createElement(EmailChangeEmail, {
                  siteName: SITE_NAME,
                  oldEmail: data.old_email ?? '',
                  email: data.email,
                  newEmail: data.new_email ?? '',
                  confirmationUrl: data.url,
                }),
            },
            reauthentication: {
              subject: 'FoodHub — رمز التحقق',
              render: (data) =>
                React.createElement(ReauthenticationEmail, { token: data.token ?? '' }),
            },
          },
        })
        return handler(request)
      },
    },
  },
})
