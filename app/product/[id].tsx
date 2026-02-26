import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  Pressable, useColorScheme, Platform, KeyboardAvoidingView,
  Alert, Modal, FlatList,
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

export default function ProductDetailScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProduct, updateProduct, deleteProduct, adjustQuantity, categories, addCategory } = useInventory();
  const { showToast } = useToast();

  const product = getProduct(id);

  const [form, setForm] = useState({
    name: product?.name || '',
    brand: product?.brand || '',
    serialNumber: product?.serialNumber || '',
    barcode: product?.barcode || '',
    category: product?.category || 'Otro',
    netPrice: product?.netPrice?.toString() || '',
    grossPrice: product?.grossPrice?.toString() || '',
    quantity: product?.quantity?.toString() || '0',
    minQuantity: product?.minQuantity?.toString() || '5',
    supplier: product?.supplier || '',
    notes: product?.notes || '',
  });
  const [photoUri, setPhotoUri] = useState(product?.photoUri || '');
  const [loading, setLoading] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<'info' | 'history'>('info');

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        brand: product.brand,
        serialNumber: product.serialNumber,
        barcode: product.barcode,
        category: product.category,
        netPrice: product.netPrice.toString(),
        grossPrice: product.grossPrice.toString(),
        quantity: product.quantity.toString(),
        minQuantity: product.minQuantity.toString(),
        supplier: product.supplier,
        notes: product.notes,
      });
      setPhotoUri(product.photoUri || '');
    }
  }, [product]);

  if (!product) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={[styles.notFound, { color: theme.textSecondary }]}>Producto no encontrado</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: theme.accent }]}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('El nombre del producto es obligatorio', 'error'); return; }
    setLoading(true);
    try {
      await updateProduct(id, {
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
      showToast('Producto actualizado', 'success');
      setEditing(false);
    } catch (e: any) {
      showToast(e.message || 'Error al actualizar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Eliminar producto', `¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await deleteProduct(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          showToast('Producto eliminado', 'success');
          router.back();
        },
      },
    ]);
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const handleAddCategory = async () => {
    if (!newCat.trim()) return;
    await addCategory(newCat.trim());
    set('category', newCat.trim());
    setNewCat('');
    setCatModal(false);
  };

  const isLow = product.quantity <= product.minQuantity;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 16, borderBottomColor: theme.separator }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={theme.textTertiary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{product.name}</Text>
        <View style={styles.headerRight}>
          {editing ? (
            <Pressable onPress={handleSave} disabled={loading}>
              <Text style={[styles.saveBtn, { color: loading ? theme.textTertiary : theme.accent }]}>
                {loading ? '...' : 'Guardar'}
              </Text>
            </Pressable>
          ) : (
            <>
              <Pressable onPress={() => setEditing(true)} style={[styles.iconBtn, { backgroundColor: theme.backgroundTertiary }]}>
                <Ionicons name="create-outline" size={18} color={theme.text} />
              </Pressable>
              <Pressable onPress={handleDelete} style={[styles.iconBtn, { backgroundColor: theme.danger + '18' }]}>
                <Ionicons name="trash-outline" size={18} color={theme.danger} />
              </Pressable>
            </>
          )}
        </View>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: theme.separator }]}>
        {(['info', 'history'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && { borderBottomColor: theme.accent }]}>
            <Text style={[styles.tabText, { color: tab === t ? theme.accent : theme.textSecondary }]}>
              {t === 'info' ? 'Información' : 'Historial de precios'}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'info' ? (
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {photoUri ? (
            <Pressable onPress={editing ? pickPhoto : undefined} style={[styles.photoPreview, { borderColor: theme.cardBorder }]}>
              <Image source={{ uri: photoUri }} style={styles.photoImg} contentFit="cover" />
              {editing && (
                <View style={[styles.photoOverlay, { backgroundColor: theme.overlay }]}>
                  <Ionicons name="camera" size={20} color="#fff" />
                </View>
              )}
            </Pressable>
          ) : editing ? (
            <Pressable onPress={pickPhoto} style={[styles.photoPlaceholder, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder }]}>
              <Ionicons name="camera-outline" size={28} color={theme.textTertiary} />
              <Text style={[styles.photoPlaceholderText, { color: theme.textTertiary }]}>Agregar foto</Text>
            </Pressable>
          ) : null}

          <View style={[styles.statusRow, { backgroundColor: isLow ? theme.danger + '18' : theme.success + '18' }]}>
            <Ionicons name={isLow ? 'warning' : 'checkmark-circle'} size={18} color={isLow ? theme.danger : theme.success} />
            <Text style={[styles.statusText, { color: isLow ? theme.danger : theme.success }]}>
              {isLow ? `Stock bajo — solo quedan ${product.quantity}` : `En stock — ${product.quantity} unidades`}
            </Text>
          </View>

          {!editing ? (
            <View style={styles.viewMode}>
              <View style={[styles.qtyRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Pressable onPress={() => adjustQuantity(id, -1)} style={[styles.qtyBtn, { backgroundColor: theme.backgroundTertiary }]}>
                  <Ionicons name="remove" size={20} color={theme.text} />
                </Pressable>
                <Text style={[styles.qtyNum, { color: theme.text }]}>{product.quantity}</Text>
                <Pressable onPress={() => adjustQuantity(id, 1)} style={[styles.qtyBtn, { backgroundColor: theme.backgroundTertiary }]}>
                  <Ionicons name="add" size={20} color={theme.text} />
                </Pressable>
              </View>

              {[
                { label: 'Marca', value: product.brand || '—' },
                { label: 'Categoría', value: product.category },
                { label: 'Precio neto', value: `$${product.netPrice.toFixed(2)}` },
                { label: 'Precio bruto', value: `$${product.grossPrice.toFixed(2)}` },
                { label: 'Alerta stock bajo', value: product.minQuantity },
                { label: 'Serie / SKU', value: product.serialNumber || '—' },
                { label: 'Código de barras', value: product.barcode || '—' },
                { label: 'Proveedor', value: product.supplier || '—' },
                { label: 'Notas', value: product.notes || '—' },
                { label: 'Agregado', value: new Date(product.createdAt).toLocaleDateString('es') },
                { label: 'Actualizado', value: new Date(product.updatedAt).toLocaleDateString('es') },
              ].map((row) => (
                <View key={row.label} style={[styles.infoRow, { borderBottomColor: theme.separator }]}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{row.label}</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{String(row.value)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.editMode}>
              {[
                { key: 'name', label: 'Nombre del producto *', keyboard: 'default' },
                { key: 'brand', label: 'Marca', keyboard: 'default' },
                { key: 'serialNumber', label: 'Número de serie / SKU', keyboard: 'default' },
                { key: 'barcode', label: 'Código de barras / EAN', keyboard: 'number-pad' },
              ].map((f) => (
                <View key={f.key}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{f.label}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]}
                    value={(form as any)[f.key]}
                    onChangeText={(v) => set(f.key, v)}
                    keyboardType={f.keyboard as any}
                  />
                </View>
              ))}

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Categoría</Text>
              <Pressable
                onPress={() => setCatModal(true)}
                style={[styles.input, styles.catPicker, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder }]}
              >
                <Text style={[{ color: theme.text, fontSize: 15, fontFamily: 'Inter_400Regular' }]}>{form.category}</Text>
                <Ionicons name="chevron-down" size={16} color={theme.textTertiary} />
              </Pressable>

              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Precio neto ($)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]} value={form.netPrice} onChangeText={(v) => set('netPrice', v)} keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Precio bruto ($)</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]} value={form.grossPrice} onChangeText={(v) => set('grossPrice', v)} keyboardType="decimal-pad" />
                </View>
              </View>

              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Cantidad</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]} value={form.quantity} onChangeText={(v) => set('quantity', v)} keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Alerta stock bajo</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]} value={form.minQuantity} onChangeText={(v) => set('minQuantity', v)} keyboardType="number-pad" />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Proveedor</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]} value={form.supplier} onChangeText={(v) => set('supplier', v)} />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Notas</Text>
              <TextInput
                style={[styles.input, styles.textarea, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]}
                value={form.notes}
                onChangeText={(v) => set('notes', v)}
                multiline
                numberOfLines={3}
              />
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {product.priceHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="time-outline" size={40} color={theme.textTertiary} />
              <Text style={[styles.emptyHistText, { color: theme.textSecondary }]}>Sin historial de precios</Text>
            </View>
          ) : (
            [...product.priceHistory].reverse().map((h, i) => (
              <View key={i} style={[styles.histRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View>
                  <Text style={[styles.histDate, { color: theme.text }]}>
                    {new Date(h.date).toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Text>
                  {i === 0 && <Text style={[styles.histCurrent, { color: theme.success }]}>Actual</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.histGross, { color: theme.text }]}>Bruto: ${h.grossPrice.toFixed(2)}</Text>
                  <Text style={[styles.histNet, { color: theme.textSecondary }]}>Neto: ${h.netPrice.toFixed(2)}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

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

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  headerRight: { flexDirection: 'row', gap: 8 },
  saveBtn: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  form: { paddingHorizontal: 20, paddingVertical: 16, gap: 14, paddingBottom: 60 },
  photoPreview: { height: 180, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  photoOverlay: { position: 'absolute', bottom: 12, right: 12, width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  photoPlaceholder: { height: 80, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'row' },
  photoPlaceholderText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  statusText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  viewMode: { gap: 0 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, padding: 12, gap: 24, marginBottom: 8 },
  qtyBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qtyNum: { fontSize: 26, fontFamily: 'Inter_700Bold', minWidth: 48, textAlign: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  infoLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  infoValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold', maxWidth: '60%', textAlign: 'right' },
  editMode: { gap: 12 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: 'Inter_400Regular' },
  textarea: { height: 90, paddingTop: 12, textAlignVertical: 'top' },
  catPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row2: { flexDirection: 'row', gap: 12 },
  histRow: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  histDate: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  histCurrent: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 2 },
  histGross: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  histNet: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  emptyHistory: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyHistText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  catModal: { flex: 1 },
  catModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, borderBottomWidth: 1 },
  catModalTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  newCatRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 1 },
  newCatInput: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  addCatBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  catRowText: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  notFound: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  backLink: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginTop: 12 },
});
