// pages/api/webhook.js
// PayPal IPN listener — verifies the payment with PayPal, then marks the
// payer's email as "Pro" in a Supabase table called "pro_users".
//
// Supabase table setup (run once in Supabase SQL editor):
//
// create table pro_users (
//   email text primary key,
//   is_pro boolean default true,
//   amount text,
//   created_at timestamp default now()
// );

export const config = { api: { bodyParser: false } };

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const rawBody = (await buffer(req)).toString("utf-8");

    // 1) Verify this IPN message is genuinely from PayPal
    //    Sandbox and Live use different verification endpoints, and we can't
    //    know in advance which one sent this — so try Live first, and if
    //    that fails to verify, retry against the Sandbox endpoint.
    const verifyBody = "cmd=_notify-validate&" + rawBody;

    async function verifyWith(endpoint) {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: verifyBody,
      });
      return (await r.text()).trim();
    }

    let verifyText = await verifyWith("https://ipnpb.paypal.com/cgi-bin/webscr");
    if (verifyText !== "VERIFIED") {
      verifyText = await verifyWith("https://ipnpb.sandbox.paypal.com/cgi-bin/webscr");
    }

    if (verifyText !== "VERIFIED") {
      console.warn("IPN not verified (tried live + sandbox):", verifyText);
      return res.status(200).send("ignored");
    }
    console.log("✅ IPN verified successfully");

    // 2) Parse the IPN fields
    const params = new URLSearchParams(rawBody);
    const paymentStatus = params.get("payment_status");
    const payerEmail = params.get("payer_email");
    const amount = params.get("mc_gross");

    console.log("IPN:", { paymentStatus, payerEmail, amount });

    if (paymentStatus === "Completed" && payerEmail) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        // Upsert into pro_users table via Supabase REST API
        const resp = await fetch(`${supabaseUrl}/rest/v1/pro_users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "resolution=merge-duplicates",
          },
          body: JSON.stringify({
            email: payerEmail.toLowerCase(),
            is_pro: true,
            amount,
          }),
        });

        if (!resp.ok) {
          console.error("Supabase upsert failed:", await resp.text());
        } else {
          console.log(`✅ Marked ${payerEmail} as Pro in Supabase`);
        }
      } else {
        console.error("Missing Supabase env vars");
      }
    }

    return res.status(200).send("ok");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(200).send("error-logged"); // always 200 so PayPal doesn't retry forever
  }
}
