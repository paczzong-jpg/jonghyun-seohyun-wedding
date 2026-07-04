# Email Delivery Or Domain Fails

Use this diagnostic when Resend, SendGrid, or another transactional email provider route loads but email does not arrive.

## Check In Order

1. Confirm the browser calls a local route such as `/api/email/resend/send` or `/api/email/sendgrid/send`, not the provider REST API directly.
2. Confirm the PocketBase route uses `runtimeProxy.proxyFetch`.
3. Confirm the provider API key was requested with `target: "backend", secret: true`.
4. Read the provider response body returned by the route. Do not hide provider status codes behind generic `500`.
5. Confirm the sender domain is verified in the provider dashboard.
6. Confirm `from` uses that verified domain.
7. Check sandbox/provider rate limits before retrying loops.

## Common Failures

| Provider status | Meaning | Fix |
| --- | --- | --- |
| `401` or `403` | Missing, wrong, or under-scoped API key | Re-request the backend secret with `miso_env_vars_request` |
| `400` sender/domain error | `from` domain is not verified | Verify DNS in provider dashboard and update `RESEND_FROM_EMAIL` or `SENDGRID_FROM_EMAIL` |
| Accepted but not delivered | Provider accepted mail but recipient/domain filtering delayed or dropped it | Check provider event logs and recipient spam/quarantine |
| Browser CORS error | Wrong surface | Move provider call behind PocketBase route |

## Do Not

- Do not put `RESEND_API_KEY` or `SENDGRID_API_KEY` in `VITE_*`.
- Do not install provider SDKs in PocketBase hooks. Use REST through `proxyFetch`.
- Do not log message bodies when they may contain user data.
