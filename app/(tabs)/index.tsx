import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, useColorScheme, Platform, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useInventory, Product } from '@/contexts/InventoryContext';
import { useToast } from '@/components/Toast';
import * as Haptics from 'expo-haptics';
import { exportInventoryToExcel } from '@/lib/exportExcel';

const FILTERS = ['Todos', 'Stock bajo', ...[] as string[]];

function StatBadge({ label, value, color, theme }: any) {
  return (
    <View style={[statStyles.box, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={[statStyles.label, { color: theme.textTertiary }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1, gap: 2 },
  value: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  label: { fontSize: 11, fontFamily: 'Inter_500Medium' },
});

function ProductItem({ item, theme, onPress, selected, onLongPress }: {
  item: Product; theme: any; onPress: () => void; selected: boolean; onLongPress: () => void;
}) {
  const isLow = item.quantity <= item.minQuantity;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: selected ? theme.accent : theme.cardBorder, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      {selected && (
        <View style={[styles.checkCircle, { backgroundColor: theme.accent }]}>
          <Ionicons name="checkmark" size={12} color="#0D1117" />
        </View>
      )}
      <View style={styles.cardRow}>
        <View style={[styles.categoryBadge, { backgroundColor: theme.accent + '18' }]}>
          <Ionicons name="cube-outline" size={20} color={theme.accent} />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
            {isLow && (
              <View style={[styles.lowBadge, { backgroundColor: theme.danger + '22' }]}>
                <Text style={[styles.lowText, { color: theme.danger }]}>Bajo</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardBrand, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.brand || item.category}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.cardPrice, { color: theme.text }]}>
            {item.grossPrice.toFixed(2)}
          </Text>
          <Text style={[styles.cardQty, { color: isLow ? theme.danger : theme.textSecondary }]}>
            Cant: {item.quantity}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function StockScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { products, deleteProducts, categories } = useInventory();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const allFilters = useMemo(() => ['Todos', 'Stock bajo', ...categories], [categories]);

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.serialNumber.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    if (activeFilter === 'Stock bajo') {
      list = list.filter((p) => p.quantity <= p.minQuantity);
    } else if (activeFilter !== 'Todos') {
      list = list.filter((p) => p.category === activeFilter);
    }
    return list;
  }, [products, search, activeFilter]);

  const lowStockCount = useMemo(() => products.filter((p) => p.quantity <= p.minQuantity).length, [products]);
  const totalValue = useMemo(() => products.reduce((s, p) => s + p.grossPrice * p.quantity, 0), [products]);

  const toggleSelect = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleDeleteSelected = () => {
    Alert.alert('Eliminar productos', `¿Eliminar ${selectedIds.size} producto(s)?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await deleteProducts(Array.from(selectedIds));
          setSelectedIds(new Set());
          showToast(`${selectedIds.size} producto(s) eliminado(s)`, 'success');
        },
      },
    ]);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.screenTitle, { color: theme.text }]}>Inventario</Text>
            <Text style={[styles.screenSub, { color: theme.textSecondary }]}>{products.length} productos</Text>
          </View>
          <View style={styles.headerActions}>
            {selectedIds.size > 0 && (
              <Pressable onPress={handleDeleteSelected} style={[styles.iconBtn, { backgroundColor: theme.danger + '22' }]}>
                <Ionicons name="trash" size={20} color={theme.danger} />
              </Pressable>
            )}
            <Pressable
              onPress={async () => {
                if (products.length === 0) { showToast('No hay productos para exportar', 'info'); return; }
                try {
                  await exportInventoryToExcel(products);
                  showToast('Inventario exportado a Excel', 'success');
                } catch { showToast('Error al exportar', 'error'); }
              }}
              style={[styles.iconBtn, { backgroundColor: theme.success + '22' }]}
            >
              <Ionicons name="download-outline" size={20} color={theme.success} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/product/new')}
              style={[styles.addBtn, { backgroundColor: theme.accent }]}
            >
              <Ionicons name="add" size={22} color="#0D1117" />
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatBadge label="Total productos" value={products.length} color={theme.text} theme={theme} />
          <StatBadge label="Stock bajo" value={lowStockCount} color={lowStockCount > 0 ? theme.danger : theme.success} theme={theme} />
          <StatBadge label="Valor total" value={`$${totalValue >= 1000 ? (totalValue / 1000).toFixed(1) + 'k' : totalValue.toFixed(0)}`} color={theme.accent} theme={theme} />
        </View>

        <View style={[styles.searchWrap, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder }]}>
          <Ionicons name="search" size={16} color={theme.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre, marca, código..."
            placeholderTextColor={theme.placeholder}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={theme.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        <FlatList
          horizontal
          data={allFilters}
          keyExtractor={(f) => f}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: f }) => (
            <Pressable
              onPress={() => setActiveFilter(f)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === f ? theme.accent : theme.backgroundTertiary,
                  borderColor: activeFilter === f ? theme.accent : theme.cardBorder,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: activeFilter === f ? '#0D1117' : theme.textSecondary }]}>{f}</Text>
            </Pressable>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 100) }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={52} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {search ? 'No se encontraron productos' : 'Sin productos aún'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {search ? 'Intenta con otra búsqueda' : 'Agrega tu primer producto para comenzar'}
            </Text>
            {!search && (
              <Pressable
                onPress={() => router.push('/product/new')}
                style={[styles.emptyBtn, { backgroundColor: theme.accent }]}
              >
                <Text style={styles.emptyBtnText}>Agregar producto</Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
            <ProductItem
              item={item}
              theme={theme}
              selected={selectedIds.has(item.id)}
              onPress={() => {
                if (selectedIds.size > 0) {
                  toggleSelect(item.id);
                } else {
                  router.push({ pathname: '/product/[id]', params: { id: item.id } });
                }
              }}
              onLongPress={() => toggleSelect(item.id)}
            />
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  screenTitle: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  screenSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 8 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  filterList: { paddingVertical: 2 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, marginRight: 8,
  },
  filterText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  card: {
    borderRadius: 16, borderWidth: 1, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    marginBottom: 2,
  },
  checkCircle: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 3 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', flex: 1 },
  cardBrand: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  lowBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  lowText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  cardRight: { alignItems: 'flex-end', gap: 3 },
  cardPrice: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  cardQty: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingHorizontal: 40 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#0D1117' },
});
