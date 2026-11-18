# 🐾 PetAlert — Real-Time Lost & Found Pet Platform

PetAlert is a location-based lost & found pet platform. When a pet goes missing, the owner submits a report with photos and the last-seen location. Users near that location receive **real-time alerts** based on their chosen radius. Anyone who spots the pet submits a sighting with photos and GPS — and the owner is notified instantly. Owners and finders coordinate through private in-app messaging until the pet is marked **reunited**.

## ✨ Features

| Area | What's included |
|---|---|
| **Public pages** | Homepage, Live Pet Map, Missing Pets, Found Pets, Pet Details, About, How It Works |
| **Auth** | Registration, login, logout, password reset, protected routes, role-based access |
| **Reporting** | Multi-step Lost Pet form and Found Pet form (photos, GPS pin picker, alert radius, contact preferences), report editing/resolution/reunification |
| **Sightings** | Submit sightings with photos + GPS on any report; owner notified in real time |
| **Live map** | Leaflet + OpenStreetMap, marker clustering, radius/distance/animal-type/status filters, search, realtime updates, pet preview popups |
| **Realtime alerts** | Radius-based fan-out (1/3/5/10 km), per-user notification preferences, live badge updates |
| **Notifications** | Nearby missing/found, sightings, messages, AI matches, status changes, reunification; mark-read, delete, history |
| **Messaging** | Report-linked conversations, realtime delivery, unread counts, abuse reporting |
| **Dashboard** | Overview, My Pets, My Reports, Nearby Alerts, Notifications, Messages, Saved Reports, Profile Settings |
| **Admin** | Overview stats, user management, report management, moderation queue, suspicious activity heuristics, analytics |
| **Persistence** | IndexedDB/localStorage (versioned, validated), sessionStorage for form steps, BroadcastChannel tab sync |

## 🧱 Tech Stack

- **React 19 + TypeScript + Vite**
- **Tailwind CSS** (custom PetAlert design system) + shadcn-style UI components
- **React Router**, **React Hook Form + Zod**, **Lucide React**
- **Leaflet + OpenStreetMap** (+ marker clustering)
- **Supabase**: Auth, PostgreSQL + **PostGIS**, Storage, Realtime
- Future AI service: **FastAPI + PyTorch** stub (`server/ai-service`)

## 🏗 Architecture

The data layer is provider-based — all features work identically against either backend:

```
src/services/providers/
├── index.ts              # picks provider based on env
├── localProvider.ts      # dev backend: IndexedDB + BroadcastChannel realtime
└── supabaseProvider.ts   # production backend: Supabase Auth/DB/Storage/Realtime
```

- **Without Supabase credentials**, the app runs fully on the built-in local backend — register users, publish reports, receive cross-tab realtime alerts, chat, and use the admin panel. Realtime across tabs/windows uses `BroadcastChannel`; data persists in IndexedDB. Demo admin: `admin@petalert.local` / `Admin1234!`
- **With Supabase credentials**, all auth, persistence, storage, realtime, and authorization (RLS) move to Supabase.

Other modules:
- `src/services/storage.ts` — versioned/validated localStorage & sessionStorage helpers, drafts, offline detection
- `src/services/location.ts` — explicit-permission geolocation + OSM Nominatim reverse geocoding
- `src/store/` — auth & app (notifications/theme/online) contexts
- `src/components/ui/` — reusable design-system components
- `supabase/migrations/` — SQL schema, PostGIS, RLS policies, triggers, RPCs

## 🚀 Getting Started (Development)

```bash
npm install
npm run dev          # http://localhost:5173
```

No environment variables needed — the local backend activates automatically.

Try the core loop:
1. Open two browser tabs side by side.
2. Tab 1: register a user, go to **Nearby Alerts** (share location) — this saves their alert location.
3. Tab 2: register a *different* user and publish a **Lost Pet report within the first user's radius**.
4. Tab 1 receives a **real-time notification badge** instantly.
5. From Tab 2, open the report and **submit a sighting** (or click *Message reporter*).
6. Tab 1 gets the sighting notification and can chat with the finder.
7. Mark the report **Reunited** from *My Reports*.

> Note: geolocation must be permitted for nearby alerts. Coordinates can also be entered manually in the report form.

## 🔑 Production Setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Enable the **PostGIS** extension (Dashboard → Database → Extensions).
3. Open the **SQL Editor** and run:
   - `supabase/migrations/0001_init.sql` (schema, RLS, triggers, RPCs, storage bucket)
   - `supabase/migrations/0002_seed.sql` (optional demo notes)
4. In **Auth → URL Configuration**, set Site URL to your app URL and add `<app-url>/reset-confirm` as a redirect URL.
5. Copy `.env.example` to `.env` and fill in:

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
VITE_APP_URL=http://localhost:5173
```

The **anon key is safe for the frontend** — all authorization is enforced by Row Level Security policies in the migration. The service-role key must never appear in client code.

### Server-side realtime fan-out

On Supabase, the `fanout_nearby_alerts` trigger inserts notifications server-side for every eligible nearby user (distance via PostGIS, honoring per-user preferences and radius). The frontend subscribes to the `notifications` table via Supabase Realtime, so users on other devices get instant alerts.

## 🤖 AI Service (future-ready)

`server/ai-service/` contains a FastAPI stub with `/health`, `/match`, and `/embed` endpoints, ready for CLIP/EfficientNet embeddings and pgvector matching. Set `VITE_AI_SERVICE_URL` to enable the client stub in `src/ai/client.ts`. **AI results are suggestions only — never automatic identity decisions.**

```bash
cd server/ai-service
pip install -r requirements.txt
uvicorn main:app --port 8100
```

## 📦 Build & Deploy

```bash
npm run build        # type-checks + bundles to dist/
npm run preview      # serve the production build locally
```

**GitHub Pages (configured):** pushes to `main` auto-build and deploy via
`.github/workflows/deploy-pages.yml` to
https://mujahidahmed07.github.io/realtime-paw-radar — the app entry is `/home`
(the site requires Pages Source = "GitHub Actions"). The router basename is
derived from `VITE_BASE_PATH` so deep links work.

For other hosts (Vercel, Netlify, Cloudflare Pages), deploy `dist/` with no
`VITE_BASE_PATH`. The Supabase project handles the production backend.

## 🔒 Security Notes

- All database access is protected by **Row Level Security** (users read/update only their own notifications, conversations, messages, preferences; participants-only messaging; admin-only moderation).
- File uploads validated client-side (image type, ≤5 MB, ≤6 photos) and stored per-user in Supabase Storage with folder-scoped policies.
- Rate/duplicate protection on submissions; XSS-safe rendering (React); parameterized queries via Supabase client.
- Location data is stored **only on explicit user action** and used solely for distance computation. No continuous tracking. Exact owner addresses are never exposed.

## 📁 Project Structure

```
petalert/
├── src/
│   ├── components/       # ui/ (design system), layout/, pets/ (forms, cards, photo)
│   ├── pages/            # public/, dashboard/, admin/
│   ├── services/         # providers/, supabase/, storage, location
│   ├── store/            # auth, app (notifications/theme/online)
│   ├── ai/               # AI service client
│   └── types/            # shared domain types + DataProvider interface
├── supabase/migrations/  # SQL schema + RLS + triggers + seed
├── server/ai-service/    # FastAPI AI stub
└── docs/                 # testing notes
```
