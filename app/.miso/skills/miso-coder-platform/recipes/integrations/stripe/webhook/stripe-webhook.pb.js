// Copy to api/stripe-webhook.pb.js.
// Verifies Stripe webhook events with the Stripe-Signature header.

routerAdd("POST", "/api/stripe/webhook", function (e) {
  var safeEqual = function (a, b) {
    a = String(a || "");
    b = String(b || "");
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  };

  var parseStripeSignature = function (header) {
    var out = { timestamp: "", signatures: [] };
    var parts = String(header || "").split(",");
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      var eq = part.indexOf("=");
      if (eq <= 0) continue;
      var key = part.substring(0, eq);
      var value = part.substring(eq + 1);
      if (key === "t") out.timestamp = value;
      if (key === "v1") out.signatures.push(value);
    }
    return out;
  };

  var verifyStripe = function (rawBody) {
    var runtimeEnv = require(__hooks + "/_runtime_env.js");
    var secret = runtimeEnv.STRIPE_WEBHOOK_SECRET_RAW || "";
    if (!secret) return "Missing STRIPE_WEBHOOK_SECRET_RAW";

    var parsed = parseStripeSignature(e.request.header.get("Stripe-Signature") || "");
    var ts = Number(parsed.timestamp);
    var now = Math.floor(Date.now() / 1000);
    if (!parsed.timestamp || !isFinite(ts) || Math.abs(now - ts) > 300) {
      return "Invalid or stale Stripe timestamp";
    }
    if (!parsed.signatures.length) return "Missing Stripe v1 signature";

    var expected = $security.hs256(parsed.timestamp + "." + rawBody, secret);
    for (var i = 0; i < parsed.signatures.length; i++) {
      if (safeEqual(expected, parsed.signatures[i])) return "";
    }
    return "Invalid Stripe webhook signature";
  };

  try {
    var rawBody = readerToString(e.request.body);
    var verificationError = verifyStripe(rawBody);
    if (verificationError) return e.json(401, { error: verificationError });

    var payload = {};
    try {
      payload = JSON.parse(rawBody || "{}");
    } catch (err) {
      return e.json(400, { error: "Invalid JSON body" });
    }

    return e.json(200, { ok: true, id: payload.id || "", type: payload.type || "" });
  } catch (err) {
    return e.json(500, { error: err && err.message ? err.message : String(err) });
  }
});
