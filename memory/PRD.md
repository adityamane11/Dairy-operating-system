# Siddhnath Doodh Sankalan Kendra — Dairy Management App

## Overview
A complete dairy ERP mobile app for Indian dairy collection centers. Built with Expo (React Native) + FastAPI + MongoDB. Two roles: **Admin** (owner) and **Farmer**.

## Key Features
- 📸 **AI Photo Reading** — Photo of milk machine LCD → extracts Fat %, SNF %, Density via Gemini 3 Flash.
- ✍️ **Manual Entry** — Tap-to-enter Fat/SNF when photo not feasible.
- 👨‍🌾 **Farmer Profiles** — Auto-generated Farmer IDs (F001, F002…), phone, village.
- 🧮 **Smart Rate Calculation** — Configurable base rate + Fat/SNF increments (default: Fat 3.5 + SNF 8.5 = ₹35/L; +₹0.40 per 0.1 Fat, +₹0.30 per 0.1 SNF).
- 📅 **Weekly / Fortnightly / Monthly Payment Summary** — Gross − advances = net payable per farmer.
- 💸 **Advance Tracking** — Add advances anytime; auto-deducted from next payment; one-tap "Settle All".
- 📱 **WhatsApp Slip** — Generates Marathi slip and opens `wa.me` deep link (no API key needed).
- 🎨 **Brand** — Siddhnath logo, Gold #D4A017 + Green #2D6A35 palette.
- 🌐 **Bilingual** — Marathi + English mixed UI.

## User Flows
1. **Splash → Role select** (Admin / Farmer).
2. **Admin Login** (password) → Dashboard (today's collection, FABs, recent entries).
3. **Admin: Add Entry** — Pick farmer → Liters → Camera/Manual Fat & SNF → live rate preview → Save / Save & WhatsApp.
4. **Admin: Farmers tab** — Search/list farmers → tap to open Farmer Detail (weekly summary + entries + advances + WhatsApp bill).
5. **Admin: Entries tab** — All entries (filter: all/morning/evening), one-tap WhatsApp on any.
6. **Admin: Settings** — Rate config, dairy info, password.
7. **Farmer Login** (Farmer ID + Phone) → Personal dashboard (period toggle 7/14/30 days, hero net payable, advances, daily entries, WhatsApp slip).

## Tech
- **Backend**: FastAPI, motor (async MongoDB), Pydantic, emergentintegrations (Gemini 3 Flash via Emergent LLM Key).
- **Frontend**: Expo SDK 54, expo-router, expo-camera, expo-image-picker, expo-image-manipulator, react-native-keyboard-controller, react-native-reanimated, expo-linear-gradient.
- **Storage**: `@/src/utils/storage` for session/scan-result bridge.

## API surface (all `/api/...`)
- `POST /auth/admin-login`, `POST /auth/farmer-login`
- `GET/POST /farmers`, `GET/PUT/DELETE /farmers/{id}`
- `POST /milk-entries`, `GET /milk-entries`, `DELETE /milk-entries/{id}`
- `GET /today-summary`
- `POST /advances`, `GET /advances`, `DELETE /advances/{id}`
- `GET /payment-summary/{farmer_id}`, `POST /payment-summary/{id}/settle-advances`
- `GET/PUT /settings`
- `POST /rate-preview`
- `POST /scan-image` (Gemini OCR)

## Update: Expo SDK 58 upgrade (DONE)
- expo 58, React Native 0.88, React 19.3; all expo-* packages aligned via `expo install --fix`
- @expo/vector-icons replaced with @react-native-vector-icons/ionicons
- Removed newArchEnabled / edgeToEdgeEnabled from app.json; expo-router asyncRoutes.web=false (static web export)
- Next: Custom rate chart upload (P1)
