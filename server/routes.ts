import type { Express } from "express";
import { createServer, type Server } from "node:http";
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
      const ai = getAIClient();
      if (!ai) {
        return res.status(503).json({ error: "OCR service not configured" });
      }

      const { base64 } = req.body;
      if (!base64 || typeof base64 !== "string") {
        return res.status(400).json({ error: "base64 image data is required" });
      }

      if (base64.length > 20_000_000) {
        return res.status(400).json({ error: "Image too large" });
      }

      const { mimeType, data } = detectMimeType(base64);

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: { mimeType, data },
              },
              {
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
        config: {
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "";
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
