import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, useColorScheme,
  Platform, Alert, Modal, TextInput, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useInventory, Order } from '@/contexts/InventoryContext';
import { useToast } from '@/components/Toast';
import * as Haptics from 'expo-haptics';

const STATUS_CONFIG = {
  ordered: { label: 'Ordered', color: '#38BDF8', icon: 'time-outline' as const },
  received: { label: 'Received', color: '#10B981', icon: 'checkmark-circle-outline' as const },
  partial: { label: 'Partial', color: '#F5A623', icon: 'git-branch-outline' as const },
};

function OrderCard({ order, theme, onConfirm, onDelete }: { order: Order; theme: any; onConfirm: () => void; onDelete: () => void }) {
  const cfg = STATUS_CONFIG[order.status];
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{order.productName}</Text>
          {order.brand ? <Text style={[styles.cardBrand, { color: theme.textSecondary }]}>{order.brand}</Text> : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.color + '22' }]}>
          <Ionicons name={cfg.icon} size={12} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        {[
          { icon: 'cube-outline', label: `Qty: ${order.quantity}` },
          { icon: 'cash-outline', label: `$${order.expectedGrossCost.toFixed(2)}` },
          { icon: 'calendar-outline', label: order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString() : '—' },
        ].map((m) => (
          <View key={m.label} style={styles.metaItem}>
            <Ionicons name={m.icon as any} size={13} color={theme.textTertiary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>{m.label}</Text>
          </View>
        ))}
        {order.supplier ? (
          <View style={styles.metaItem}>
            <Ionicons name="business-outline" size={13} color={theme.textTertiary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>{order.supplier}</Text>
          </View>
        ) : null}
      </View>

      {order.status !== 'received' && (
        <View style={styles.cardActions}>
          <Pressable onPress={onConfirm} style={[styles.confirmBtn, { backgroundColor: theme.success + '18' }]}>
            <Ionicons name="checkmark-circle" size={16} color={theme.success} />
            <Text style={[styles.confirmText, { color: theme.success }]}>Confirm Receipt</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={[styles.deleteBtn, { backgroundColor: theme.danger + '18' }]}>
            <Ionicons name="trash-outline" size={16} color={theme.danger} />
          </Pressable>
        </View>
      )}
      {order.status === 'received' && (
        <Pressable onPress={onDelete} style={styles.deleteInline}>
          <Ionicons name="trash-outline" size={14} color={theme.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

function AddOrderModal({ visible, onClose, theme }: { visible: boolean; onClose: () => void; theme: any }) {
  const { addOrder } = useInventory();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    productName: '', brand: '', quantity: '1',
    expectedNetCost: '', expectedGrossCost: '',
    supplier: '', expectedDelivery: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.productName.trim()) { showToast('Product name is required', 'error'); return; }
    setLoading(true);
    try {
      await addOrder({
        productName: form.productName.trim(),
        brand: form.brand.trim(),
        quantity: parseInt(form.quantity) || 1,
        expectedNetCost: parseFloat(form.expectedNetCost) || 0,
        expectedGrossCost: parseFloat(form.expectedGrossCost) || 0,
        supplier: form.supplier.trim(),
        expectedDelivery: form.expectedDelivery || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        status: 'ordered',
        notes: form.notes.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Order added', 'success');
      setForm({ productName: '', brand: '', quantity: '1', expectedNetCost: '', expectedGrossCost: '', supplier: '', expectedDelivery: '', notes: '' });
      onClose();
    } catch {
      showToast('Failed to add order', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'productName', label: 'Product Name *', placeholder: 'Enter product name', keyboardType: 'default' },
    { key: 'brand', label: 'Brand', placeholder: 'Enter brand', keyboardType: 'default' },
    { key: 'quantity', label: 'Quantity', placeholder: '1', keyboardType: 'number-pad' },
    { key: 'expectedNetCost', label: 'Expected Net Cost ($)', placeholder: '0.00', keyboardType: 'decimal-pad' },
    { key: 'expectedGrossCost', label: 'Expected Gross Cost ($)', placeholder: '0.00', keyboardType: 'decimal-pad' },
    { key: 'supplier', label: 'Supplier', placeholder: 'Supplier name', keyboardType: 'default' },
    { key: 'expectedDelivery', label: 'Expected Delivery (YYYY-MM-DD)', placeholder: 'e.g. 2025-03-15', keyboardType: 'default' },
    { key: 'notes', label: 'Notes', placeholder: 'Any notes...', keyboardType: 'default' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[modalStyles.header, { paddingTop: insets.top + 16, borderBottomColor: theme.separator }]}>
          <Text style={[modalStyles.title, { color: theme.text }]}>New Order</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.textTertiary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={modalStyles.form} keyboardShouldPersistTaps="handled">
          {fields.map((f) => (
            <View key={f.key}>
              <Text style={[modalStyles.label, { color: theme.textSecondary }]}>{f.label}</Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder, color: theme.text }]}
                value={(form as any)[f.key]}
                onChangeText={(v) => set(f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor={theme.placeholder}
                keyboardType={f.keyboardType as any}
              />
            </View>
          ))}
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={[modalStyles.btn, { backgroundColor: theme.accent, opacity: loading ? 0.8 : 1 }]}
          >
            <Text style={modalStyles.btnText}>{loading ? 'Adding...' : 'Add Order'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  form: { padding: 20, gap: 14, paddingBottom: 60 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: 'Inter_400Regular' },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#0D1117' },
});

export default function OrdersScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { orders, deleteOrder, receiveOrder } = useInventory();
  const { showToast } = useToast();

  const [addVisible, setAddVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ordered' | 'received' | 'partial'>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => o.status === filter)).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [orders, filter]
  );

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const handleConfirm = (order: Order) => {
    Alert.prompt(
      'Confirm Receipt',
      `How many units of "${order.productName}" received? (Expected: ${order.quantity})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm', onPress: async (val) => {
            const qty = parseInt(val || String(order.quantity)) || order.quantity;
            await receiveOrder(order.id, qty);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`Received ${qty} × ${order.productName}`, 'success');
          },
        },
      ],
      'plain-text',
      String(order.quantity),
      'number-pad'
    );
  };

  const handleConfirmAndroid = (order: Order) => {
    Alert.alert('Confirm Receipt', `Receive all ${order.quantity} units of "${order.productName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          await receiveOrder(order.id, order.quantity);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast(`Received ${order.quantity} × ${order.productName}`, 'success');
        },
      },
    ]);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Order', 'Remove this order?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteOrder(id) },
    ]);
  };

  const pendingCount = orders.filter((o) => o.status === 'ordered' || o.status === 'partial').length;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Orders</Text>
            <Text style={[styles.sub, { color: theme.textSecondary }]}>
              {pendingCount} pending · {orders.length} total
            </Text>
          </View>
          <Pressable onPress={() => setAddVisible(true)} style={[styles.addBtn, { backgroundColor: theme.accent }]}>
            <Ionicons name="add" size={22} color="#0D1117" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['all', 'ordered', 'partial', 'received'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.chip, { backgroundColor: filter === f ? theme.accent : theme.backgroundTertiary, borderColor: filter === f ? theme.accent : theme.cardBorder }]}
            >
              <Text style={[styles.chipText, { color: filter === f ? '#0D1117' : theme.textSecondary }]}>
                {f === 'all' ? 'All' : STATUS_CONFIG[f].label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 100) }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="git-pull-request-outline" size={52} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No orders</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {filter !== 'all' ? 'No orders with this status' : 'Add an order for upcoming stock'}
            </Text>
            {filter === 'all' && (
              <Pressable onPress={() => setAddVisible(true)} style={[styles.emptyBtn, { backgroundColor: theme.accent }]}>
                <Text style={styles.emptyBtnText}>Add Order</Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
            <OrderCard
              order={item}
              theme={theme}
              onConfirm={() => Platform.OS === 'ios' ? handleConfirm(item) : handleConfirmAndroid(item)}
              onDelete={() => handleDelete(item.id)}
            />
          </Animated.View>
        )}
      />

      <AddOrderModal visible={addVisible} onClose={() => setAddVisible(false)} theme={theme} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filterRow: { gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  cardBrand: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  cardActions: { flexDirection: 'row', gap: 8 },
  confirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 10 },
  confirmText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  deleteBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  deleteInline: { alignSelf: 'flex-end' },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingHorizontal: 40 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#0D1117' },
});
