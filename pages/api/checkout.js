// pages/api/checkout.js
// Creates a PayPal payment link for the $5 Pro upgrade

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // PayPal direct payment link
  // When user clicks pay, they go directly to PayPal to pay $5
  const PAYPAL_EMAIL = "johncoolsaints1999@gmail.com";
  const AMOUNT = "5.00";
  const ITEM_NAME = "CVForge Pro - AI CV Generator";
  const origin = req.headers.origin || process.env.NEXT_PUBLIC_URL || "https://cvforge.vercel.app";

  const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(PAYPAL_EMAIL)}&item_name=${encodeURIComponent(ITEM_NAME)}&amount=${AMOUNT}&currency_code=USD&return=${encodeURIComponent(origin + "/?pro=true")}&cancel_return=${encodeURIComponent(origin + "/?canceled=true")}`;

  return res.status(200).json({ url: paypalUrl });
}
