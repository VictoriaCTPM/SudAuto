# StockPilot — Inventory Management App

## Overview
A cross-platform mobile inventory management app built with React Native + Expo (managed workflow). Full-featured stock, sales, orders, and analytics management.

## Tech Stack
- **Frontend**: React Native + Expo (SDK 53), Expo Router (file-based routing)
- **Backend**: Express.js (port 5000) — minimal, serves landing page + API
- **Persistence**: AsyncStorage (local, per-device)
- **State**: React Context (AuthContext, InventoryContext) + React Query
- **UI**: Inter font (@expo-google-fonts/inter), expo-blur, react-native-reanimated
- **Camera**: expo-camera (barcode scanning), expo-image-picker (OCR photos)
- **OCR**: Google Cloud Vision API (optional, set EXPO_PUBLIC_GOOGLE_VISION_API_KEY)
- **Charts**: Custom SVG bar charts via react-native-svg

## App Structure
```
app/
  _layout.tsx          # Root layout — fonts, providers (Auth, Inventory, Toast, React Query)
  (auth)/
    _layout.tsx
    login.tsx          # Email/password login
    register.tsx       # Account registration
  (tabs)/
    _layout.tsx        # 5-tab layout (NativeTabs iOS 26+ / Classic fallback)
    index.tsx          # Stock screen — product list, search, filter, bulk actions
    scan.tsx           # Barcode scanner + OCR via Google Vision
    today.tsx          # Work day — start/end, register sales, live dashboard
    orders.tsx         # Order management — add/receive incoming stock
    reports.tsx        # Analytics — charts, top products, daily report history
  product/
    new.tsx            # Add product (modal)
    [id].tsx           # Product detail/edit (modal)

contexts/
  AuthContext.tsx      # User auth (AsyncStorage-backed)
  InventoryContext.tsx # Products, sales, work days, orders, reports

components/
  Toast.tsx            # Toast notification system
  BarChart.tsx         # SVG bar chart component
  ErrorBoundary.tsx    # Error boundary wrapper
```

## Key Features
1. **Authentication** — Email/password, stored locally
2. **Stock Management** — CRUD, search, category filters, low-stock alerts, price history, bulk delete
3. **Barcode Scanner** — Real-time barcode scanning via expo-camera
4. **OCR** — Google Cloud Vision API text extraction for auto-filling product fields
5. **Work Day / Sales** — Start/end day, register sales, real-time P&L dashboard
6. **Orders** — Track incoming stock, confirm receipt (auto-updates inventory)
7. **Reports** — Weekly/monthly revenue charts, top products, day report history

## Environment Variables
- `EXPO_PUBLIC_GOOGLE_VISION_API_KEY` — Optional; enables OCR from product photos
- `EXPO_PUBLIC_DOMAIN` — Set by Replit for API URL resolution

## Running the App
- **Backend**: `npm run server:dev` (port 5000)
- **Frontend**: `npm run expo:dev` (port 8081)

## Design System
- Colors: Navy (#1A1F36) + Amber accent (#F5A623), dark/light theme
- Typography: Inter (400, 500, 600, 700)
- Border radius: 12–18px for cards
- Tab bar: NativeTabs with liquid glass on iOS 26+, BlurView fallback
