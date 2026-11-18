import { openDB, type IDBPDatabase } from 'idb'
import type {
  DataProvider, Session, Profile, NotificationPreferences, PetReport, PetSighting,
  Notification, Conversation, Message, SavedReport, ReportFlag, Stats, UserRole,
  AIMatchResult, UserLocation, NearbyQuery
} from '../../types'

/**
 * Local development DataProvider.
 * Persistence: IndexedDB (structured data) — NOT localStorage.
 * Realtime: BroadcastChannel for same-browser cross-tab/cross-user broadcast.
 * Auth: session token stored in localStorage with expiry; passwords are
 * hashed with SHA-256 + salt (demo-grade, never plaintext). Production uses Supabase Auth.
 */

const DB_NAME = 'petalert'
const DB_VERSION = 3
const SESSION_KEY = 'petalert:session:v1'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days
const CHANNEL = 'petalert-realtime-v1'

interface LocalUser {
  id: string
  email: string
  password_hash: string
  salt: string
  email_confirmed: boolean
  created_at: string
}

let dbPromise: Promise<IDBPDatabase> | null = null
function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        // Dev backend: data is disposable — recreate all stores on any schema change.
        for (const name of Array.from(d.objectStoreNames)) d.deleteObjectStore(name)
        d.createObjectStore('users', { keyPath: 'id' }).createIndex('email', 'email', { unique: true })
        d.createObjectStore('profiles', { keyPath: 'id' })
        d.createObjectStore('prefs', { keyPath: 'user_id' })
        d.createObjectStore('locations', { keyPath: 'user_id' })
        d.createObjectStore('reports', { keyPath: 'id' }).createIndex('kind', 'kind')
        for (const s of ['sightings', 'notifications', 'messages', 'saved', 'flags', 'matches']) {
          const st = d.createObjectStore(s, { keyPath: 'id' })
          if (s === 'notifications') st.createIndex('user_id', 'user_id')
          if (s === 'messages') st.createIndex('conversation_id', 'conversation_id')
          if (s === 'saved') st.createIndex('user_id', 'user_id')
        }
        d.createObjectStore('conversations', { keyPath: 'id' })
        d.createObjectStore('blobs')
        d.createObjectStore('meta')
      }
    })
  }
  return dbPromise
}

const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()

async function sha256(text: string, salt: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

type Listener = (payload: unknown) => void
const listeners = new Map<string, Set<Listener>>()
let channel: BroadcastChannel | null = null
function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL)
    channel.onmessage = (e) => {
      const { topic, payload } = e.data as { topic: string; payload: unknown }
      listeners.get(topic)?.forEach(l => { try { l(payload) } catch { /* listener error */ } })
    }
  }
  return channel
}
function emit(topic: string, payload: unknown, crossTab = true) {
  listeners.get(topic)?.forEach(l => { try { l(payload) } catch { /* listener error */ } })
  if (crossTab) getChannel()?.postMessage({ topic, payload })
}

// ---------- session helpers (versioned, validated, expiring) ----------
interface StoredSession { v: 1; user: { id: string; email: string; email_confirmed: boolean }; expires_at: number }
function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as StoredSession
    if (s.v !== 1 || !s.user?.id || typeof s.expires_at !== 'number') { localStorage.removeItem(SESSION_KEY); return null }
    if (Date.now() > s.expires_at) { localStorage.removeItem(SESSION_KEY); return null }
    return s
  } catch { try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ } return null }
}
function writeSession(user: { id: string; email: string; email_confirmed: boolean }) {
  const s: StoredSession = { v: 1, user, expires_at: Date.now() + SESSION_TTL_MS }
  localStorage.setItem(SESSION_KEY, JSON.stringify(s))
}
function clearSession() { try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ } }

const authListeners = new Set<(s: Session | null) => void>()
function notifyAuth(session: Session | null) { authListeners.forEach(l => { try { l(session) } catch { /* ignore */ } }) }
window.addEventListener('storage', (e) => {
  if (e.key === SESSION_KEY) {
    const s = readSession()
    notifyAuth(s ? { user: s.user } : null)
  }
})

