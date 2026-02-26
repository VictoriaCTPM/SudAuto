# StockPilot — App de Gestión de Inventario

## Overview
A cross-platform mobile inventory management app built with React Native + Expo (managed workflow). Full-featured stock, sales, orders, and analytics management. **Entire UI is in Spanish** with categories tailored for hardware stores (ferreterías) and auto parts shops (refaccionarias).

## Tech Stack
- **Frontend**: React Native + Expo (SDK 54), Expo Router (file-based routing)
- **Backend**: Express.js (port 5000) — minimal, serves landing page + API
- **Persistence**: AsyncStorage (local, per-device)
- **State**: React Context (AuthContext, InventoryContext) + React Query
- **UI**: Inter font (@expo-google-fonts/inter), expo-blur, react-native-reanimated
- **Camera**: expo-camera (barcode scanning), expo-image-picker (OCR photos)
- **OCR**: Gemini AI (via Replit AI Integrations) — server-side endpoint extracts name, brand, serial, barcode, price from product label photos
- **Charts**: Custom SVG bar charts via react-native-svg

## App Structure
```
app/
  _layout.tsx          # Root layout — fonts, providers (Auth, Inventory, Toast, React Query)
  (auth)/
    _layout.tsx
    login.tsx          # Inicio de sesión
    register.tsx       # Crear cuenta
  (tabs)/
    _layout.tsx        # 5-tab layout (NativeTabs iOS 26+ / Classic fallback)
    index.tsx          # Inventario — lista de productos, búsqueda, filtros, acciones masivas
    scan.tsx           # Escáner de código de barras + OCR de etiquetas (Gemini AI)
    today.tsx          # Hoy — jornada, registrar ventas, panel en tiempo real
    orders.tsx         # Pedidos — agregar/recibir stock entrante
    reports.tsx        # Informes — gráficos, productos más vendidos, historial de reportes
  product/
    new.tsx            # Agregar producto (modal) — acepta datos pre-llenados del OCR
    [id].tsx           # Detalle/edición de producto (modal)

contexts/
  AuthContext.tsx      # Autenticación (AsyncStorage)
  InventoryContext.tsx # Productos, ventas, jornadas, pedidos, informes

components/
  Toast.tsx            # Sistema de notificaciones toast
  BarChart.tsx         # Componente de gráfico de barras SVG
  ErrorBoundary.tsx    # Error boundary wrapper
  ErrorFallback.tsx    # Pantalla de error (en español)
```

## Key Features
1. **Autenticación** — Correo/contraseña, almacenado localmente
2. **Gestión de inventario** — CRUD, búsqueda, filtros por categoría, alertas de stock bajo, historial de precios, eliminación masiva
3. **Escáner de código de barras** — Escaneo en tiempo real vía expo-camera
4. **OCR** — Gemini AI extrae 5 campos de etiquetas: nombre, marca, serie, código de barras, precio (vía endpoint POST /api/ocr)
5. **Jornada / Ventas** — Iniciar/finalizar día, registrar ventas, panel de P&L en tiempo real
6. **Pedidos** — Rastrear stock entrante, confirmar recepción (actualiza inventario automáticamente)
7. **Informes** — Gráficos semanales/mensuales de ingresos, productos más vendidos, historial de reportes diarios

## Categories (Spanish, for ferreterías/refaccionarias)
Herramientas Manuales, Herramientas Eléctricas, Tornillería y Fijación, Pintura y Acabados, Plomería, Electricidad, Ferretería General, Accesorios Automotriz, Aceites y Lubricantes, Filtros y Refacciones, Llantas y Rines, Iluminación Vehicular, Baterías y Carga, Seguridad Industrial, Jardín y Exterior, Otro

## Environment Variables
- `AI_INTEGRATIONS_GEMINI_BASE_URL` — Auto-configured by Replit AI Integrations
- `AI_INTEGRATIONS_GEMINI_API_KEY` — Auto-configured by Replit AI Integrations
- `EXPO_PUBLIC_DOMAIN` — Set by Replit for API URL resolution

## Running the App
- **Backend**: `npm run server:dev` (port 5000)
- **Frontend**: `npm run expo:dev` (port 8081)

## Design System
- Colors: Navy (#1A1F36) + Amber accent (#F5A623), dark/light theme
- Typography: Inter (400, 500, 600, 700)
- Border radius: 12–18px for cards
- Tab bar: NativeTabs with liquid glass on iOS 26+, BlurView fallback
- Language: 100% Spanish UI
