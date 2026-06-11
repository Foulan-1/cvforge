// pages/api/generate.js
// Vercel Serverless Function — calls Claude to generate the CV

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Server misconfigured: missing ANTHROPIC_API_KEY" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic error:", JSON.stringify(data));
      return res.status(500).json({ error: data?.error?.message || "AI generation failed" });
    }

    const raw = (data.content || []).map(b => b.text || "").join("");

    // Try to extract the JSON object from the response robustly
    let clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      console.error("No JSON found in response:", raw);
      return res.status(500).json({ error: "AI returned an unexpected format. Please try again." });
    }
    clean = clean.slice(firstBrace, lastBrace + 1);

    let cv;
    try {
      cv = JSON.parse(clean);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr.message, "raw:", clean);
      return res.status(500).json({ error: "AI returned invalid format. Please try again." });
    }

    return res.status(200).json({ cv });
  } catch (err) {
    console.error("Generate error:", err);
    return res.status(500).json({ error: "Failed to generate CV. Please try again." });
  }
}
