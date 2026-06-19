// pages/api/paypal-webhook.js
import { Buffer } from 'buffer';

export const config = { api: { bodyParser: false } };

async function getRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// دالة لجلب الـ Access Token من باي بال للتحقق من التوقيع
async function getPayPalAccessToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const rawBodyText = (await getRawBody(req)).toString("utf-8");
    const jsonBody = JSON.parse(rawBodyText);

    // 1) جلب الـ Access Token
    const accessToken = await getPayPalAccessToken();

    // 2) إرسال طلب لباي بال للتحقق من أن هذا الـ Webhook شرعي ولم يتم تزويره
    const verifyRes = await fetch("https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: req.headers["paypal-auth-algo"],
        cert_url: req.headers["paypal-cert-url"],
        transmission_id: req.headers["paypal-transmission-id"],
        transmission_sig: req.headers["paypal-transmission-sig"],
        transmission_time: req.headers["paypal-transmission-time"],
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: jsonBody,
      }),
    });

    const verifyData = await verifyRes.json();

    if (verifyData.verification_status !== "SUCCESS") {
      console.warn("❌ Webhook signature verification failed");
      return res.status(200).send("Invalid Signature");
    }

    console.log("✅ Webhook verified successfully via REST API");

    // 3) معالجة الحدث عند نجاح الدفع
    if (jsonBody.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      // هنا باي بال يرسل إيميل المشتري داخل هيكلة واضحة
      const payerEmail = jsonBody.resource.payer?.email_address;
      const amount = jsonBody.resource.amount?.value;

      console.log("Payment Received:", { payerEmail, amount });

      if (payerEmail) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseKey) {
          // تحديث بيانات المستخدم في Supabase
          const resp = await fetch(`${supabaseUrl}/rest/v1/pro_users`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Prefer: "resolution=merge-duplicates",
            },
            body: JSON.stringify({
              email: payerEmail.toLowerCase(),
              is_pro: true,
              amount: amount,
            }),
          });

          if (!resp.ok) {
            console.error("Supabase upsert failed:", await resp.text());
          } else {
            console.log(`🎉 Successfully upgraded ${payerEmail} to Pro!`);
          }
        }
      }
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(200).send("Error logged");
  }
}
