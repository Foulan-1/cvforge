// pages/api/checkout.js
// Redirects user to Gumroad product page for payment.
// Gumroad handles all payment processing and pays out to your PayPal personal account.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body || {};

  // Gumroad product URL — after payment, Gumroad redirects back with ?pro=true
  const GUMROAD_URL = "https://foulan.gumroad.com/l/uycsqa";

  // Pass email and return URL as Gumroad URL params so we can auto-unlock Pro on return
  const origin = req.headers.origin || process.env.NEXT_PUBLIC_URL || "https://cvforger-sh.vercel.app";
  const returnUrl = `${origin}/?pro=true${email ? `&email=${encodeURIComponent(email)}` : ""}`;

  const finalUrl = `${GUMROAD_URL}?wanted=true&email=${encodeURIComponent(email || "")}&referrer=${encodeURIComponent(returnUrl)}`;

  return res.status(200).json({ url: finalUrl });
}
