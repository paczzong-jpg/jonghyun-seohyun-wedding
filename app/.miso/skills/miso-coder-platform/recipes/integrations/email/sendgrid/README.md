# SendGrid Email Recipe

## When To Use

Use this to send transactional email through Twilio SendGrid Mail Send API.

## Files

1. Copy `sendgrid-email.pb.js` to `api/sendgrid-email.pb.js`.
2. Copy `SendgridEmailSender.tsx` into an app-owned component path if a ready UI is useful.
3. Request `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`.

## Env Request

```ts
{
  title: "Connect SendGrid",
  description: "Enter SendGrid credentials for transactional email.",
  variables: [
    { key: "SENDGRID_API_KEY", label: "SendGrid API key", target: "backend", secret: true, required: true },
    { key: "SENDGRID_FROM_EMAIL", label: "Verified sender email", target: "backend", secret: false, required: true }
  ]
}
```

## Route Contract

`POST /api/email/sendgrid/send`

```json
{
  "to": "user@example.com",
  "subject": "Hello",
  "html": "<p>Hello</p>",
  "text": "Hello"
}
```

## Verification

- SendGrid sender/domain authentication is complete.
- API key has Mail Send permission.
- Route returns `202` provider acceptance as `ok: true`.
