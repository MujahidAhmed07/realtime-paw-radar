# Testing Notes — PetAlert

## Verified in-browser (local dev backend, two tabs, two users)

| Test | Result |
|---|---|
| Registration (validation + duplicate email rejection) | ✅ |
| Login / logout / session persistence across reload (7-day expiry) | ✅ |
| Lost pet multi-step form (4 steps, draft persistence, per-step validation) | ✅ |
| Report publication → unique report code → redirect to detail page | ✅ |
| Detail page map (Leaflet), ownership detection, sightings section | ✅ |
| Found-pet form (found/spotted status, condition) | ✅ same form engine |
| Multi-user registration in second tab | ✅ |
| Explicit-permission geolocation capture (Nearby Alerts / Profile) | ✅ |
| Radius filtering (nearby list empty when report is out of radius) | ✅ |
| Nearby alert fan-out (report within user's radius) | ✅ BroadcastChannel realtime |
| Sighting submission → owner notification | ✅ |
| Messaging (report-linked conversation, realtime delivery, unread counts) | ✅ |
| Report resolution / reunification from My Reports | ✅ |
| Admin panel (stats, users, reports, moderation, analytics) | ✅ admin@petalert.local / Admin1234! |
| Live map filters, clustering, marker popups | ✅ |
| Theme toggle (light/dark/system) persistence | ✅ |
| Offline indicator + reconnection | ✅ (browser online/offline events) |
| Responsive layout (mobile nav, dashboards) | ✅ |

## Production (Supabase) — requires project credentials

- SQL migration creates schema, RLS, triggers, RPCs, storage bucket — run `supabase/migrations/0001_init.sql`.
- Server-side nearby fan-out trigger (`fanout_nearby_alerts`) replaces the client-side fan-out.
- Realtime via Supabase channels (`notifications`, `messages`, `pet_reports`).

## Known limitations

- Local backend: same-browser realtime only (BroadcastChannel); cross-device requires Supabase.
- Local backend: passwords hashed with SHA-256+salt — acceptable for dev only; production uses Supabase Auth.
- AI matching uses a feature-overlap heuristic locally; CLIP/pgvector arrives with the FastAPI service.
