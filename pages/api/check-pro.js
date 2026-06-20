here// pages/api/check-pro.js
// Checks Supabase "pro_users" table to see if a given email has paid for Pro

export default async function handler(req, res) {
  const email = (req.method === "POST" ? req.body?.email : req.query?.email);
  if (!email) return res.status(400).json({ error: "Missing email" });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
        error: "Server misconfigured",
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
    });
}

  try {
    const url = `${supabaseUrl}/rest/v1/pro_users?email=eq.${encodeURIComponent(email.toLowerCase())}&select=is_pro`;
    const r = await fetch(url, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
      },
    });
    const data = await r.json();
    return res.status(200).json({ 
    debug: true,
    status: r.status,
    data: data
});
  } catch (err) {
    console.error("check-pro error:", err);
    return res.status(500).json({ error: "Failed to check status" });
  }
}
