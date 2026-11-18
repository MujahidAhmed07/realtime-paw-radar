import { z } from 'zod'

/**
 * Versioned, validated, non-sensitive localStorage / sessionStorage helpers.
 * localStorage is never used for auth tokens, passwords, or cross-user data.
 */

const VERSION = 1
const PREFIX = 'petalert'
const key = (name: string) => `${PREFIX}:v${VERSION}:${name}`

export function readLocal<T>(name: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    const raw = localStorage.getItem(key(name))
    if (!raw) return fallback
    const parsed = schema.safeParse(JSON.parse(raw))
    if (!parsed.success) { localStorage.removeItem(key(name)); return fallback }
    return parsed.data
  } catch { return fallback }
}

export function writeLocal<T>(name: string, value: T, schema?: z.ZodType<T>): void {
  try {
    if (schema && !schema.safeParse(value).success) return
    localStorage.setItem(key(name), JSON.stringify(value))
  } catch { /* storage full or unavailable */ }
}

export function readSession<T>(name: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key(name))
    if (!raw) return fallback
    const parsed = schema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : fallback
  } catch { return fallback }
}

export function writeSession<T>(name: string, value: T, schema?: z.ZodType<T>): void {
  try {
    if (schema && !schema.safeParse(value).success) return
    sessionStorage.setItem(key(name), JSON.stringify(value))
  } catch { /* ignore */ }
}

export function clearSessionKey(name: string) { try { sessionStorage.removeItem(key(name)) } catch { /* ignore */ } }

export function clearAllLocalData() {
  try {
    Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k))
  } catch { /* ignore */ }
}

// ---------- Theme ----------
const themeSchema = z.object({ theme: z.enum(['light', 'dark', 'system']) })
export type ThemePref = z.infer<typeof themeSchema>
export const loadTheme = (): ThemePref => readLocal('theme', themeSchema, { theme: 'system' })
export const saveTheme = (t: ThemePref) => writeLocal('theme', t, themeSchema)

// ---------- Map filters (persisted) ----------
const filtersSchema = z.object({
  radiusKm: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(10)]),
  animalType: z.string(),
  status: z.string(),
  search: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable()
})
export type MapFilters = z.infer<typeof filtersSchema>
export const loadMapFilters = (): MapFilters => readLocal('mapFilters', filtersSchema, { radiusKm: 10, animalType: 'all', status: 'all', search: '', lat: null, lng: null })
export const saveMapFilters = (f: MapFilters) => writeLocal('mapFilters', f, filtersSchema)

// ---------- Report drafts (persisted so users don't lose work) ----------
export const loadDraft = <T,>(name: string, fallback: T): T => readLocal(`draft:${name}`, z.any(), fallback)
export const saveDraft = <T,>(name: string, value: T) => writeLocal(`draft:${name}`, value)
export const clearDraft = (name: string) => { try { localStorage.removeItem(key(`draft:${name}`)) } catch { /* ignore */ } }

// ---------- Multi-step form progress (sessionStorage) ----------
export const loadFormStep = (name: string): number => readSession(`step:${name}`, z.number(), 0)
export const saveFormStep = (name: string, step: number) => writeSession(`step:${name}`, step, z.number())

// ---------- Online detection ----------
export function onOnlineChange(cb: (online: boolean) => void): () => void {
  const up = () => cb(true), down = () => cb(false)
  window.addEventListener('online', up)
  window.addEventListener('offline', down)
  return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
}
