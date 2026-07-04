# Stripe Webhook Verification

Use this recipe when Stripe webhook events call a generated MISO website app.

## Official Docs To Check

- Stripe webhooks: https://docs.stripe.com/webhooks
- Stripe signature verification: https://docs.stripe.com/webhooks/signature
- Stripe webhook quickstart: https://docs.stripe.com/webhooks/quickstart

## MISO Route

Register Stripe with:

```text
https://<miso-origin>/site/<site_code>/__runtime/api/stripe/webhook
```

The app must be external/public if Stripe calls without MISO cookies. If MISO IP restriction is enabled, allow Stripe webhook IPs or Stripe receives `403` before PocketBase route logs.

## Env Request

Stripe signs `timestamp.rawBody` and sends the timestamp/signatures in the `Stripe-Signature` header. PocketBase must read the exact raw body for verification.

```ts
{
  title: "Connect Stripe webhook verification",
  description: "Enter the Stripe webhook endpoint signing secret used to verify events inside PocketBase.",
  variables: [
    { key: "STRIPE_WEBHOOK_SECRET_RAW", label: "Stripe webhook signing secret for local verification", target: "backend", secret: false, required: true }
  ]
}
```

Do not mark this value `secret: true` while verification runs inside PocketBase; MISO exposes `secret: true` backend values as managed placeholders there.

## Implementation

Copy `stripe-webhook.pb.js` to `api/stripe-webhook.pb.js`, then handle event types after verification.

The route:

- Reads `readerToString(e.request.body)` before parsing.
- Parses `Stripe-Signature` for `t=<timestamp>` and one or more `v1=<signature>` values.
- Computes `$security.hs256(timestamp + "." + rawBody, STRIPE_WEBHOOK_SECRET_RAW)`.
- Rejects timestamps older than 5 minutes.

## Verification

- Missing timestamp/signature returns `401`.
- Wrong endpoint secret returns `401`.
- Valid event returns `200` quickly. Slow fulfillment must use a platform async bridge.