async function getAll<T>(store: string): Promise<T[]> { const d = await db(); return d.getAll(store) as Promise<T[]> }
async function put<T>(store: string, value: T): Promise<void> { const d = await db(); await d.put(store, value) }
async function del(store: string, key: string): Promise<void> { const d = await db(); await d.delete(store, key) }
async function get<T>(store: string, key: string): Promise<T | undefined> { const d = await db(); return d.get(store, key) as Promise<T | undefined> }

const defaultPrefs = (user_id: string): NotificationPreferences => ({
  user_id,
  nearby_missing_enabled: true,
  nearby_found_enabled: true,
  sighting_alerts_enabled: true,
  message_alerts_enabled: true,
  match_alerts_enabled: true,
  status_change_alerts_enabled: true,
  browser_push_enabled: false,
  default_radius_km: 5,
  updated_at: now()
})

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function reportCode(kind: string): string {
  const prefix = kind === 'missing' ? 'MIS' : 'FND'
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0')}`
}

// duplicate-submission protection: hash of recent submissions
const recentSubmissions = new Map<string, number>()
function isDuplicate(key: string): boolean {
  const t = recentSubmissions.get(key)
  if (t && Date.now() - t < 15000) return true
  recentSubmissions.set(key, Date.now())
  if (recentSubmissions.size > 100) for (const [k, v] of recentSubmissions) if (Date.now() - v > 60000) recentSubmissions.delete(k)
  return false
}

export class LocalProvider implements DataProvider {
  readonly mode = 'local' as const

  // ---------- Auth ----------
  async register(email: string, password: string, fullName: string) {
    email = email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Invalid email address')
    if (password.length < 8) throw new Error('Password must be at least 8 characters')
    const users = await getAll<LocalUser>('users')
    if (users.some(u => u.email === email)) throw new Error('An account with this email already exists')
    const salt = uid()
    const user: LocalUser = { id: uid(), email, password_hash: await sha256(password, salt), salt, email_confirmed: true, created_at: now() }
    await put('users', user)
    const profile: Profile = {
      id: user.id, email, full_name: fullName.trim() || email.split('@')[0], phone: '', avatar_url: null,
      role: 'user', bio: null, address_hint: null, location_lat: null, location_lng: null, created_at: user.created_at, updated_at: now()
    }
    await put('profiles', profile)
    await put('prefs', defaultPrefs(user.id))
    writeSession({ id: user.id, email, email_confirmed: true })
    notifyAuth({ user: { id: user.id, email, email_confirmed: true } })
    return { needsEmailConfirmation: false }
  }

  async login(email: string, password: string) {
    email = email.trim().toLowerCase()
    const users = await getAll<LocalUser>('users')
    const user = users.find(u => u.email === email)
    if (!user) throw new Error('No account found with this email')
    const hash = await sha256(password, user.salt)
    if (hash !== user.password_hash) throw new Error('Incorrect password')
    writeSession({ id: user.id, email: user.email, email_confirmed: user.email_confirmed })
    notifyAuth({ user: { id: user.id, email: user.email, email_confirmed: user.email_confirmed } })
  }

  async logout() { clearSession(); notifyAuth(null) }

  async requestPasswordReset(email: string) {
    // Local mode: display a dev-only reset link flow via notification; Supabase sends a real email.
    const users = await getAll<LocalUser>('users')
    const user = users.find(u => u.email === email.trim().toLowerCase())
    if (!user) throw new Error('No account found with this email')
    const token = uid()
    await put('meta', { key: `reset:${token}`, value: { user_id: user.id, expires: Date.now() + 1000 * 60 * 30 } })
    window.prompt('Dev mode password reset — copy this token and paste it on the reset page:\n/reset-confirm?token=' + token, token)
  }

  async updatePassword(newPassword: string) {
    if (newPassword.length < 8) throw new Error('Password must be at least 8 characters')
    const s = readSession()
    if (!s) throw new Error('Not signed in')
    const user = await get<LocalUser>('users', s.user.id)
    if (!user) throw new Error('Account not found')
    user.salt = uid()
    user.password_hash = await sha256(newPassword, user.salt)
    await put('users', user)
  }

