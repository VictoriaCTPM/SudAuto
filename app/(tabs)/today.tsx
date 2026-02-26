import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  useColorScheme, Platform, Alert, Modal,
  TextInput, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useInventory, Product, SaleRecord } from '@/contexts/InventoryContext';
import { useToast } from '@/components/Toast';
import * as Haptics from 'expo-haptics';

function StatCard({ label, value, sub, color, icon, theme }: any) {
  return (
    <View style={[todayStyles.stat, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={[todayStyles.statIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[todayStyles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[todayStyles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
      {sub && <Text style={[todayStyles.statSub, { color: color }]}>{sub}</Text>}
    </View>
  );
}

const todayStyles = StyleSheet.create({
  stat: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, gap: 4, minWidth: 0 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  statSub: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
});

function AddSaleModal({ visible, onClose, theme }: { visible: boolean; onClose: () => void; theme: any }) {
  const { products, registerSale, activeWorkDay } = useInventory();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState('1');
  const [saleNet, setSaleNet] = useState('');
  const [saleGross, setSaleGross] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.filter((p) => p.quantity > 0);
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.quantity > 0 && (p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.barcode.includes(q))
    );
  }, [products, search]);

  const handleSelect = (p: Product) => {
    setSelected(p);
    setSaleNet(p.netPrice.toFixed(2));
    setSaleGross(p.grossPrice.toFixed(2));
  };

  const handleSubmit = async () => {
    if (!selected) return;
    const qtyNum = parseInt(qty) || 1;
    const netNum = parseFloat(saleNet) || 0;
    const grossNum = parseFloat(saleGross) || 0;
    if (qtyNum > selected.quantity) {
      showToast(`Solo ${selected.quantity} en stock`, 'error');
      return;
    }
    setLoading(true);
    try {
      await registerSale({
        productId: selected.id,
        productName: selected.name,
        productBrand: selected.brand,
        quantity: qtyNum,
        saleNetPrice: netNum,
        saleGrossPrice: grossNum,
        purchaseNetPrice: selected.netPrice,
        purchaseGrossPrice: selected.grossPrice,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Vendido ${qtyNum}x ${selected.name}`, 'success');
      setSelected(null); setSearch(''); setQty('1');
      onClose();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setSelected(null); setSearch(''); setQty('1'); setSaleNet(''); setSaleGross(''); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[saleModalStyles.header, { paddingTop: insets.top + 16, borderBottomColor: theme.separator }]}>
          <Text style={[saleModalStyles.title, { color: theme.text }]}>Registrar venta</Text>
          <Pressable onPress={() => { reset(); onClose(); }}>
            <Ionicons name="close" size={24} color={theme.textTertiary} />
          </Pressable>
        </View>

        {!selected ? (
          <>
            <View style={[saleModalStyles.searchWrap, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder }]}>
              <Ionicons name="search" size={16} color={theme.textTertiary} />
              <TextInput
                style={[saleModalStyles.searchInput, { color: theme.text }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar productos en stock..."
                placeholderTextColor={theme.placeholder}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredProducts}
              keyExtractor={(p) => p.id}
              contentContainerStyle={saleModalStyles.list}
              ListEmptyComponent={
                <View style={saleModalStyles.empty}>
                  <Ionicons name="cube-outline" size={40} color={theme.textTertiary} />
                  <Text style={[saleModalStyles.emptyText, { color: theme.textSecondary }]}>Sin productos en stock</Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelect(item)}
                  style={[saleModalStyles.productRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[saleModalStyles.pName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[saleModalStyles.pBrand, { color: theme.textSecondary }]}>{item.brand}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[saleModalStyles.pPrice, { color: theme.text }]}>${item.grossPrice.toFixed(2)}</Text>
                    <Text style={[saleModalStyles.pQty, { color: item.quantity <= item.minQuantity ? theme.danger : theme.success }]}>
                      {item.quantity} disponibles
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </>
        ) : (
          <ScrollView contentContainerStyle={saleModalStyles.form} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => setSelected(null)} style={saleModalStyles.backBtn}>
              <Ionicons name="arrow-back" size={18} color={theme.textSecondary} />
              <Text style={[saleModalStyles.backText, { color: theme.textSecondary }]}>Cambiar producto</Text>
            </Pressable>

            <View style={[saleModalStyles.selectedCard, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder }]}>
              <Text style={[saleModalStyles.selName, { color: theme.text }]}>{selected.name}</Text>
              <Text style={[saleModalStyles.selBrand, { color: theme.textSecondary }]}>{selected.brand} • Stock: {selected.quantity}</Text>
            </View>

            {[
              { label: 'Cantidad', value: qty, onChange: setQty, hint: `Máx: ${selected.quantity}` },
              { label: 'Precio neto venta', value: saleNet, onChange: setSaleNet, hint: `Compra: $${selected.netPrice.toFixed(2)}` },
              { label: 'Precio bruto venta', value: saleGross, onChange: setSaleGross, hint: `Compra: $${selected.grossPrice.toFixed(2)}` },
            ].map((f) => (
              <View key={f.label}>
                <View style={saleModalStyles.labelRow}>
                  <Text style={[saleModalStyles.label, { color: theme.textSecondary }]}>{f.label}</Text>
                  <Text style={[saleModalStyles.hint, { color: theme.textTertiary }]}>{f.hint}</Text>
                </View>
                <TextInput
                  style={[saleModalStyles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]}
                  value={f.value}
                  onChangeText={f.onChange}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}

            {parseFloat(saleGross) > 0 && (
              <View style={[saleModalStyles.marginBox, { backgroundColor: theme.success + '18' }]}>
                <Ionicons name="trending-up" size={16} color={theme.success} />
                <Text style={[saleModalStyles.marginText, { color: theme.success }]}>
                  Margen: ${((parseFloat(saleGross) - selected.grossPrice) * (parseInt(qty) || 1)).toFixed(2)} total
                </Text>
              </View>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={[saleModalStyles.submitBtn, { backgroundColor: theme.accent, opacity: loading ? 0.8 : 1 }]}
            >
              <Ionicons name="checkmark-circle" size={20} color="#0D1117" />
              <Text style={saleModalStyles.submitText}>{loading ? 'Registrando...' : 'Confirmar venta'}</Text>
            </Pressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const saleModalStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  productRow: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center' },
  pName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  pBrand: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  pPrice: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  pQty: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  form: { padding: 20, gap: 16, paddingBottom: 60 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  selectedCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  selName: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  selBrand: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: 'Inter_400Regular' },
  marginBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12 },
  marginText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  submitBtn: { height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  submitText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#0D1117' },
});

function SaleRow({ item, theme, onDelete }: { item: SaleRecord; theme: any; onDelete: () => void }) {
  const profit = (item.saleGrossPrice - item.purchaseGrossPrice) * item.quantity;
  return (
    <View style={[rowStyles.row, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={rowStyles.rowLeft}>
        <Text style={[rowStyles.name, { color: theme.text }]} numberOfLines={1}>{item.productName}</Text>
        <Text style={[rowStyles.sub, { color: theme.textSecondary }]}>{item.productBrand} • ×{item.quantity}</Text>
      </View>
      <View style={rowStyles.rowRight}>
        <Text style={[rowStyles.gross, { color: theme.text }]}>${(item.saleGrossPrice * item.quantity).toFixed(2)}</Text>
        <Text style={[rowStyles.margin, { color: profit >= 0 ? theme.success : theme.danger }]}>
          {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
        </Text>
      </View>
      <Pressable onPress={onDelete} style={rowStyles.del}>
        <Ionicons name="trash-outline" size={16} color={theme.danger} />
      </Pressable>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { borderRadius: 14, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLeft: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  sub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  gross: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  margin: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  del: { padding: 6 },
});

export default function TodayScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { activeWorkDay, startWorkDay, endWorkDay, getDaySales, deleteSale, products } = useInventory();
  const { showToast } = useToast();

  const [addSaleVisible, setAddSaleVisible] = useState(false);
  const [ending, setEnding] = useState(false);
  const [reportModal, setReportModal] = useState<any>(null);

  const daySales = useMemo(
    () => (activeWorkDay ? getDaySales(activeWorkDay.id) : []),
    [activeWorkDay, getDaySales]
  );

  const stats = useMemo(() => {
    const net = daySales.reduce((s, r) => s + r.saleNetPrice * r.quantity, 0);
    const gross = daySales.reduce((s, r) => s + r.saleGrossPrice * r.quantity, 0);
    const profit = daySales.reduce((s, r) => s + (r.saleGrossPrice - r.purchaseGrossPrice) * r.quantity, 0);
    const items = daySales.reduce((s, r) => s + r.quantity, 0);
    return { net, gross, profit, items };
  }, [daySales]);

  const lowStockCount = useMemo(() => products.filter((p) => p.quantity <= p.minQuantity).length, [products]);

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const handleStart = async () => {
    try {
      await startWorkDay();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Jornada iniciada', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleEnd = () => {
    Alert.alert('Finalizar jornada', 'Esto finalizará las ventas de hoy y generará un informe.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Finalizar', style: 'destructive', onPress: async () => {
          setEnding(true);
          const report = await endWorkDay();
          setEnding(false);
          if (report) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setReportModal(report);
          }
        },
      },
    ]);
  };

  const handleDeleteSale = (id: string) => {
    Alert.alert('Eliminar venta', '¿Eliminar esta venta? El stock será restaurado.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteSale(id) },
    ]);
  };

  if (!activeWorkDay) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <Text style={[styles.title, { color: theme.text }]}>Hoy</Text>
          <Text style={[styles.sub, { color: theme.textSecondary }]}>
            {new Date().toLocaleDateString('es', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View style={styles.startCenter}>
          <View style={[styles.startIcon, { backgroundColor: theme.accent + '18' }]}>
            <Ionicons name="storefront-outline" size={64} color={theme.accent} />
          </View>
          <Text style={[styles.startTitle, { color: theme.text }]}>¿Listo para empezar?</Text>
          <Text style={[styles.startSub, { color: theme.textSecondary }]}>
            Inicia tu jornada para registrar ventas y monitorear ingresos en tiempo real
          </Text>
          {lowStockCount > 0 && (
            <View style={[styles.lowAlert, { backgroundColor: theme.warning + '18' }]}>
              <Ionicons name="warning" size={16} color={theme.warning} />
              <Text style={[styles.lowAlertText, { color: theme.warning }]}>
                {lowStockCount} producto{lowStockCount > 1 ? 's' : ''} con stock bajo
              </Text>
            </View>
          )}
          <Pressable onPress={handleStart} style={[styles.startBtn, { backgroundColor: theme.accent }]}>
            <Ionicons name="play-circle" size={22} color="#0D1117" />
            <Text style={styles.startBtnText}>Iniciar jornada</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Hoy</Text>
            <Text style={[styles.sub, { color: theme.textSecondary }]}>
              {new Date().toLocaleDateString('es', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <View style={[styles.activeBadge, { backgroundColor: theme.success + '22' }]}>
              <View style={[styles.activeDot, { backgroundColor: theme.success }]} />
              <Text style={[styles.activeText, { color: theme.success }]}>Activo</Text>
            </View>
            <Pressable
              onPress={handleEnd}
              disabled={ending}
              style={[styles.endBtn, { borderColor: theme.danger }]}
            >
              <Ionicons name="stop-circle-outline" size={16} color={theme.danger} />
              <Text style={[styles.endText, { color: theme.danger }]}>Terminar</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          <StatCard label="Artículos vendidos" value={stats.items} icon="bag-outline" color={theme.accent} theme={theme} />
          <StatCard label="Ingreso neto" value={`$${stats.net.toFixed(2)}`} icon="arrow-up-circle-outline" color={theme.info} theme={theme} />
          <StatCard label="Ingreso bruto" value={`$${stats.gross.toFixed(2)}`} icon="cash-outline" color={theme.success} theme={theme} />
          <StatCard label="Ganancia" value={`$${stats.profit.toFixed(2)}`} icon="trending-up-outline" color={stats.profit >= 0 ? theme.success : theme.danger} theme={theme} />
        </ScrollView>
      </View>

      <FlatList
        data={daySales}
        keyExtractor={(s) => s.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 100) }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!daySales.length}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.listHeaderText, { color: theme.textSecondary }]}>
              {daySales.length} venta{daySales.length !== 1 ? 's' : ''} hoy
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin ventas aún</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Toca el botón + para registrar tu primera venta</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
            <SaleRow item={item} theme={theme} onDelete={() => handleDeleteSale(item.id)} />
          </Animated.View>
        )}
      />

      <Pressable
        onPress={() => setAddSaleVisible(true)}
        style={[styles.fab, { backgroundColor: theme.accent, bottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) }]}
      >
        <Ionicons name="add" size={28} color="#0D1117" />
      </Pressable>

      <AddSaleModal visible={addSaleVisible} onClose={() => setAddSaleVisible(false)} theme={theme} />

      {reportModal && (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReportModal(null)}>
          <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24, gap: 20, paddingBottom: 60 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.title, { color: theme.text }]}>Resumen del día</Text>
              <Pressable onPress={() => setReportModal(null)}>
                <Ionicons name="close" size={24} color={theme.textTertiary} />
              </Pressable>
            </View>
            {[
              { label: 'Artículos vendidos', value: reportModal.totalItemsSold },
              { label: 'Ingreso neto', value: `$${reportModal.totalNetRevenue.toFixed(2)}` },
              { label: 'Ingreso bruto', value: `$${reportModal.totalGrossRevenue.toFixed(2)}` },
              { label: 'Ganancia', value: `$${reportModal.estimatedProfit.toFixed(2)}` },
              { label: 'Productos en stock', value: reportModal.stockSnapshot.totalProducts },
              { label: 'Valor del stock', value: `$${reportModal.stockSnapshot.totalValue.toFixed(2)}` },
            ].map((r) => (
              <View key={r.label} style={[styles.reportRow, { borderBottomColor: theme.separator }]}>
                <Text style={[styles.reportLabel, { color: theme.textSecondary }]}>{r.label}</Text>
                <Text style={[styles.reportValue, { color: theme.text }]}>{r.value}</Text>
              </View>
            ))}
            <Pressable onPress={() => setReportModal(null)} style={[styles.startBtn, { backgroundColor: theme.accent, marginTop: 8 }]}>
              <Text style={styles.startBtnText}>Listo</Text>
            </Pressable>
          </ScrollView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  endBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  endText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  statsRow: { gap: 8, paddingRight: 8 },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 8 },
  listHeader: { paddingBottom: 8 },
  listHeaderText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingHorizontal: 40 },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  startCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  startIcon: { width: 120, height: 120, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  startTitle: { fontSize: 26, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  startSub: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  lowAlert: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  lowAlertText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 54, borderRadius: 16, paddingHorizontal: 32 },
  startBtnText: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: '#0D1117' },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  reportLabel: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  reportValue: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
