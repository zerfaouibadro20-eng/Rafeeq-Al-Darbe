# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Primary artifact: **رفيق الدرب (Rafeeq Al-Darb)** — a full-featured Islamic PWA app.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 (shared api-server, not used by main app)
- **Database**: PostgreSQL + Drizzle ORM (available, not used by Rafeeq app)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: Vite (React)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/rafeeq-al-darb run dev` — run the Rafeeq app locally
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Rafeeq Al-Darb App

### Location
`artifacts/rafeeq-al-darb/` — React + Vite PWA

### Features
1. **Loading Screen** — downloads Quran + Hadith data on first launch, caches in localStorage
2. **Quran** (`/quran`) — 114 surahs, Hafs & Warsh recitations, verse-by-verse display, TTS listening
3. **Tilawa** (`/tilawa`) — live recitation with speech recognition, tajweed error correction, red error overlay + vibration
4. **RSVP** (`/rsvp`) — speed reading with eye tracking via camera (FaceDetector API), variable WPM
5. **Hadith** (`/hadith`) — 20 hadith books loaded from GitHub JSON API, searchable
6. **Tajweed** (`/tajweed`) — 7 tajweed rules with Quranic examples and TTS
7. **Fiqh** (`/fiqh`) — 8 detailed fiqh chapters (Tahara, Salah, Zakat, Sawm, Hajj, Nikah, Muamalat, Jana'iz)
8. **Prayer Times** (`/prayer`) — geolocation-based times from aladhan.com API, next prayer countdown, Adhan TTS
9. **Qibla** (`/qibla`) — compass using DeviceOrientation API + geolocation, distance to Mecca
10. **Tasbih** (`/tasbih`) — 33-bead digital tasbih for 5 dhikr types, with counters, vibration, auto-save

### Data Sources (fetched once, cached in localStorage)
- Quran Hafs: `https://raw.githubusercontent.com/risan/quran-json/main/data/quran.json`
- Quran Warsh: `https://raw.githubusercontent.com/risan/quran-json/main/data/quran-warsh.json`
- Hadith: `https://raw.githubusercontent.com/saandsoft/hadith-json/main/db/{book}.json`
- Prayer Times: `https://api.aladhan.com/v1/timings` (real-time, cached daily)

### Design
- Dark background: `#121212`
- Gold accent: `#D4AF37`
- Arabic fonts: Amiri, Scheherazade New, Cairo
- PWA ready: manifest.json, sw.js service worker, apple touch icon

### Developer Credit
**بدر الدين زرفاوي (Badr Eddine Zerfaoui)**
