import { GoogleGenAI } from "@google/genai";

function getAIClient() {
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  if (!apiKey || !baseUrl) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "", baseUrl },
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const ai = getAIClient();
    if (!ai) {
      return res.status(503).json({ error: "Transcription service not configured" });
    }

    const { base64 } = req.body;
    if (!base64 || typeof base64 !== "string") {
      return res.status(400).json({ error: "base64 audio data is required" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "audio/mp4", data: base64 } },
            {
              text: "Transcribe este audio en español. Responde SOLO con el texto transcrito, sin explicaciones ni formato adicional.",
            },
          ],
        },
      ],
      config: { maxOutputTokens: 512 },
    });

    const text = (response.text || "").trim();
    res.json({ text });
  } catch (error: any) {
    console.error("Transcription error:", error.message);
    res.status(500).json({ error: "Transcription failed" });
  }
}
