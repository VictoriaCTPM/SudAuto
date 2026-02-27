import type { Express } from "express";
import { createServer, type Server } from "node:http";

function detectMimeType(base64: string): { mimeType: string; data: string } {
  let data = base64;
  let mimeType = "image/jpeg";

  const prefixMatch = data.match(/^data:(image\/\w+);base64,/);
  if (prefixMatch) {
    mimeType = prefixMatch[1];
    data = data.replace(/^data:image\/\w+;base64,/, "");
  }

  if (data.startsWith("/9j/")) mimeType = "image/jpeg";
  else if (data.startsWith("iVBOR")) mimeType = "image/png";
  else if (data.startsWith("R0lGOD")) mimeType = "image/gif";
  else if (data.startsWith("UklGR")) mimeType = "image/webp";

  return { mimeType, data };
}

function extractJSON(text: string): Record<string, string> {
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {}

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }

  return {};
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/ocr", async (req, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: "OCR service not configured: OPENAI_API_KEY missing" });
      }

      const { base64 } = req.body;
      if (!base64 || typeof base64 !== "string") {
        return res.status(400).json({ error: "base64 image data is required" });
      }

      if (base64.length > 20_000_000) {
        return res.status(400).json({ error: "Image too large" });
      }

      const { mimeType, data } = detectMimeType(base64);
      const imageUrl = `data:${mimeType};base64,${data}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 1024,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: imageUrl, detail: "high" },
                },
                {
                  type: "text",
                  text: `Analiza esta imagen de una etiqueta de producto. Extrae la siguiente información y responde SOLO con un objeto JSON válido:
{
  "name": "nombre del producto",
  "brand": "marca del producto",
  "serial": "número de serie, SKU o modelo",
  "barcode": "código de barras numérico (8-14 dígitos)",
  "price": "precio numérico sin símbolo de moneda, usar punto como separador decimal"
}
Si no encuentras algún campo, usa cadena vacía "". No inventes datos que no estén visibles en la imagen.`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error("OpenAI API error:", response.status, errBody);
        return res.status(502).json({ error: "OCR provider returned an error" });
      }

      const json = await response.json() as any;
      const text = json.choices?.[0]?.message?.content || "";
      const parsed = extractJSON(text);

      res.json({
        name: String(parsed.name || ""),
        brand: String(parsed.brand || ""),
        serial: String(parsed.serial || ""),
        barcode: String(parsed.barcode || ""),
        price: String(parsed.price || ""),
        rawText: text,
      });
    } catch (error: any) {
      console.error("OCR error:", error.message);
      res.status(500).json({ error: "OCR processing failed" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