  async confirmReset(token: string, newPassword: string): Promise<void> {
    const rec = await get<{ key: string; value: { user_id: string; expires: number } }>('meta', `reset:${token}`)
    if (!rec || Date.now() > rec.value.expires) throw new Error('Reset link is invalid or expired')
    if (newPassword.length < 8) throw new Error('Password must be at least 8 characters')
    const user = await get<LocalUser>('users', rec.value.user_id)
    if (!user) throw new Error('Account not found')
    user.salt = uid()
    user.password_hash = await sha256(newPassword, user.salt)
    await put('users', user)
    await del('meta', `reset:${token}`)
  }

  async getSession(): Promise<Session | null> {
    const s = readSession()
    return s ? { user: s.user } : null
  }

  onAuthChange(cb: (session: Session | null) => void) {
    authListeners.add(cb)
    return () => authListeners.delete(cb)
  }

  // ---------- Profiles ----------
  async getProfile(userId: string) { return (await get<Profile>('profiles', userId)) ?? null }
  async updateProfile(userId: string, patch: Partial<Profile>) {
    const p = await get<Profile>('profiles', userId)
    if (!p) throw new Error('Profile not found')
    const updated = { ...p, ...patch, updated_at: now() }
    await put('profiles', updated)
    emit('profiles', { event: 'UPDATE', profile: updated })
    return updated
  }
  async ensureAdminUser() {
    const users = await getAll<LocalUser>('users')
    const profiles = await getAll<Profile>('profiles')
    const admin = profiles.find(p => p.role === 'admin')
    if (admin) return
    if (!users.some(u => u.email === 'admin@petalert.local')) {
      const salt = uid()
      const user: LocalUser = { id: uid(), email: 'admin@petalert.local', password_hash: await sha256('Admin1234!', salt), salt, email_confirmed: true, created_at: now() }
      await put('users', user)
      await put('profiles', { id: user.id, email: user.email, full_name: 'PetAlert Admin', phone: '', avatar_url: null, role: 'admin', bio: null, address_hint: null, location_lat: null, location_lng: null, created_at: now(), updated_at: now() } as Profile)
      await put('prefs', defaultPrefs(user.id))
    } else {
      const u = users.find(u => u.email === 'admin@petalert.local')!
      await put('profiles', { id: u.id, email: u.email, full_name: 'PetAlert Admin', phone: '', avatar_url: null, role: 'admin', bio: null, address_hint: null, location_lat: null, location_lng: null, created_at: now(), updated_at: now() } as Profile)
    }
  }
  async listProfiles() { return getAll<Profile>('profiles') }
  async setUserRole(userId: string, role: UserRole) { await this.updateProfile(userId, { role }) }
  async deleteUser(userId: string) {
    const s = readSession()
    if (s?.user.id === userId) throw new Error('You cannot delete your own account here')
    await del('profiles', userId); await del('prefs', userId); await del('locations', userId)
    const users = await getAll<LocalUser>('users')
    const u = users.find(x => x.id === userId)
    if (u) await del('users', u.id)
  }

  // ---------- Notification preferences ----------
  async getNotificationPrefs(userId: string) {
    return (await get<NotificationPreferences>('prefs', userId)) ?? defaultPrefs(userId)
  }
  async updateNotificationPrefs(userId: string, patch: Partial<NotificationPreferences>) {
    const cur = await this.getNotificationPrefs(userId)
    const updated = { ...cur, ...patch, updated_at: now() }
    await put('prefs', updated)
    return updated
  }

  // ---------- Reports ----------
  async createReport(input: Partial<PetReport> & { kind: PetReport['kind']; reporter_id: string }) {
    if (isDuplicate(`${input.reporter_id}:${input.kind}:${input.latitude?.toFixed(3)}:${input.longitude?.toFixed(3)}:${input.pet_name ?? ''}`)) {
      throw new Error('Duplicate submission detected — please wait a moment before retrying')
    }
    const report: PetReport = {
      id: uid(),
      report_code: reportCode(input.kind),
      status: 'active',
      owner_id: input.kind === 'missing' ? input.reporter_id : null,
      photos: [],
      radius_km: 5,
      contact_preference: 'platform',
      gender: 'unknown',
      created_at: now(),
      updated_at: now(),
      resolved_at: null,
      ...input,
    } as PetReport
    await put('reports', report)
    emit('reports', { event: 'INSERT', report })
    // Nearby user notifications
    await this._fanoutNearby(report)
    return report
  }

