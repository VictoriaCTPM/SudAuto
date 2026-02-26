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

const VISION_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || '';

async function runOCR(base64: string): Promise<{ name: string; brand: string; serial: string; rawText: string }> {
  if (!VISION_API_KEY) {
    return { name: '', brand: '', serial: '', rawText: '' };
  }
  const body = {
    requests: [{ image: { content: base64 }, features: [{ type: 'TEXT_DETECTION', maxResults: 1 }] }],
  };
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const raw = json.responses?.[0]?.fullTextAnnotation?.text || '';
  const lines = raw.split('\n').map((l: string) => l.trim()).filter(Boolean);
  const serialPattern = /([A-Z0-9]{6,20})/;
  const brandKeywords = ['by ', 'brand:', 'manufactured by'];
  let name = lines[0] || '';
  let brand = '';
  let serial = '';
  for (const line of lines) {
    const lo = line.toLowerCase();
    if (brandKeywords.some((k) => lo.includes(k))) brand = line;
    const sm = line.match(serialPattern);
    if (sm && !serial) serial = sm[1];
  }
  if (!brand && lines.length > 1) brand = lines[1];
  return { name, brand, serial, rawText: raw };
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
          <Text style={[scanStyles.resultTitle, { color: theme.text }]}>{found ? found.name : 'Product Not Found'}</Text>
          <Text style={[scanStyles.resultSub, { color: theme.textSecondary }]}>{data}</Text>
        </View>
        <Pressable onPress={onClose}>
          <Ionicons name="close" size={22} color={theme.textTertiary} />
        </Pressable>
      </View>
      {found && (
        <View style={scanStyles.resultDetails}>
          <Text style={[scanStyles.detailText, { color: theme.textSecondary }]}>
            Brand: <Text style={{ color: theme.text }}>{found.brand}</Text>
          </Text>
          <Text style={[scanStyles.detailText, { color: theme.textSecondary }]}>
            In Stock: <Text style={{ color: found.quantity <= found.minQuantity ? theme.danger : theme.success }}>{found.quantity}</Text>
          </Text>
          <Text style={[scanStyles.detailText, { color: theme.textSecondary }]}>
            Price: <Text style={{ color: theme.text }}>${found.grossPrice.toFixed(2)}</Text>
          </Text>
        </View>
      )}
      <View style={scanStyles.resultActions}>
        {found ? (
          <Pressable
            onPress={() => { onClose(); router.push({ pathname: '/product/[id]', params: { id: found.id } }); }}
            style={[scanStyles.actionBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={scanStyles.actionBtnText}>View Product</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => { onClose(); router.push({ pathname: '/product/new', params: { barcode: data } }); }}
            style={[scanStyles.actionBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={scanStyles.actionBtnText}>Add New Product</Text>
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
  const [ocrResult, setOcrResult] = useState<{ name: string; brand: string; serial: string; photoUri: string } | null>(null);

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
      showToast('Photo library access required', 'error');
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
    if (!permission?.granted) { requestPermission(); return; }
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
      if (!VISION_API_KEY) {
        showToast('No Google Vision API key set. Redirecting to manual entry.', 'info');
        router.push({ pathname: '/product/new', params: { photoUri: uri } });
        return;
      }
      const result = await runOCR(base64);
      setOcrResult({ ...result, photoUri: uri });
    } catch (e) {
      showToast('OCR failed. Please try again.', 'error');
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
        <Text style={[styles.title, { color: theme.text }]}>Scan</Text>
        <View style={[styles.modeSwitch, { backgroundColor: theme.backgroundTertiary }]}>
          {(['barcode', 'ocr'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => { setMode(m); setScanned(false); setScanResult(null); setOcrResult(null); }}
              style={[styles.modeBtn, mode === m && { backgroundColor: theme.accent }]}
            >
              <Ionicons name={m === 'barcode' ? 'barcode-outline' : 'camera-outline'} size={16} color={mode === m ? '#0D1117' : theme.textSecondary} />
              <Text style={[styles.modeText, { color: mode === m ? '#0D1117' : theme.textSecondary }]}>
                {m === 'barcode' ? 'Barcode' : 'OCR'}
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
              <Text style={[styles.permText, { color: theme.text }]}>Camera access needed</Text>
              <Pressable onPress={requestPermission} style={[styles.permBtn, { backgroundColor: theme.accent }]}>
                <Text style={styles.permBtnText}>Grant Access</Text>
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
                  <Text style={styles.scanHint}>Align barcode within frame</Text>
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
                  <Text style={styles.rescanText}>Scan Again</Text>
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
            <Text style={[styles.ocrTitle, { color: theme.text }]}>Label & OCR Scanner</Text>
            <Text style={[styles.ocrSub, { color: theme.textSecondary }]}>
              Take or upload a photo of a product label. Google Cloud Vision will auto-fill product details.
            </Text>
            {!VISION_API_KEY && (
              <View style={[styles.apiNotice, { backgroundColor: theme.warning + '18' }]}>
                <Ionicons name="information-circle" size={16} color={theme.warning} />
                <Text style={[styles.apiNoticeText, { color: theme.warning }]}>
                  Set EXPO_PUBLIC_GOOGLE_VISION_API_KEY for OCR. Without it, you'll proceed to manual entry.
                </Text>
              </View>
            )}
          </View>

          {ocrLoading ? (
            <View style={styles.ocrLoading}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={[styles.ocrLoadingText, { color: theme.textSecondary }]}>Analyzing label...</Text>
            </View>
          ) : ocrResult ? (
            <View style={[styles.ocrResultBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Image source={{ uri: ocrResult.photoUri }} style={styles.ocrPreview} contentFit="cover" />
              <View style={styles.ocrResultFields}>
                <Text style={[styles.ocrFieldLabel, { color: theme.textSecondary }]}>Detected Name</Text>
                <Text style={[styles.ocrFieldValue, { color: theme.text }]}>{ocrResult.name || '—'}</Text>
                <Text style={[styles.ocrFieldLabel, { color: theme.textSecondary }]}>Detected Brand</Text>
                <Text style={[styles.ocrFieldValue, { color: theme.text }]}>{ocrResult.brand || '—'}</Text>
                <Text style={[styles.ocrFieldLabel, { color: theme.textSecondary }]}>Serial / Code</Text>
                <Text style={[styles.ocrFieldValue, { color: theme.text }]}>{ocrResult.serial || '—'}</Text>
              </View>
              <View style={styles.ocrResultActions}>
                <Pressable
                  onPress={() => setOcrResult(null)}
                  style={[styles.ocrBtn, { borderWidth: 1, borderColor: theme.cardBorder }]}
                >
                  <Text style={[styles.ocrBtnText, { color: theme.text }]}>Retake</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push({
                    pathname: '/product/new',
                    params: {
                      prefillName: ocrResult.name,
                      prefillBrand: ocrResult.brand,
                      prefillSerial: ocrResult.serial,
                      photoUri: ocrResult.photoUri,
                    },
                  })}
                  style={[styles.ocrBtn, { backgroundColor: theme.accent, flex: 1.5 }]}
                >
                  <Text style={[styles.ocrBtnText, { color: '#0D1117' }]}>Use These Details</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.ocrButtons}>
              <Pressable onPress={takePhotoForOCR} style={[styles.ocrActionBtn, { backgroundColor: theme.accent }]}>
                <Ionicons name="camera" size={24} color="#0D1117" />
                <Text style={[styles.ocrActionText, { color: '#0D1117' }]}>Take Photo</Text>
              </Pressable>
              <Pressable onPress={pickPhotoForOCR} style={[styles.ocrActionBtn, { backgroundColor: theme.backgroundTertiary, borderWidth: 1, borderColor: theme.cardBorder }]}>
                <Ionicons name="images-outline" size={24} color={theme.text} />
                <Text style={[styles.ocrActionText, { color: theme.text }]}>Choose from Library</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/product/new')}
                style={[styles.ocrActionBtn, { backgroundColor: theme.backgroundTertiary, borderWidth: 1, borderColor: theme.cardBorder }]}
              >
                <Ionicons name="create-outline" size={24} color={theme.text} />
                <Text style={[styles.ocrActionText, { color: theme.text }]}>Manual Entry</Text>
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
  apiNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 12, marginTop: 4 },
  apiNoticeText: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 18 },
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
