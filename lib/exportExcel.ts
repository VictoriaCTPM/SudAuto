import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

function triggerDownloadWeb(data: ArrayBuffer, filename: string) {
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function triggerShareNative(data: ArrayBuffer, filename: string) {
  const FileSystem = await import('expo-file-system');
  const Sharing = await import('expo-sharing');

  const uint8 = new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = btoa(binary);

  const fileUri = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: filename,
    });
  }
}

export interface ProductRow {
  name: string;
  brand: string;
  category: string;
  barcode: string;
  serialNumber: string;
  netPrice: number;
  grossPrice: number;
  quantity: number;
  minQuantity: number;
  supplier: string;
}

export interface SaleRow {
  productName: string;
  productBrand: string;
  quantity: number;
  saleNetPrice: number;
  saleGrossPrice: number;
  purchaseNetPrice: number;
  purchaseGrossPrice: number;
  soldAt: string;
}

export async function exportInventoryToExcel(products: ProductRow[]) {
  const rows = products.map((p) => ({
    'Nombre': p.name,
    'Marca': p.brand,
    'Categoría': p.category,
    'Código de barras': p.barcode,
    'Serie / SKU': p.serialNumber,
    'Precio neto': p.netPrice,
    'Precio de venta': p.grossPrice,
    'Cantidad': p.quantity,
    'Stock mínimo': p.minQuantity,
    'Proveedor': p.supplier,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const colWidths = [
    { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 16 },
    { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 10 },
    { wch: 12 }, { wch: 20 },
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const filename = `inventario_${new Date().toISOString().slice(0, 10)}.xlsx`;

  if (Platform.OS === 'web') {
    triggerDownloadWeb(data, filename);
  } else {
    await triggerShareNative(data, filename);
  }
}

export async function exportSalesToExcel(sales: SaleRow[]) {
  const rows = sales.map((s) => ({
    'Producto': s.productName,
    'Marca': s.productBrand,
    'Cantidad': s.quantity,
    'Precio neto venta': s.saleNetPrice,
    'Precio de venta': s.saleGrossPrice,
    'Costo neto': s.purchaseNetPrice,
    'Costo de compra': s.purchaseGrossPrice,
    'Ganancia unitaria': s.saleGrossPrice - s.purchaseGrossPrice,
    'Ganancia total': (s.saleGrossPrice - s.purchaseGrossPrice) * s.quantity,
    'Fecha': new Date(s.soldAt).toLocaleString('es'),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const colWidths = [
    { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 14 },
    { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 16 },
    { wch: 14 }, { wch: 20 },
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const filename = `ventas_${new Date().toISOString().slice(0, 10)}.xlsx`;

  if (Platform.OS === 'web') {
    triggerDownloadWeb(data, filename);
  } else {
    await triggerShareNative(data, filename);
  }
}
