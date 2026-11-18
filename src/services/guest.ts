import { z } from 'zod'

/**
 * Guest session management.
 * Sessions live in sessionStorage (cleared when the tab closes), are unique per
 * visitor, and expire after a set TTL. Guests are NOT Supabase-authenticated
 * users — they get read-only public access plus local-only preferences.
 */

export interface GuestSession {
  guestId: string
  role: 'guest'
  sessionCreatedAt: number
  sessionExpiresAt: number
  sessionStatus: 'active' | 'expired'
}

const GUEST_KEY = 'petalert:guest-session:v1'
const GUEST_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours

const guestSchema = z.object({
  guestId: z.string().uuid(),
  role: z.literal('guest'),
  sessionCreatedAt: z.number(),
  sessionExpiresAt: z.number(),
  sessionStatus: z.enum(['active', 'expired'])
})

export function createGuestSession(): GuestSession {
  const now = Date.now()
  const session: GuestSession = {
    guestId: crypto.randomUUID(),
    role: 'guest',
    sessionCreatedAt: now,
    sessionExpiresAt: now + GUEST_TTL_MS,
    sessionStatus: 'active'
  }
  try { sessionStorage.setItem(GUEST_KEY, JSON.stringify(session)) } catch { /* storage unavailable */ }
  return session
}

/** Returns the active session, or null if absent/expired/expired sessions are cleaned up. */
export function getGuestSession(): GuestSession | null {
  try {
    const raw = sessionStorage.getItem(GUEST_KEY)
    if (!raw) return null
    const parsed = guestSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) { sessionStorage.removeItem(GUEST_KEY); return null }
    const s = parsed.data as GuestSession
    if (Date.now() > s.sessionExpiresAt || s.sessionStatus === 'expired') {
      sessionStorage.removeItem(GUEST_KEY)
      return null
    }
    return s
  } catch {
    try { sessionStorage.removeItem(GUEST_KEY) } catch { /* ignore */ }
    return null
  }
}

export function endGuestSession(): void {
  try { sessionStorage.removeItem(GUEST_KEY) } catch { /* ignore */ }
}

/** Local-only guest preferences (never private data) — stored in localStorage under a versioned key. */
const PREFS_KEY = 'petalert:guest-prefs:v1'
const prefsSchema = z.object({ savedReports: z.array(z.string()).max(100) })
export interface GuestPrefs { savedReports: string[] }

export function getGuestPrefs(): GuestPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { savedReports: [] }
    const parsed = prefsSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : { savedReports: [] }
  } catch { return { savedReports: [] } }
}

export function saveGuestPrefs(prefs: GuestPrefs): void {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)) } catch { /* ignore */ }
}
