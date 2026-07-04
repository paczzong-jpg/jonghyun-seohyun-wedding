# Resend Email Recipe

## When To Use

Use this to send transactional email through Resend.

## Files

1. Copy `resend-email.pb.js` to `api/resend-email.pb.js`.
2. Copy `ResendEmailSender.tsx` into an app-owned component path if a ready UI is useful.
3. Request `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.

## Env Request

```ts
{
  title: "Connect Resend",
  description: "Enter Resend credentials for transactional email.",
  variables: [
    { key: "RESEND_API_KEY", label: "Resend API key", target: "backend", secret: true, required: true },
    { key: "RESEND_FROM_EMAIL", label: "Verified sender email", target: "backend", secret: false, required: true }
  ]
}
```

## Route Contract

`POST /api/email/resend/send`

```json
{
  "to": "user@example.com",
  "subject": "Hello",
  "html": "<p>Hello</p>",
  "text": "Hello"
}
```

`html` or `text` is required.

## Verification

- Resend domain is verified.
- `from` belongs to that domain.
- Route returns Resend email `id`.
