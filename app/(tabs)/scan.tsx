import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, useColorScheme,
  Platform, Alert, TextInput, ScrollView, Modal, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useInventory } from '@/contexts/InventoryContext';
import { useToast } from '@/components/Toast';
import * as Haptics from 'expo-haptics';

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : 'http://localhost:5000';

interface OCRFields {
  name: string;
  brand: string;
  serial: string;
  barcode: string;
  price: string;
  rawText: string;
}

async function runOCR(base64: string): Promise<OCRFields> {
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

function ScanResult({ data, onClose, theme }: { data: any; onClose: () => void; theme: any }) {
  const { products } = useInventory();
  const found = products.find((p) => p.barcode === data || p.serialNumber === data);

  return (
    <View style={[scanStyles.resultBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={scanStyles.resultHeader}>
        <View style={[scanStyles.resultIcon, { backgroundColor: found ? theme.success + '22' : theme.accent + '22' }]}>
          <Ionicons name={found ? 'checkmark-circle' : 'cube-outline'} size={24} color={found ? theme.success : theme.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[scanStyles.resultTitle, { color: theme.text }]}>{found ? found.name : 'Producto no encontrado'}</Text>
          <Text style={[scanStyles.resultSub, { color: theme.textSecondary }]}>{data}</Text>
        </View>
        <Pressable onPress={onClose}>
          <Ionicons name="close" size={22} color={theme.textTertiary} />
        </Pressable>
      </View>
      {found && (
        <View style={scanStyles.resultDetails}>
          <Text style={[scanStyles.detailText, { color: theme.textSecondary }]}>
            Marca: <Text style={{ color: theme.text }}>{found.brand}</Text>
          </Text>
          <Text style={[scanStyles.detailText, { color: theme.textSecondary }]}>
            En stock: <Text style={{ color: found.quantity <= found.minQuantity ? theme.danger : theme.success }}>{found.quantity}</Text>
          </Text>
          <Text style={[scanStyles.detailText, { color: theme.textSecondary }]}>
            Precio: <Text style={{ color: theme.text }}>${found.grossPrice.toFixed(2)}</Text>
          </Text>
        </View>
      )}
      <View style={scanStyles.resultActions}>
        {found ? (
          <Pressable
            onPress={() => { onClose(); router.push({ pathname: '/product/[id]', params: { id: found.id } }); }}
            style={[scanStyles.actionBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={scanStyles.actionBtnText}>Ver producto</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => { onClose(); router.push({ pathname: '/product/new', params: { barcode: data } }); }}
            style={[scanStyles.actionBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={scanStyles.actionBtnText}>Agregar producto</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const scanStyles = StyleSheet.create({
  resultBox: { margin: 16, borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  resultSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  resultDetails: { gap: 4, paddingVertical: 4 },
  detailText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  resultActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#0D1117' },
});

export default function ScanScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'barcode' | 'ocr'>('barcode');
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<(OCRFields & { photoUri: string }) | null>(null);

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const handleBarcode = useCallback(({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScanResult(data);
  }, [scanned]);

  const pickPhotoForOCR = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Se requiere acceso a la galería', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true, quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled && result.assets[0]) {
      await processOCR(result.assets[0].base64!, result.assets[0].uri);
    }
  };

  const takePhotoForOCR = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Se requiere acceso a la cámara', 'error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true, quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      await processOCR(result.assets[0].base64!, result.assets[0].uri);
    }
  };

  const processOCR = async (base64: string, uri: string) => {
    setOcrLoading(true);
    try {
      const result = await runOCR(base64);
      setOcrResult({ ...result, photoUri: uri });
    } catch (e) {
      showToast('Error en OCR. Intenta de nuevo.', 'error');
    } finally {
      setOcrLoading(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background, paddingTop: topPad }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: theme.text }]}>Escanear</Text>
        <View style={[styles.modeSwitch, { backgroundColor: theme.backgroundTertiary }]}>
          {(['barcode', 'ocr'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => { setMode(m); setScanned(false); setScanResult(null); setOcrResult(null); }}
              style={[styles.modeBtn, mode === m && { backgroundColor: theme.accent }]}
            >
              <Ionicons name={m === 'barcode' ? 'barcode-outline' : 'camera-outline'} size={16} color={mode === m ? '#0D1117' : theme.textSecondary} />
              <Text style={[styles.modeText, { color: mode === m ? '#0D1117' : theme.textSecondary }]}>
                {m === 'barcode' ? 'Código' : 'Etiqueta'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {mode === 'barcode' ? (
        <View style={styles.cameraWrap}>
          {!permission.granted ? (
            <View style={[styles.permBox, { backgroundColor: theme.backgroundTertiary }]}>
              <Ionicons name="camera-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.permText, { color: theme.text }]}>Se necesita acceso a la cámara</Text>
              <Pressable onPress={requestPermission} style={[styles.permBtn, { backgroundColor: theme.accent }]}>
                <Text style={styles.permBtnText}>Otorgar acceso</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <CameraView
                style={styles.camera}
                barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'] }}
                onBarcodeScanned={scanned ? undefined : handleBarcode}
              >
                <View style={styles.scanOverlay}>
                  <View style={styles.scanFrame}>
                    <View style={[styles.corner, styles.cornerTL, { borderColor: theme.accent }]} />
                    <View style={[styles.corner, styles.cornerTR, { borderColor: theme.accent }]} />
                    <View style={[styles.corner, styles.cornerBL, { borderColor: theme.accent }]} />
                    <View style={[styles.corner, styles.cornerBR, { borderColor: theme.accent }]} />
                  </View>
                  <Text style={styles.scanHint}>Alinea el código de barras en el marco</Text>
                </View>
              </CameraView>
              {scanResult && (
                <ScanResult
                  data={scanResult}
                  theme={theme}
                  onClose={() => { setScanResult(null); setScanned(false); }}
                />
              )}
              {scanned && !scanResult && (
                <Pressable
                  onPress={() => setScanned(false)}
                  style={[styles.rescanBtn, { backgroundColor: theme.accent }]}
                >
                  <Text style={styles.rescanText}>Escanear de nuevo</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.ocrContent, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 100) }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.ocrHero, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="scan-circle-outline" size={64} color={theme.accent} />
            <Text style={[styles.ocrTitle, { color: theme.text }]}>Escáner de etiquetas</Text>
            <Text style={[styles.ocrSub, { color: theme.textSecondary }]}>
              Toma o sube una foto de la etiqueta del producto. Se extraerán automáticamente el nombre, marca, código de barras y precio.
            </Text>
          </View>

          {ocrLoading ? (
            <View style={styles.ocrLoading}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={[styles.ocrLoadingText, { color: theme.textSecondary }]}>Analizando etiqueta...</Text>
            </View>
          ) : ocrResult ? (
            <View style={[styles.ocrResultBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Image source={{ uri: ocrResult.photoUri }} style={styles.ocrPreview} contentFit="cover" />
              <View style={styles.ocrResultFields}>
                <Text style={[styles.ocrFieldLabel, { color: theme.textSecondary }]}>Nombre detectado</Text>
                <Text style={[styles.ocrFieldValue, { color: theme.text }]}>{ocrResult.name || '—'}</Text>
                <Text style={[styles.ocrFieldLabel, { color: theme.textSecondary }]}>Marca detectada</Text>
                <Text style={[styles.ocrFieldValue, { color: theme.text }]}>{ocrResult.brand || '—'}</Text>
                <Text style={[styles.ocrFieldLabel, { color: theme.textSecondary }]}>Serie / Código</Text>
                <Text style={[styles.ocrFieldValue, { color: theme.text }]}>{ocrResult.serial || '—'}</Text>
                <Text style={[styles.ocrFieldLabel, { color: theme.textSecondary }]}>Código de barras</Text>
                <Text style={[styles.ocrFieldValue, { color: theme.text }]}>{ocrResult.barcode || '—'}</Text>
                <Text style={[styles.ocrFieldLabel, { color: theme.textSecondary }]}>Precio detectado</Text>
                <Text style={[styles.ocrFieldValue, { color: theme.text }]}>{ocrResult.price ? `$${ocrResult.price}` : '—'}</Text>
              </View>
              <View style={styles.ocrResultActions}>
                <Pressable
                  onPress={() => setOcrResult(null)}
                  style={[styles.ocrBtn, { borderWidth: 1, borderColor: theme.cardBorder }]}
                >
                  <Text style={[styles.ocrBtnText, { color: theme.text }]}>Reintentar</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push({
                    pathname: '/product/new',
                    params: {
                      prefillName: ocrResult.name,
                      prefillBrand: ocrResult.brand,
                      prefillSerial: ocrResult.serial,
                      prefillBarcode: ocrResult.barcode,
                      prefillPrice: ocrResult.price,
                      photoUri: ocrResult.photoUri,
                    },
                  })}
                  style={[styles.ocrBtn, { backgroundColor: theme.accent, flex: 1.5 }]}
                >
                  <Text style={[styles.ocrBtnText, { color: '#0D1117' }]}>Usar estos datos</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.ocrButtons}>
              <Pressable onPress={takePhotoForOCR} style={[styles.ocrActionBtn, { backgroundColor: theme.accent }]}>
                <Ionicons name="camera" size={24} color="#0D1117" />
                <Text style={[styles.ocrActionText, { color: '#0D1117' }]}>Tomar foto</Text>
              </Pressable>
              <Pressable onPress={pickPhotoForOCR} style={[styles.ocrActionBtn, { backgroundColor: theme.backgroundTertiary, borderWidth: 1, borderColor: theme.cardBorder }]}>
                <Ionicons name="images-outline" size={24} color={theme.text} />
                <Text style={[styles.ocrActionText, { color: theme.text }]}>Elegir de la galería</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/product/new')}
                style={[styles.ocrActionBtn, { backgroundColor: theme.backgroundTertiary, borderWidth: 1, borderColor: theme.cardBorder }]}
              >
                <Ionicons name="create-outline" size={24} color={theme.text} />
                <Text style={[styles.ocrActionText, { color: theme.text }]}>Entrada manual</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  modeSwitch: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 2 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  modeText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  cameraWrap: { flex: 1 },
  camera: { flex: 1 },
  scanOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  scanFrame: { width: 240, height: 160, position: 'relative' },
  corner: { position: 'absolute', width: 24, height: 24, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanHint: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: 'Inter_400Regular' },
  rescanBtn: { margin: 16, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rescanText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#0D1117' },
  permBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, margin: 16, borderRadius: 20, padding: 32 },
  permText: { fontSize: 16, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  permBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  permBtnText: { fontFamily: 'Inter_600SemiBold', color: '#0D1117' },
  ocrContent: { padding: 16, gap: 16 },
  ocrHero: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', gap: 12 },
  ocrTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  ocrSub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  ocrLoading: { alignItems: 'center', gap: 16, paddingVertical: 40 },
  ocrLoadingText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  ocrResultBox: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  ocrPreview: { width: '100%', height: 200 },
  ocrResultFields: { padding: 16, gap: 4 },
  ocrFieldLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.5 },
  ocrFieldValue: { fontSize: 15, fontFamily: 'Inter_500Medium', marginBottom: 8 },
  ocrResultActions: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 0 },
  ocrBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ocrBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  ocrButtons: { gap: 12 },
  ocrActionBtn: { height: 58, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  ocrActionText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
