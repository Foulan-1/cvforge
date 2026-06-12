// pages/api/generate.js
// Vercel Serverless Function — calls Google Gemini to generate the CV

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Server misconfigured: missing GEMINI_API_KEY" });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", JSON.stringify(data));
      return res.status(500).json({ error: data?.error?.message || "AI generation failed" });
    }

    const raw = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";

    // Extract JSON object robustly
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
