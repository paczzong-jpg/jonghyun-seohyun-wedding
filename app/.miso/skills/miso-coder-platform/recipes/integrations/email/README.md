# Email Integration Recipe

## When To Use

Use this when a generated MISO website app needs to send transactional email through an external provider.

This is not Gmail user-send. If the user wants to send from the currently signed-in Google user's Gmail account, use `recipes/integrations/google/gmail/README.md`.

## Official Docs To Check

- Resend send email: https://resend.com/docs/api-reference/emails/send-email
- Resend domains: https://resend.com/docs/dashboard/domains/introduction
- SendGrid Mail Send API: https://www.twilio.com/docs/sendgrid/api-reference/mail-send
- SendGrid API keys: https://www.twilio.com/docs/sendgrid/ui/account-and-settings/api-keys
- SendGrid authentication: https://www.twilio.com/docs/sendgrid/for-developers/sending-email/authentication

## Feature Choices

| Provider | Recipe | Best for |
| --- | --- | --- |
| Resend | `resend/README.md` | Simple transactional email, developer-friendly domain setup |
| SendGrid | `sendgrid/README.md` | Existing SendGrid accounts, mature deliverability tooling |

## Platform Architecture

1. Browser submits message fields to a local route.
2. PocketBase route reads backend env.
3. PocketBase route calls provider REST API through `runtimeProxy.proxyFetch`.
4. Route returns provider status and sanitized error details.

Do not install provider SDKs in PocketBase hooks. Hooks cannot load npm packages. Do not put provider API keys in `VITE_*`.

## Shared Verification

- API key requested as `target: "backend", secret: true`.
- Sender address uses a verified provider domain.
- Browser never calls provider API directly.
- Route does not log message body or API key.
- Provider event logs are checked when API accepted but recipient did not receive the message.
