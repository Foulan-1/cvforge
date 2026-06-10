// pages/api/webhook.js
// Stripe webhook — verifies payment is complete
// In production: store isPro=true in a database (e.g. Supabase) keyed by email/session

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { api: { bodyParser: false } };

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sig  = req.headers["stripe-signature"];
  const buf  = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email   = session.customer_email;
    const sessionId = session.id;

    console.log(`✅ Payment complete — email: ${email}, session: ${sessionId}`);
    // TODO: save to database (e.g. Supabase, PlanetScale, Upstash)
    // await db.set(`pro:${email}`, true)
  }

  res.status(200).json({ received: true });
}