  private async _fanoutNearby(report: PetReport) {
    if (report.status !== 'active') return
    const profiles = await getAll<Profile>('profiles')
    const topic = report.kind === 'missing' ? 'nearby_missing_enabled' : 'nearby_found_enabled'
    for (const p of profiles) {
      if (p.id === report.reporter_id) continue
      if (p.location_lat == null || p.location_lng == null) continue
      const prefs = await this.getNotificationPrefs(p.id)
      if (!prefs[topic]) continue
      const d = haversineKm(p.location_lat, p.location_lng, report.latitude, report.longitude)
      if (d > prefs.default_radius_km) continue
      await this.createNotification({
        user_id: p.id,
        type: report.kind === 'missing' ? 'nearby_missing' : 'nearby_found',
        title: report.kind === 'missing' ? `🐾 Missing ${report.animal_type} nearby` : `🐾 Found ${report.animal_type} nearby`,
        body: report.kind === 'missing'
          ? `${report.pet_name ?? 'A pet'} was reported missing ~${d.toFixed(1)} km from you.`
          : `A ${report.animal_type} was reported found ~${d.toFixed(1)} km from you.`,
        data: { report_id: report.id, distance_km: Math.round(d * 10) / 10 }
      })
    }
    // AI match suggestion (cosine over simple text-feature vector — placeholder for CLIP embeddings)
    if (report.kind === 'found') await this._suggestMatches(report)
  }

  async getReport(id: string) { return (await get<PetReport>('reports', id)) ?? null }
  async listReports(filter: { kind?: PetReport['kind']; status?: PetReport['status']; reporter_id?: string; owner_id?: string; limit?: number } = {}) {
    let reports = await getAll<PetReport>('reports')
    if (filter.kind) reports = reports.filter(r => r.kind === filter.kind)
    if (filter.status) reports = reports.filter(r => r.status === filter.status)
    if (filter.reporter_id) reports = reports.filter(r => r.reporter_id === filter.reporter_id)
    if (filter.owner_id) reports = reports.filter(r => r.owner_id === filter.owner_id)
    reports.sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (filter.limit) reports = reports.slice(0, filter.limit)
    return reports
  }
  async updateReport(id: string, patch: Partial<PetReport>) {
    const r = await get<PetReport>('reports', id)
    if (!r) throw new Error('Report not found')
    const updated = { ...r, ...patch, updated_at: now() }
    if (patch.status && ['resolved', 'reunited', 'archived'].includes(patch.status) && !updated.resolved_at) updated.resolved_at = now()
    if (patch.status === 'active') updated.resolved_at = null
    await put('reports', updated)
    emit('reports', { event: 'UPDATE', report: updated })
    // Notify owner on status change / reunification
    if (patch.status && r.status !== patch.status && updated.owner_id && updated.owner_id !== r.reporter_id) {
      await this.createNotification({
        user_id: updated.owner_id, type: patch.status === 'reunited' ? 'reunited' : 'status_change',
        title: patch.status === 'reunited' ? '🎉 Reunited!' : 'Report status updated',
        body: patch.status === 'reunited' ? `Great news — a report has been marked as reunited.` : `Your report ${updated.report_code} is now "${patch.status}".`,
        data: { report_id: updated.id }
      })
    }
    if (patch.status === 'reunited' && updated.owner_id) {
      await this.createNotification({
        user_id: updated.owner_id, type: 'reunited', title: '🎉 Reunited!',
        body: `${updated.pet_name ?? 'Your pet'} is home! Mark this day as a happy one.`,
        data: { report_id: updated.id }
      })
    }
    return updated
  }
  async searchNearby(q: NearbyQuery) {
    let reports = await getAll<PetReport>('reports')
    if (q.kind) reports = reports.filter(r => r.kind === q.kind)
    if (q.animal_type) reports = reports.filter(r => r.animal_type === q.animal_type)
    if (q.status) reports = reports.filter(r => r.status === q.status)
    else reports = reports.filter(r => r.status !== 'archived')
    if (q.search) {
      const s = q.search.toLowerCase()
      reports = reports.filter(r =>
        (r.pet_name ?? '').toLowerCase().includes(s) ||
        (r.breed ?? '').toLowerCase().includes(s) ||
        r.animal_type.includes(s) ||
        (r.location_name ?? '').toLowerCase().includes(s) ||
        r.report_code.toLowerCase().includes(s))
    }
    return reports
      .map(r => ({ r, d: haversineKm(q.latitude, q.longitude, r.latitude, r.longitude) }))
      .filter(x => x.d <= q.radius_km)
      .sort((a, b) => a.d - b.d)
      .map(x => x.r)
  }

