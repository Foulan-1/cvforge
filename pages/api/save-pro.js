// pages/api/save-pro.js
// Called after Gumroad payment to record Pro status in Supabase

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Missing email" });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/pro_users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        is_pro: true,
        amount: "5.00",
      }),
    });

    if (!resp.ok) {
      console.error("Supabase save failed:", await resp.text());
      return res.status(500).json({ error: "Failed to save" });
    }

    console.log(`✅ Saved ${email} as Pro via Gumroad`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("save-pro error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

