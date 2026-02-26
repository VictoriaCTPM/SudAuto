import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PriceHistoryEntry {
  date: string;
  netPrice: number;
  grossPrice: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  serialNumber: string;
  barcode: string;
  category: string;
  netPrice: number;
  grossPrice: number;
  quantity: number;
  minQuantity: number;
  supplier: string;
  notes: string;
  photoUri?: string;
  createdAt: string;
  updatedAt: string;
  priceHistory: PriceHistoryEntry[];
}

export interface SaleRecord {
  id: string;
  productId: string;
  productName: string;
  productBrand: string;
  quantity: number;
  saleNetPrice: number;
  saleGrossPrice: number;
  purchaseNetPrice: number;
  purchaseGrossPrice: number;
  soldAt: string;
  dayId: string;
}

export interface WorkDay {
  id: string;
  date: string;
  startedAt: string;
  endedAt?: string;
  isActive: boolean;
}

export interface Order {
  id: string;
  productName: string;
  brand: string;
  quantity: number;
  expectedNetCost: number;
  expectedGrossCost: number;
  supplier: string;
  expectedDelivery: string;
  status: 'ordered' | 'received' | 'partial';
  notes: string;
  createdAt: string;
  receivedAt?: string;
  productId?: string;
}

export interface DailyReport {
  id: string;
  dayId: string;
  date: string;
  totalItemsSold: number;
  totalNetRevenue: number;
  totalGrossRevenue: number;
  estimatedProfit: number;
  sales: SaleRecord[];
  stockSnapshot: { totalProducts: number; totalValue: number };
  savedAt: string;
}

export const DEFAULT_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Food & Beverage',
  'Tools',
  'Office Supplies',
  'Furniture',
  'Health & Beauty',
  'Toys',
  'Sports',
  'Other',
];

const KEYS = {
  PRODUCTS: '@stockpilot:products',
  WORKDAYS: '@stockpilot:workdays',
  SALES: '@stockpilot:sales',
  ORDERS: '@stockpilot:orders',
  REPORTS: '@stockpilot:reports',
  CATEGORIES: '@stockpilot:categories',
};

interface InventoryContextValue {
  products: Product[];
  workdays: WorkDay[];
  sales: SaleRecord[];
  orders: Order[];
  reports: DailyReport[];
  categories: string[];
  isLoading: boolean;

  activeWorkDay: WorkDay | null;