  // ---------- Sightings ----------
  async createSighting(input: Omit<PetSighting, 'id' | 'created_at'>) {
    if (isDuplicate(`${input.reporter_id}:sighting:${input.report_id}:${input.latitude?.toFixed(3)}:${input.longitude?.toFixed(3)}`)) {
      throw new Error('Duplicate sighting detected — please wait a moment before retrying')
    }
    const s: PetSighting = { id: uid(), created_at: now(), ...input }
    await put('sightings', s)
    const report = await this.getReport(input.report_id)
    emit('reports', { event: 'SIGHTING', sighting: s, report_id: input.report_id })
    if (report) {
      const target = report.owner_id ?? report.reporter_id
      if (target !== input.reporter_id) {
        await this.createNotification({
          user_id: target, type: 'new_sighting',
          title: `👀 New sighting for ${report.pet_name ?? report.report_code}`,
          body: input.notes.slice(0, 120) || 'Someone reported a sighting on your report.',
          data: { report_id: report.id, sighting_id: s.id, conversation_partner: input.reporter_id }
        })
      }
    }
    return s
  }
  async listSightings(reportId: string) {
    const all = await getAll<PetSighting>('sightings')
    return all.filter(s => s.report_id === reportId).sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  async listSightingsByReporter(reporterId: string) {
    const all = await getAll<PetSighting>('sightings')
    const mine = all.filter(s => s.reporter_id === reporterId).sort((a, b) => b.created_at.localeCompare(a.created_at))
    const result: (PetSighting & { report?: PetReport })[] = []
    for (const s of mine) result.push({ ...s, report: (await this.getReport(s.report_id)) ?? undefined })
    return result
  }

  // ---------- Notifications ----------
  async createNotification(n: Omit<Notification, 'id' | 'created_at' | 'read'>) {
    const notification: Notification = { id: uid(), read: false, created_at: now(), ...n }
    await put('notifications', notification)
    emit('notifications', { event: 'INSERT', notification })
    return notification
  }
  async listNotifications(userId: string) {
    const all = await getAll<Notification>('notifications')
    return all.filter(n => n.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  async markNotificationRead(id: string, read: boolean) {
    const n = await get<Notification>('notifications', id)
    if (n) { n.read = read; await put('notifications', n); emit('notifications', { event: 'UPDATE', notification: n }) }
  }
  async markAllNotificationsRead(userId: string) {
    const all = await getAll<Notification>('notifications')
    for (const n of all) if (n.user_id === userId && !n.read) { n.read = true; await put('notifications', n) }
    emit('notifications', { event: 'READ_ALL', user_id: userId })
  }
  async deleteNotification(id: string) { await del('notifications', id); emit('notifications', { event: 'DELETE', id }) }
  async unreadCount(userId: string) {
    return (await this.listNotifications(userId)).filter(n => !n.read).length
  }

  // ---------- Messaging ----------
  private convKey(a: string, b: string) { return [a, b].sort().join('::') }
  async getOrCreateConversation(reportId: string, userA: string, userB: string) {
    if (userA === userB) throw new Error('Cannot start a conversation with yourself')
    const all = await getAll<Conversation>('conversations')
    const existing = all.find(c => c.report_id === reportId && this.convKey(c.participant_a, c.participant_b) === this.convKey(userA, userB))
    if (existing) return existing
    const conv: Conversation = { id: uid(), report_id: reportId, participant_a: userA, participant_b: userB, last_message_at: null, last_message_preview: null, created_at: now() }
    await put('conversations', conv)
    emit('messages', { event: 'CONVERSATION', conversation: conv })
    return conv
  }
  async getConversation(id: string) { return (await get<Conversation>('conversations', id)) ?? null }
  async listConversations(userId: string) {
    const all = await getAll<Conversation>('conversations')
    const mine = all.filter(c => c.participant_a === userId || c.participant_b === userId)
      .sort((a, b) => (b.last_message_at ?? b.created_at).localeCompare(a.last_message_at ?? a.created_at))
    const out: (Conversation & { other: Profile | null; report: PetReport | null })[] = []
    for (const c of mine) {
      const otherId = c.participant_a === userId ? c.participant_b : c.participant_a
      out.push({ ...c, other: await this.getProfile(otherId), report: (await this.getReport(c.report_id)) ?? null })
    }
    return out
  }
  async listMessages(conversationId: string) {
    const all = await getAll<Message>('messages')
    return all.filter(m => m.conversation_id === conversationId).sort((a, b) => a.created_at.localeCompare(b.created_at))
  }
  async sendMessage(conversationId: string, senderId: string, body: string) {
    const conv = await this.getConversation(conversationId)
    if (!conv) throw new Error('Conversation not found')
    if (conv.participant_a !== senderId && conv.participant_b !== senderId) throw new Error('Not authorized for this conversation')
    const trimmed = body.trim().slice(0, 2000)
    if (!trimmed) throw new Error('Message cannot be empty')
    const msg: Message = { id: uid(), conversation_id: conversationId, sender_id: senderId, body: trimmed, read_at: null, created_at: now() }
    await put('messages', msg)
    conv.last_message_at = msg.created_at
    conv.last_message_preview = trimmed.slice(0, 80)
    await put('conversations', conv)
    emit('messages', { event: 'MESSAGE', message: msg, conversation_id: conversationId })
    const otherId = conv.participant_a === senderId ? conv.participant_b : conv.participant_a
    const sender = await this.getProfile(senderId)
    await this.createNotification({
      user_id: otherId, type: 'new_message',
      title: `💬 New message from ${sender?.full_name ?? 'a user'}`,
      body: trimmed.slice(0, 100),
      data: { conversation_id: conversationId, report_id: conv.report_id }
    })
    return msg
  }
  async markConversationRead(conversationId: string, userId: string) {
    const msgs = await this.listMessages(conversationId)
    for (const m of msgs) if (m.sender_id !== userId && !m.read_at) { m.read_at = now(); await put('messages', m) }
  }

  // ---------- Saved reports ----------
  async toggleSaved(userId: string, reportId: string) {
    const all = await getAll<SavedReport>('saved')
    const existing = all.find(s => s.user_id === userId && s.report_id === reportId)
    if (existing) { await del('saved', existing.id); return false }
    await put('saved', { id: uid(), user_id: userId, report_id: reportId, created_at: now() } as SavedReport)
    return true
  }
  async isSaved(userId: string, reportId: string) {
    const all = await getAll<SavedReport>('saved')
    return all.some(s => s.user_id === userId && s.report_id === reportId)
  }
  async listSaved(userId: string) {
    const all = await getAll<SavedReport>('saved')
    const mine = all.filter(s => s.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at))
    const out: PetReport[] = []
    for (const s of mine) { const r = await this.getReport(s.report_id); if (r) out.push(r) }
    return out
  }

  // ---------- Flags ----------
  async createFlag(input: Omit<ReportFlag, 'id' | 'created_at' | 'status'>) {
    const f: ReportFlag = { id: uid(), status: 'open', created_at: now(), ...input }
    await put('flags', f)
    await this.updateReport(input.report_id, { status: 'flagged' })
    // notify admins
    const admins = (await this.listProfiles()).filter(p => p.role === 'admin')
    for (const a of admins) {
      await this.createNotification({ user_id: a.id, type: 'status_change', title: '🚩 Report flagged', body: `Report was flagged: ${input.reason}`, data: { report_id: input.report_id, flag_id: f.id } })
    }
    return f
  }
  async listFlags() {
    const flags = await getAll<ReportFlag>('flags')
    flags.sort((a, b) => b.created_at.localeCompare(a.created_at))
    return flags.map(f => ({ ...f }))
  }
  async updateFlagStatus(id: string, status: ReportFlag['status']) {
    const f = await get<ReportFlag>('flags', id)
    if (f) {
      f.status = status
      await put('flags', f)
      if (status === 'dismissed') await this.updateReport(f.report_id, { status: 'active' })
    }
  }

  // ---------- Locations ----------
  async updateLocation(userId: string, lat: number, lng: number) {
    await put('locations', { user_id: userId, latitude: lat, longitude: lng, updated_at: now() } as UserLocation)
    await this.updateProfile(userId, { location_lat: lat, location_lng: lng })
  }
  async getLocation(userId: string) { return (await get<UserLocation>('locations', userId)) ?? null }

  // ---------- Storage ----------
  async uploadPhotos(userId: string, files: File[]) {
    const urls: string[] = []
    for (const file of files.slice(0, 6)) {
      if (!file.type.startsWith('image/')) throw new Error(`"${file.name}" is not an image`)
      if (file.size > 5 * 1024 * 1024) throw new Error(`"${file.name}" exceeds the 5 MB limit`)
      const key = `${userId}/${uid()}-${file.name.replace(/[^\w.\-]/g, '_')}`
      const d = await db()
      await d.put('blobs', file, key)
      urls.push(`idb://blobs/${key}`)
    }
    return urls
  }
  static async resolvePhotoUrl(url: string): Promise<string> {
    if (!url.startsWith('idb://')) return url
    const d = await db()
    const blob = (await d.get('blobs', url.slice('idb://blobs/'.length))) as File | undefined
    return blob ? URL.createObjectURL(blob) : ''
  }

  // ---------- Admin ----------
  async getStats(): Promise<Stats> {
    const [users, reports, sightings, flags] = await Promise.all([
      this.listProfiles(), getAll<PetReport>('reports'), getAll<PetSighting>('sightings'), getAll<ReportFlag>('flags')
    ])
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
    return {
      total_users: users.length,
      active_missing: reports.filter(r => r.kind === 'missing' && r.status === 'active').length,
      active_found: reports.filter(r => r.kind === 'found' && r.status === 'active').length,
      reunited: reports.filter(r => r.status === 'reunited').length,
      recent_sightings: sightings.filter(s => s.created_at >= weekAgo).length,
      open_flags: flags.filter(f => f.status === 'open').length,
      reports_last_7d: reports.filter(r => r.created_at >= weekAgo).length,
    }
  }

  // ---------- Realtime ----------
  subscribe(topic: 'reports' | 'notifications' | 'messages', cb: (payload: unknown) => void) {
    if (!listeners.has(topic)) listeners.set(topic, new Set())
    listeners.get(topic)!.add(cb)
    getChannel()
    return () => { listeners.get(topic)?.delete(cb) }
  }

  // ---------- AI match helper (simple feature-overlap placeholder) ----------
  private async _suggestMatches(found: PetReport) {
    const missing = await this.listReports({ kind: 'missing', status: 'active' })
    const matches: AIMatchResult[] = []
    for (const m of missing) {
      if (m.animal_type !== found.animal_type) continue
      let score = 0.4
      if (m.breed && found.breed && m.breed.toLowerCase() === found.breed.toLowerCase()) score += 0.25
      if (m.color && found.color && m.color.toLowerCase().includes(found.color.toLowerCase().split(' ')[0])) score += 0.2
      if (m.size && found.size && m.size === found.size) score += 0.1
      const d = haversineKm(m.latitude, m.longitude, found.latitude, found.longitude)
      if (d <= 15) score += 0.1
      if (score >= 0.65) {
        const rec: AIMatchResult = { id: uid(), missing_report_id: m.id, found_report_id: found.id, similarity: Math.min(0.99, score), method: 'feature-overlap-v0', status: 'suggested', created_at: now() }
        await put('matches', rec)
        matches.push(rec)
        const owner = m.owner_id ?? m.reporter_id
        await this.createNotification({
          user_id: owner, type: 'ai_match',
          title: '🤖 Possible match found',
          body: `A found ${found.animal_type} nearby looks similar to ${m.pet_name ?? 'your pet'} (${Math.round(rec.similarity * 100)}% similarity). Review it — AI suggestions are not proof of identity.`,
          data: { missing_report_id: m.id, found_report_id: found.id }
        })
      }
    }
    if (matches.length) emit('reports', { event: 'AI_MATCH', count: matches.length })
  }

  async listMatches(): Promise<AIMatchResult[]> { return getAll<AIMatchResult>('matches') }
}

export const localProvider = new LocalProvider()
