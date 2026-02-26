import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_COLORS = {
  success: '#10B981',
  error: '#F43F5E',
  info: '#38BDF8',
  warning: '#F5A623',
};

const TOAST_ICONS: Record<ToastType, string> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  info: 'information-circle',
  warning: 'warning',
};

function ToastItem({ message, type, onDone }: { message: string; type: ToastType; onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 80 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80 }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 250, useNativeDriver: true }),
      ]).start(onDone);
    }, 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.iconBg, { backgroundColor: TOAST_COLORS[type] + '22' }]}>
        <Ionicons name={TOAST_ICONS[type] as any} size={18} color={TOAST_COLORS[type]} />
      </View>
      <Text style={styles.text} numberOfLines={2}>{message}</Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const insets = useSafeAreaInsets();

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={[styles.container, { top: insets.top + (Platform.OS === 'web' ? 67 : 16) }]} pointerEvents="none">
        {toasts.map((t) => (
          <ToastItem key={t.id} message={t.message} type={t.type} onDone={() => remove(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2333',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    color: '#E8EDF5',
    fontSize: 14,
    fontWeight: '500',
  },
});
