import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  Pressable, useColorScheme, Platform, KeyboardAvoidingView,
  Modal, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useInventory } from '@/contexts/InventoryContext';
import { useToast } from '@/components/Toast';
import * as Haptics from 'expo-haptics';

export default function NewProductScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    prefillName?: string; prefillBrand?: string; prefillSerial?: string;
    prefillBarcode?: string; prefillPrice?: string;
    barcode?: string; photoUri?: string;
  }>();
  const { addProduct, categories, addCategory } = useInventory();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: params.prefillName || '',
    brand: params.prefillBrand || '',
    serialNumber: params.prefillSerial || '',
    barcode: params.prefillBarcode || params.barcode || '',
    category: 'Otro',
    netPrice: params.prefillPrice || '',
    grossPrice: params.prefillPrice || '',
    quantity: '1',
    minQuantity: '5',
    supplier: '',
    notes: '',
  });
  const [photoUri, setPhotoUri] = useState(params.photoUri || '');
  const [loading, setLoading] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [newCat, setNewCat] = useState('');

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showToast('Se requiere acceso a la galería', 'error'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Se requiere acceso a la cámara', 'error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('El nombre del producto es obligatorio', 'error'); return; }
    setLoading(true);
    try {
      await addProduct({
        name: form.name.trim(),
        brand: form.brand.trim(),
        serialNumber: form.serialNumber.trim(),
        barcode: form.barcode.trim(),
        category: form.category,
        netPrice: parseFloat(form.netPrice) || 0,
        grossPrice: parseFloat(form.grossPrice) || 0,
        quantity: parseInt(form.quantity) || 0,
        minQuantity: parseInt(form.minQuantity) || 5,
        supplier: form.supplier.trim(),
        notes: form.notes.trim(),
        photoUri: photoUri || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Producto agregado', 'success');
      router.back();
    } catch (e: any) {
      showToast(e.message || 'Error al agregar producto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCat.trim()) return;
    await addCategory(newCat.trim());
    set('category', newCat.trim());
    setNewCat('');
    setCatModal(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 16, borderBottomColor: theme.separator }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={theme.textTertiary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Agregar producto</Text>
        <Pressable onPress={handleSave} disabled={loading}>
          <Text style={[styles.saveBtn, { color: loading ? theme.textTertiary : theme.accent }]}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.photoSection}>
          {photoUri ? (
            <Pressable onPress={pickPhoto} style={[styles.photoPreview, { borderColor: theme.cardBorder }]}>
              <Image source={{ uri: photoUri }} style={styles.photoImg} contentFit="cover" />
              <View style={[styles.photoOverlay, { backgroundColor: theme.overlay }]}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </Pressable>
          ) : (
            <View style={styles.photoButtons}>
              <Pressable onPress={takePhoto} style={[styles.photoBtn, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder }]}>
                <Ionicons name="camera-outline" size={24} color={theme.textSecondary} />
                <Text style={[styles.photoBtnText, { color: theme.textSecondary }]}>Cámara</Text>
              </Pressable>
              <Pressable onPress={pickPhoto} style={[styles.photoBtn, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder }]}>
                <Ionicons name="images-outline" size={24} color={theme.textSecondary} />
                <Text style={[styles.photoBtnText, { color: theme.textSecondary }]}>Galería</Text>
              </Pressable>
            </View>
          )}
        </View>

        <FieldGroup title="Información básica" theme={theme}>
          <Field label="Nombre del producto *" theme={theme}>
            <TextInput style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]} value={form.name} onChangeText={(v) => set('name', v)} placeholder="Ingresa nombre del producto" placeholderTextColor={theme.placeholder} />
          </Field>
          <Field label="Marca" theme={theme}>
            <TextInput style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]} value={form.brand} onChangeText={(v) => set('brand', v)} placeholder="Nombre de la marca" placeholderTextColor={theme.placeholder} />
          </Field>
          <Field label="Número de serie / SKU" theme={theme}>
            <TextInput style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]} value={form.serialNumber} onChangeText={(v) => set('serialNumber', v)} placeholder="Serie o SKU" placeholderTextColor={theme.placeholder} autoCapitalize="characters" />
          </Field>
          <Field label="Código de barras / EAN" theme={theme}>
            <TextInput style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]} value={form.barcode} onChangeText={(v) => set('barcode', v)} placeholder="Número de código de barras" placeholderTextColor={theme.placeholder} keyboardType="number-pad" />
          </Field>
        </FieldGroup>

        <FieldGroup title="Categoría" theme={theme}>
          <Pressable
            onPress={() => setCatModal(true)}
            style={[styles.input, styles.catPicker, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder }]}
          >
            <Text style={[styles.catText, { color: theme.text }]}>{form.category}</Text>
            <Ionicons name="chevron-down" size={16} color={theme.textTertiary} />
          </Pressable>
        </FieldGroup>

        <FieldGroup title="Precios" theme={theme}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Precio neto ($)</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]} value={form.netPrice} onChangeText={(v) => set('netPrice', v)} placeholder="0.00" placeholderTextColor={theme.placeholder} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Precio bruto ($)</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]} value={form.grossPrice} onChangeText={(v) => set('grossPrice', v)} placeholder="0.00" placeholderTextColor={theme.placeholder} keyboardType="decimal-pad" />
            </View>
          </View>
        </FieldGroup>

        <FieldGroup title="Stock" theme={theme}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Cantidad inicial</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]} value={form.quantity} onChangeText={(v) => set('quantity', v)} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Alerta stock bajo</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]} value={form.minQuantity} onChangeText={(v) => set('minQuantity', v)} keyboardType="number-pad" />
            </View>
          </View>
        </FieldGroup>

        <FieldGroup title="Información adicional" theme={theme}>
          <Field label="Proveedor" theme={theme}>
            <TextInput style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]} value={form.supplier} onChangeText={(v) => set('supplier', v)} placeholder="Nombre del proveedor" placeholderTextColor={theme.placeholder} />
          </Field>
          <Field label="Notas" theme={theme}>
            <TextInput
              style={[styles.input, styles.textarea, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]}
              value={form.notes}
              onChangeText={(v) => set('notes', v)}
              placeholder="Notas adicionales..."
              placeholderTextColor={theme.placeholder}
              multiline
              numberOfLines={3}
            />
          </Field>
        </FieldGroup>

        <Pressable
          onPress={handleSave}
          disabled={loading}
          style={[styles.saveFullBtn, { backgroundColor: theme.accent, opacity: loading ? 0.8 : 1 }]}
        >
          <Ionicons name="checkmark-circle" size={20} color="#0D1117" />
          <Text style={styles.saveBtnText}>{loading ? 'Guardando...' : 'Agregar producto'}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={catModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setCatModal(false)}>
        <View style={[styles.catModal, { backgroundColor: theme.background }]}>
          <View style={[styles.catModalHeader, { borderBottomColor: theme.separator }]}>
            <Text style={[styles.catModalTitle, { color: theme.text }]}>Seleccionar categoría</Text>
            <Pressable onPress={() => setCatModal(false)}>
              <Ionicons name="close" size={22} color={theme.textTertiary} />
            </Pressable>
          </View>
          <View style={[styles.newCatRow, { borderBottomColor: theme.separator }]}>
            <TextInput
              style={[styles.newCatInput, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]}
              value={newCat}
              onChangeText={setNewCat}
              placeholder="Agregar categoría personalizada..."
              placeholderTextColor={theme.placeholder}
            />
            <Pressable onPress={handleAddCategory} style={[styles.addCatBtn, { backgroundColor: theme.accent }]}>
              <Ionicons name="add" size={18} color="#0D1117" />
            </Pressable>
          </View>
          <FlatList
            data={categories}
            keyExtractor={(c) => c}
            contentContainerStyle={{ paddingVertical: 8 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { set('category', item); setCatModal(false); }}
                style={[styles.catRow, { borderBottomColor: theme.separator }]}
              >
                <Text style={[styles.catRowText, { color: theme.text }]}>{item}</Text>
                {form.category === item && <Ionicons name="checkmark" size={18} color={theme.accent} />}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function FieldGroup({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: theme.textTertiary }]}>{title.toUpperCase()}</Text>
      <View style={styles.groupContent}>{children}</View>
    </View>
  );
}

function Field({ label, children, theme }: { label: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  saveBtn: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  form: { paddingHorizontal: 20, paddingVertical: 20, gap: 20, paddingBottom: 60 },
  photoSection: {},
  photoButtons: { flexDirection: 'row', gap: 12 },
  photoBtn: { flex: 1, height: 80, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  photoPreview: { height: 160, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  photoOverlay: { position: 'absolute', bottom: 12, right: 12, width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  group: { gap: 4 },
  groupTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginBottom: 8 },
  groupContent: { gap: 12 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: 'Inter_400Regular' },
  textarea: { height: 90, paddingTop: 12, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  catPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  saveFullBtn: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  saveBtnText: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: '#0D1117' },
  catModal: { flex: 1 },
  catModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, borderBottomWidth: 1 },
  catModalTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  newCatRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 1 },
  newCatInput: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  addCatBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  catRowText: { fontSize: 16, fontFamily: 'Inter_400Regular' },
});
