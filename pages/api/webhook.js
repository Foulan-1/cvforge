// pages/api/webhook.js
// PayPal REST API Webhook — verifies the event signature from PayPal,
// then marks the payer's email as Pro in Supabase on successful payment.
//
// Required Vercel env vars:
//   PAYPAL_WEBHOOK_ID        — from PayPal Developer Dashboard → Webhooks
//   PAYPAL_CLIENT_ID         — from PayPal Developer Dashboard → Apps & Credentials
//   PAYPAL_CLIENT_SECRET     — from PayPal Developer Dashboard → Apps & Credentials
//   PAYPAL_SANDBOX           — "true" for testing, remove for live
//   SUPABASE_URL             — your Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY — your Supabase service role key

export const config = { api: { bodyParser: false } };

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable)
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

async function getPayPalAccessToken() {
  const isSandbox = process.env.PAYPAL_SANDBOX === "true";
  const base = isSandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
        ).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token;
}

async function verifyPayPalWebhook(req, rawBody) {
  const isSandbox = process.env.PAYPAL_SANDBOX === "true";
  const base = isSandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  const accessToken = await getPayPalAccessToken();

  const verifyPayload = {
    auth_algo: req.headers["paypal-auth-algo"],
    cert_url: req.headers["paypal-cert-url"],
    transmission_id: req.headers["paypal-transmission-id"],
    transmission_sig: req.headers["paypal-transmission-sig"],
    transmission_time: req.headers["paypal-transmission-time"],
    webhook_id: process.env.PAYPAL_WEBHOOK_ID,
    webhook_event: JSON.parse(rawBody.toString()),
  };

  const res = await fetch(
    `${base}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(verifyPayload),
    }
  );
  const data = await res.json();
  return data.verification_status === "SUCCESS";
}

async function markProInSupabase(email, amount) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const resp = await fetch(`${supabaseUrl}/rest/v1/pro_users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ email: email.toLowerCase(), is_pro: true, amount }),
  });

  if (!resp.ok) {
    console.error("Supabase upsert failed:", await resp.text());
    return false;
  }
  console.log(`✅ Marked ${email} as Pro in Supabase`);
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const rawBody = await buffer(req);

    // 1) Verify the webhook signature
    const isValid = await verifyPayPalWebhook(req, rawBody);
    if (!isValid) {
      console.warn("PayPal webhook signature verification failed");
      return res.status(400).send("Invalid signature");
    }

    // 2) Parse the event
    const event = JSON.parse(rawBody.toString());
    console.log("PayPal webhook event:", event.event_type);

    // 3) Handle successful payment
    if (
      event.event_type === "PAYMENT.CAPTURE.COMPLETED" ||
      event.event_type === "CHECKOUT.ORDER.APPROVED"
    ) {
      const payerEmail =
        event.resource?.payer?.email_address ||
        event.resource?.payment_source?.paypal?.email_address;
      const amount =
        event.resource?.amount?.value ||
        event.resource?.purchase_units?.[0]?.amount?.value;

      if (payerEmail) {
        await markProInSupabase(payerEmail, amount);
      } else {
        console.warn("Could not extract payer email from event:", JSON.stringify(event.resource));
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).send("Error");
  }
}
