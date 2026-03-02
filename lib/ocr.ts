const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : typeof window !== 'undefined' ? '' : 'http://localhost:5000';

export interface OCRFields {
  name: string;
  brand: string;
  serial: string;
  barcode: string;
  price: string;
  rawText: string;
}

export async function runOCR(base64: string): Promise<OCRFields> {
  const res = await fetch(`${API_BASE}/api/ocr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64 }),
  });
  if (!res.ok) {
    throw new Error('OCR request failed');
  }
  return await res.json();
}
