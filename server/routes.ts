import type { Express } from "express";
import { createServer, type Server } from "node:http";
import Tesseract from "tesseract.js";

function parseOCRFields(rawText: string) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  let name = '';
  let brand = '';
  let serial = '';
  let barcode = '';
  let price = '';

  const barcodePattern = /\b(\d{8,14})\b/;
  const pricePattern = /\$?\s?(\d+[.,]\d{2})/;
  const serialPattern = /([A-Z0-9][-A-Z0-9]{5,19})/;

  const brandKeywords = ['marca', 'brand', 'by ', 'fabricado', 'hecho por', 'manufactured'];
  const serialKeywords = ['s/n', 'serial', 'serie', 'sku', 'ref', 'modelo', 'model', 'no.', 'nº', 'código', 'codigo', 'part', 'parte', 'art', 'artículo'];
  const priceKeywords = ['precio', 'price', 'pvp', 'costo', 'cost', '$', 'mxn', 'usd'];
  const nameKeywords = ['producto', 'product', 'nombre', 'descripción', 'description', 'artículo'];

  for (const line of lines) {
    const lo = line.toLowerCase();

    if (!barcode) {
      const bm = line.match(barcodePattern);
      if (bm) barcode = bm[1];
    }

    if (!brand && brandKeywords.some(k => lo.includes(k))) {
      const cleaned = line.replace(/^(marca|brand|by|fabricado por|hecho por|manufactured by)[:\s]*/i, '').trim();
      if (cleaned) brand = cleaned;
    }

    if (!serial) {
      if (serialKeywords.some(k => lo.includes(k))) {
        const afterColon = line.split(/[:\s]+/);
        if (afterColon.length > 1) {
          const candidate = afterColon.slice(1).join(' ').trim();
          const sm = candidate.match(serialPattern);
          if (sm) serial = sm[1];
          else if (candidate.length >= 4) serial = candidate;
        }
      }
    }

    if (!price && priceKeywords.some(k => lo.includes(k))) {
      const pm = line.match(pricePattern);
      if (pm) price = pm[1].replace(',', '.');
    }

    if (!name && nameKeywords.some(k => lo.includes(k))) {
      const cleaned = line.replace(/^(producto|product|nombre|descripción|description|artículo)[:\s]*/i, '').trim();
      if (cleaned) name = cleaned;
    }
  }

  if (!price) {
    for (const line of lines) {
      const pm = line.match(pricePattern);
      if (pm) { price = pm[1].replace(',', '.'); break; }
    }
  }

  if (!serial) {
    for (const line of lines) {
      const sm = line.match(serialPattern);
      if (sm && sm[1].length >= 8 && !/^\d+$/.test(sm[1])) {
        serial = sm[1];
        break;
      }
    }
  }

  if (!name && lines.length > 0) {
    for (const line of lines) {
      if (line.length >= 3 && line.length <= 80 && !/^\d+$/.test(line) && !pricePattern.test(line)) {
        name = line;
        break;
      }
    }
  }

  if (!brand && lines.length > 1) {
    for (let i = 1; i < Math.min(lines.length, 4); i++) {
      const line = lines[i];
      if (line.length >= 2 && line.length <= 40 && !/^\d+$/.test(line) && !pricePattern.test(line) && line !== name) {
        brand = line;
        break;
      }
    }
  }

  return { name, brand, serial, barcode, price };
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/ocr", async (req, res) => {
    try {
      const { base64 } = req.body;
      if (!base64 || typeof base64 !== "string") {
        return res.status(400).json({ error: "base64 image data is required" });
      }

      if (base64.length > 20_000_000) {
        return res.status(400).json({ error: "Image too large" });
      }

      let data = base64;
      const prefixMatch = data.match(/^data:image\/\w+;base64,/);
      if (prefixMatch) {
        data = data.replace(/^data:image\/\w+;base64,/, "");
      }

      const buffer = Buffer.from(data, "base64");

      const result = await Tesseract.recognize(buffer, "spa+eng", {
        logger: () => {},
      });

      const rawText = result.data.text || "";
      const parsed = parseOCRFields(rawText);

      res.json({
        name: parsed.name,
        brand: parsed.brand,
        serial: parsed.serial,
        barcode: parsed.barcode,
        price: parsed.price,
        rawText: rawText,
      });
    } catch (error: any) {
      console.error("OCR error:", error.message);
      res.status(500).json({ error: "OCR processing failed" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
