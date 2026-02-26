import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  useColorScheme, Platform, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useInventory, DailyReport } from '@/contexts/InventoryContext';
import { BarChart } from '@/components/BarChart';

type Period = 'week' | 'month';

function ReportHistoryItem({ report, theme }: { report: DailyReport; theme: any }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      style={[histStyles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
    >
      <View style={histStyles.cardTop}>
        <View>
          <Text style={[histStyles.date, { color: theme.text }]}>
            {new Date(report.date + 'T12:00').toLocaleDateString('es', { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
          <Text style={[histStyles.items, { color: theme.textSecondary }]}>{report.totalItemsSold} artículos vendidos</Text>
        </View>
        <View style={histStyles.cardRight}>
          <Text style={[histStyles.revenue, { color: theme.text }]}>${report.totalGrossRevenue.toFixed(2)}</Text>
          <Text style={[histStyles.profit, { color: report.estimatedProfit >= 0 ? theme.success : theme.danger }]}>
            {report.estimatedProfit >= 0 ? '+' : ''}{report.estimatedProfit.toFixed(2)} ganancia
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textTertiary} />
      </View>
      {expanded && (
        <View style={[histStyles.details, { borderTopColor: theme.separator }]}>
          {[
            { label: 'Ingreso neto', value: `$${report.totalNetRevenue.toFixed(2)}` },
            { label: 'Ingreso bruto', value: `$${report.totalGrossRevenue.toFixed(2)}` },
            { label: 'Artículos vendidos', value: report.totalItemsSold },
            { label: 'Productos en stock', value: report.stockSnapshot.totalProducts },
            { label: 'Valor del stock', value: `$${report.stockSnapshot.totalValue.toFixed(2)}` },
          ].map((r) => (
            <View key={r.label} style={histStyles.detailRow}>
              <Text style={[histStyles.detailLabel, { color: theme.textSecondary }]}>{r.label}</Text>
              <Text style={[histStyles.detailValue, { color: theme.text }]}>{r.value}</Text>
            </View>
          ))}
          {report.sales.length > 0 && (
            <>
              <Text style={[histStyles.salesTitle, { color: theme.textSecondary }]}>Artículos vendidos</Text>
              {report.sales.map((s) => (
                <View key={s.id} style={histStyles.saleRow}>
                  <Text style={[histStyles.saleName, { color: theme.text }]} numberOfLines={1}>{s.productName}</Text>
                  <Text style={[histStyles.saleInfo, { color: theme.textSecondary }]}>
                    ×{s.quantity} · ${(s.saleGrossPrice * s.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

const histStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  date: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  items: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  cardRight: { flex: 1, alignItems: 'flex-end' },
  revenue: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  profit: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  details: { borderTopWidth: 1, paddingTop: 10, gap: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  detailValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  salesTitle: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  saleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saleName: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  saleInfo: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});

export default function ReportsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { getWeeklySales, getMonthlySales, getTopProducts, reports, products, sales } = useInventory();

  const [period, setPeriod] = useState<Period>('week');
  const [tab, setTab] = useState<'overview' | 'history'>('overview');

  const chartData = period === 'week' ? getWeeklySales() : getMonthlySales();
  const topProducts = getTopProducts(5);
  const totalRevenue = sales.reduce((s, r) => s + r.saleGrossPrice * r.quantity, 0);
  const totalProfit = sales.reduce((s, r) => s + (r.saleGrossPrice - r.purchaseGrossPrice) * r.quantity, 0);
  const totalStockValue = products.reduce((s, p) => s + p.grossPrice * p.quantity, 0);

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const sortedReports = [...reports].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: theme.text }]}>Informes</Text>
        <View style={[styles.tabSwitch, { backgroundColor: theme.backgroundTertiary }]}>
          {(['overview', 'history'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, tab === t && { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.tabText, { color: tab === t ? '#0D1117' : theme.textSecondary }]}>
                {t === 'overview' ? 'Resumen' : 'Historial'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {tab === 'overview' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 100) }]}
        >
          <View style={styles.statsGrid}>
            {[
              { label: 'Ingresos totales', value: `$${totalRevenue.toFixed(2)}`, icon: 'cash-outline', color: theme.accent },
              { label: 'Ganancia total', value: `$${totalProfit.toFixed(2)}`, icon: 'trending-up-outline', color: theme.success },
              { label: 'Valor del stock', value: `$${totalStockValue.toFixed(2)}`, icon: 'cube-outline', color: theme.info },
              { label: 'Total ventas', value: sales.length, icon: 'receipt-outline', color: theme.text },
            ].map((s) => (
              <View key={s.label} style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={[styles.statIcon, { backgroundColor: s.color + '22' }]}>
                  <Ionicons name={s.icon as any} size={18} color={s.color} />
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Ingresos</Text>
              <View style={[styles.periodSwitch, { backgroundColor: theme.backgroundTertiary }]}>
                {(['week', 'month'] as const).map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setPeriod(p)}
                    style={[styles.periodBtn, period === p && { backgroundColor: theme.accent }]}
                  >
                    <Text style={[styles.periodText, { color: period === p ? '#0D1117' : theme.textSecondary }]}>
                      {p === 'week' ? '7D' : '30D'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <BarChart
              data={chartData.map((d) => ({ day: d.day, value: d.gross }))}
              height={180}
              accentColor={theme.accent}
              formatValue={(v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)}`}
            />
            <View style={styles.chartLegend}>
              <Text style={[styles.legendText, { color: theme.textTertiary }]}>
                Total: ${chartData.reduce((s, d) => s + d.gross, 0).toFixed(2)}
              </Text>
              <Text style={[styles.legendText, { color: theme.textTertiary }]}>
                Prom/día: ${(chartData.reduce((s, d) => s + d.gross, 0) / chartData.length).toFixed(2)}
              </Text>
            </View>
          </View>

          {topProducts.length > 0 && (
            <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Productos más vendidos</Text>
              {topProducts.map((tp, i) => (
                <View key={tp.product.id} style={[styles.topRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.separator }]}>
                  <View style={[styles.rankBadge, { backgroundColor: i === 0 ? theme.accent + '22' : theme.backgroundTertiary }]}>
                    <Text style={[styles.rankText, { color: i === 0 ? theme.accent : theme.textSecondary }]}>#{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.topName, { color: theme.text }]} numberOfLines={1}>{tp.product.name}</Text>
                    <Text style={[styles.topSub, { color: theme.textSecondary }]}>{tp.totalSold} vendidos</Text>
                  </View>
                  <Text style={[styles.topRevenue, { color: theme.accent }]}>${tp.totalRevenue.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}

          {products.length > 0 && (
            <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Resumen de stock</Text>
              <BarChart
                data={products.slice(0, 10).map((p) => ({ day: p.name.slice(0, 4), value: p.quantity }))}
                height={140}
                accentColor={theme.info}
                formatValue={(v) => v.toFixed(0)}
              />
              <Text style={[styles.chartCaption, { color: theme.textTertiary }]}>Top 10 productos por nombre (cantidad)</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={sortedReports}
          keyExtractor={(r) => r.id}
          contentContainerStyle={[styles.histList, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 100) }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!sortedReports.length}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={52} color={theme.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin informes aún</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Completa una jornada para generar tu primer informe
              </Text>
            </View>
          }
          renderItem={({ item }) => <ReportHistoryItem report={item} theme={theme} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  tabSwitch: { flexDirection: 'row', borderRadius: 12, padding: 3, alignSelf: 'flex-start' },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  tabText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  scrollContent: { paddingHorizontal: 16, gap: 14, paddingTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { width: '47.5%', borderRadius: 16, borderWidth: 1, padding: 14, gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  section: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  periodSwitch: { flexDirection: 'row', borderRadius: 10, padding: 2 },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  periodText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  chartLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rankBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  topName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  topSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  topRevenue: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  chartCaption: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  histList: { paddingHorizontal: 16, gap: 10, paddingTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingHorizontal: 40 },
});
