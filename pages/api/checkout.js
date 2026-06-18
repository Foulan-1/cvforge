// pages/api/checkout.js
// Creates a PayPal payment link for the $5 Pro upgrade

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body || {};
  const AMOUNT = "5.00";
  const ITEM_NAME = "CVForge Pro - AI CV Generator";
  const origin = req.headers.origin || process.env.NEXT_PUBLIC_URL || "https://cvforger-sh.vercel.app";

  // Temporary testing toggle: set PAYPAL_SANDBOX=true in Vercel env vars to
  // route payments through PayPal Sandbox instead of Live. Remove or set to
  // "false" before real launch.
  const isSandbox = process.env.PAYPAL_SANDBOX === "true";
  const paypalDomain = isSandbox ? "https://www.sandbox.paypal.com" : "https://www.paypal.com";

  // In sandbox mode, payments must go to YOUR sandbox BUSINESS account email
  // (not your real PayPal email) — set PAYPAL_SANDBOX_BUSINESS_EMAIL in Vercel.
  const PAYPAL_EMAIL = isSandbox
    ? (process.env.PAYPAL_SANDBOX_BUSINESS_EMAIL || "")
    : "johncoolsaints1999@gmail.com";

  if (isSandbox && !PAYPAL_EMAIL) {
    return res.status(500).json({ error: "Missing PAYPAL_SANDBOX_BUSINESS_EMAIL env var for sandbox testing" });
  }

  const returnUrl = `${origin}/?pro=true${email ? `&email=${encodeURIComponent(email)}` : ""}`;
  const cancelUrl = `${origin}/?canceled=true`;

  let paypalUrl = `${paypalDomain}/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(PAYPAL_EMAIL)}&item_name=${encodeURIComponent(ITEM_NAME)}&amount=${AMOUNT}&currency_code=USD&return=${encodeURIComponent(returnUrl)}&cancel_return=${encodeURIComponent(cancelUrl)}`;

  if (email) {
    paypalUrl += `&custom=${encodeURIComponent(email)}`;
  }

  return res.status(200).json({ url: paypalUrl });
}
