// pages/api/checkout.js
// Creates a Stripe Checkout Session for the $5 Pro upgrade

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body;
  const origin = req.headers.origin || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 500, // $5.00
            product_data: {
              name: "CVForge.ai Pro",
              description: "All 8 sectors · PDF download · Unlimited regenerations · No watermark",
              images: [],
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/?pro=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/?canceled=true`,
      metadata: { product: "cvforge_pro" },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: err.message });
  }
}