  addProduct: (p: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'priceHistory'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  deleteProducts: (ids: string[]) => Promise<void>;
  adjustQuantity: (id: string, delta: number) => Promise<void>;
  getProduct: (id: string) => Product | undefined;

  startWorkDay: () => Promise<WorkDay>;
  endWorkDay: () => Promise<DailyReport | null>;
  registerSale: (sale: Omit<SaleRecord, 'id' | 'soldAt' | 'dayId'>) => Promise<void>;
  getDaySales: (dayId: string) => SaleRecord[];
  deleteSale: (id: string) => Promise<void>;

  addOrder: (o: Omit<Order, 'id' | 'createdAt'>) => Promise<void>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  receiveOrder: (id: string, quantityReceived: number) => Promise<void>;

  addCategory: (cat: string) => Promise<void>;

  getWeeklySales: () => { day: string; net: number; gross: number }[];
  getMonthlySales: () => { day: string; net: number; gross: number }[];
  getTopProducts: (limit?: number) => { product: Product; totalSold: number; totalRevenue: number }[];
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [workdays, setWorkdays] = useState<WorkDay[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.PRODUCTS),
      AsyncStorage.getItem(KEYS.WORKDAYS),
      AsyncStorage.getItem(KEYS.SALES),
      AsyncStorage.getItem(KEYS.ORDERS),
      AsyncStorage.getItem(KEYS.REPORTS),
      AsyncStorage.getItem(KEYS.CATEGORIES),
    ]).then(([p, w, s, o, r, c]) => {
      if (p) setProducts(JSON.parse(p));
      if (w) setWorkdays(JSON.parse(w));
      if (s) setSales(JSON.parse(s));
      if (o) setOrders(JSON.parse(o));
      if (r) setReports(JSON.parse(r));
      if (c) setCategories(JSON.parse(c));
      setIsLoading(false);
    });
  }, []);

  const saveProducts = useCallback(async (data: Product[]) => {
    setProducts(data);
    await AsyncStorage.setItem(KEYS.PRODUCTS, JSON.stringify(data));
  }, []);

  const saveWorkdays = useCallback(async (data: WorkDay[]) => {
    setWorkdays(data);
    await AsyncStorage.setItem(KEYS.WORKDAYS, JSON.stringify(data));
  }, []);

  const saveSales = useCallback(async (data: SaleRecord[]) => {
    setSales(data);
    await AsyncStorage.setItem(KEYS.SALES, JSON.stringify(data));
  }, []);

  const saveOrders = useCallback(async (data: Order[]) => {
    setOrders(data);
    await AsyncStorage.setItem(KEYS.ORDERS, JSON.stringify(data));
  }, []);

  const saveReports = useCallback(async (data: DailyReport[]) => {
    setReports(data);
    await AsyncStorage.setItem(KEYS.REPORTS, JSON.stringify(data));
  }, []);

  const addProduct = useCallback(async (p: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'priceHistory'>) => {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...p,
      id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
      priceHistory: [{ date: now, netPrice: p.netPrice, grossPrice: p.grossPrice }],
    };
    await saveProducts([...products, newProduct]);
    return newProduct;
  }, [products, saveProducts]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    const updated = products.map((p) => {
      if (p.id !== id) return p;
      const now = new Date().toISOString();
      const priceChanged = (updates.netPrice !== undefined && updates.netPrice !== p.netPrice)
        || (updates.grossPrice !== undefined && updates.grossPrice !== p.grossPrice);
      const newHistory = priceChanged
        ? [...p.priceHistory, { date: now, netPrice: updates.netPrice ?? p.netPrice, grossPrice: updates.grossPrice ?? p.grossPrice }]
        : p.priceHistory;
      return { ...p, ...updates, updatedAt: now, priceHistory: newHistory };
    });
    await saveProducts(updated);
  }, [products, saveProducts]);

  const deleteProduct = useCallback(async (id: string) => {
    await saveProducts(products.filter((p) => p.id !== id));
  }, [products, saveProducts]);

  const deleteProducts = useCallback(async (ids: string[]) => {
    const set = new Set(ids);
    await saveProducts(products.filter((p) => !set.has(p.id)));
  }, [products, saveProducts]);

  const adjustQuantity = useCallback(async (id: string, delta: number) => {
    const updated = products.map((p) =>
      p.id === id ? { ...p, quantity: Math.max(0, p.quantity + delta), updatedAt: new Date().toISOString() } : p
    );
    await saveProducts(updated);
  }, [products, saveProducts]);

  const getProduct = useCallback((id: string) => products.find((p) => p.id === id), [products]);

  const activeWorkDay = useMemo(() => workdays.find((w) => w.isActive) ?? null, [workdays]);

  const startWorkDay = useCallback(async () => {
    if (activeWorkDay) return activeWorkDay;
    const now = new Date();
    const newDay: WorkDay = {
      id: `day_${Date.now()}`,
      date: now.toISOString().slice(0, 10),
      startedAt: now.toISOString(),
      isActive: true,
    };
    await saveWorkdays([...workdays, newDay]);
    return newDay;
  }, [activeWorkDay, workdays, saveWorkdays]);

  const endWorkDay = useCallback(async () => {
    if (!activeWorkDay) return null;
    const daySalesData = sales.filter((s) => s.dayId === activeWorkDay.id);
    const totalNetRevenue = daySalesData.reduce((sum, s) => sum + s.saleNetPrice * s.quantity, 0);
    const totalGrossRevenue = daySalesData.reduce((sum, s) => sum + s.saleGrossPrice * s.quantity, 0);
    const estimatedProfit = daySalesData.reduce(
      (sum, s) => sum + (s.saleGrossPrice - s.purchaseGrossPrice) * s.quantity, 0
    );
    const totalStockValue = products.reduce((sum, p) => sum + p.grossPrice * p.quantity, 0);

    const report: DailyReport = {
      id: `report_${Date.now()}`,
      dayId: activeWorkDay.id,
      date: activeWorkDay.date,
      totalItemsSold: daySalesData.reduce((sum, s) => sum + s.quantity, 0),
      totalNetRevenue,
      totalGrossRevenue,
      estimatedProfit,
      sales: daySalesData,
      stockSnapshot: { totalProducts: products.length, totalValue: totalStockValue },
      savedAt: new Date().toISOString(),
    };

    const updatedDays = workdays.map((w) =>
      w.id === activeWorkDay.id ? { ...w, isActive: false, endedAt: new Date().toISOString() } : w
    );
    await saveWorkdays(updatedDays);
    await saveReports([...reports, report]);
    return report;
  }, [activeWorkDay, workdays, sales, products, reports, saveWorkdays, saveReports]);

  const registerSale = useCallback(async (sale: Omit<SaleRecord, 'id' | 'soldAt' | 'dayId'>) => {
    if (!activeWorkDay) throw new Error('No active work day. Start your work day first.');
    const newSale: SaleRecord = {
      ...sale,
      id: `sale_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      soldAt: new Date().toISOString(),
      dayId: activeWorkDay.id,
    };
    await saveSales([...sales, newSale]);
    await adjustQuantity(sale.productId, -sale.quantity);
  }, [activeWorkDay, sales, saveSales, adjustQuantity]);

  const getDaySales = useCallback((dayId: string) => sales.filter((s) => s.dayId === dayId), [sales]);

  const deleteSale = useCallback(async (id: string) => {
    const sale = sales.find((s) => s.id === id);
    if (sale) await adjustQuantity(sale.productId, sale.quantity);
    await saveSales(sales.filter((s) => s.id !== id));
  }, [sales, saveSales, adjustQuantity]);

  const addOrder = useCallback(async (o: Omit<Order, 'id' | 'createdAt'>) => {
    const newOrder: Order = {
      ...o,
      id: `order_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await saveOrders([...orders, newOrder]);
  }, [orders, saveOrders]);

  const updateOrder = useCallback(async (id: string, updates: Partial<Order>) => {
    await saveOrders(orders.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  }, [orders, saveOrders]);

  const deleteOrder = useCallback(async (id: string) => {
    await saveOrders(orders.filter((o) => o.id !== id));
  }, [orders, saveOrders]);

  const receiveOrder = useCallback(async (id: string, quantityReceived: number) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const isPartial = quantityReceived < order.quantity;
    await updateOrder(id, {
      status: isPartial ? 'partial' : 'received',
      receivedAt: new Date().toISOString(),
    });
    const existing = products.find(
      (p) => order.productId ? p.id === order.productId : p.name.toLowerCase() === order.productName.toLowerCase()
    );
    if (existing) {
      await adjustQuantity(existing.id, quantityReceived);
    } else {
      await addProduct({
        name: order.productName,
        brand: order.brand,
        serialNumber: '',
        barcode: '',
        category: 'Other',
        netPrice: order.expectedNetCost,
        grossPrice: order.expectedGrossCost,
        quantity: quantityReceived,
        minQuantity: 5,
        supplier: order.supplier,
        notes: `Received from order ${id}`,
      });
    }
  }, [orders, products, updateOrder, adjustQuantity, addProduct]);

  const addCategory = useCallback(async (cat: string) => {
    if (categories.includes(cat)) return;
    const updated = [...categories, cat];
    setCategories(updated);
    await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify(updated));
  }, [categories]);

  const getWeeklySales = useCallback(() => {
    const days: { day: string; net: number; gross: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const daySales = sales.filter((s) => s.soldAt.slice(0, 10) === dateStr);
      days.push({
        day: d.toLocaleDateString('en', { weekday: 'short' }),
        net: daySales.reduce((sum, s) => sum + s.saleNetPrice * s.quantity, 0),
        gross: daySales.reduce((sum, s) => sum + s.saleGrossPrice * s.quantity, 0),
      });
    }
    return days;
  }, [sales]);

  const getMonthlySales = useCallback(() => {
    const days: { day: string; net: number; gross: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const daySales = sales.filter((s) => s.soldAt.slice(0, 10) === dateStr);
      days.push({
        day: d.getDate().toString(),
        net: daySales.reduce((sum, s) => sum + s.saleNetPrice * s.quantity, 0),
        gross: daySales.reduce((sum, s) => sum + s.saleGrossPrice * s.quantity, 0),
      });
    }
    return days;
  }, [sales]);

  const getTopProducts = useCallback((limit = 5) => {
    const map = new Map<string, { totalSold: number; totalRevenue: number }>();
    sales.forEach((s) => {
      const curr = map.get(s.productId) ?? { totalSold: 0, totalRevenue: 0 };
      map.set(s.productId, {
        totalSold: curr.totalSold + s.quantity,
        totalRevenue: curr.totalRevenue + s.saleGrossPrice * s.quantity,
      });
    });
    return Array.from(map.entries())
      .map(([id, stats]) => ({ product: products.find((p) => p.id === id)!, ...stats }))
      .filter((x) => x.product)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, limit);
  }, [sales, products]);

  const value = useMemo(
    () => ({
      products, workdays, sales, orders, reports, categories, isLoading,
      activeWorkDay,
      addProduct, updateProduct, deleteProduct, deleteProducts, adjustQuantity, getProduct,
      startWorkDay, endWorkDay, registerSale, getDaySales, deleteSale,
      addOrder, updateOrder, deleteOrder, receiveOrder,
      addCategory,
      getWeeklySales, getMonthlySales, getTopProducts,
    }),
    [products, workdays, sales, orders, reports, categories, isLoading, activeWorkDay]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
}
