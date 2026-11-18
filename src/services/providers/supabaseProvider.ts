import { getSupabase } from '../supabase/client'
import type { DataProvider, Session, Profile, NotificationPreferences, PetReport, PetSighting, Notification, Conversation, Message, ReportFlag, Stats, UserRole, NearbyQuery } from '../../types'

/**
 * Production DataProvider backed by Supabase (Auth, Postgres+PostGIS, Storage, Realtime).
 * All authorization is enforced server-side by RLS policies (see supabase/migrations).
 * The anon key is safe for frontend use — the service-role key must NEVER appear here.
 */

function s() {
  const c = getSupabase()
  if (!c) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  return c
}

const ts = () => new Date().toISOString()
function unwrap<T>(res: unknown): T {
  const r = res as { data: T | null; error: { message: string } | null }
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}

export class SupabaseProvider implements DataProvider {
  readonly mode = 'supabase' as const

  // ---------- Auth ----------
  async register(email: string, password: string, fullName: string) {
    const res = await s().auth.signUp({ email, password, options: { data: { full_name: fullName } } })
    if (res.error) throw new Error(res.error.message)
    return { needsEmailConfirmation: !res.data.session }
  }
  async login(email: string, password: string) {
    const { error } = await s().auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }
  async logout() { await s().auth.signOut() }
  async requestPasswordReset(email: string) {
    const { error } = await s().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-confirm` })
    if (error) throw new Error(error.message)
  }
  async updatePassword(newPassword: string) {
    const { error } = await s().auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)
  }
  async getSession(): Promise<Session | null> {
    const { data } = await s().auth.getSession()
    if (!data.session?.user) return null
    return { user: { id: data.session.user.id, email: data.session.user.email ?? '', email_confirmed: !!data.session.user.email_confirmed_at } }
  }
  onAuthChange(cb: (session: Session | null) => void) {
    const { data } = s().auth.onAuthStateChange((_event, session) => {
      cb(session?.user ? { user: { id: session.user.id, email: session.user.email ?? '', email_confirmed: !!session.user.email_confirmed_at } } : null)
    })
    return () => data.subscription.unsubscribe()
  }

  // ---------- Profiles ----------
  async getProfile(userId: string) {
    const { data } = await s().from('profiles').select('*').eq('id', userId).maybeSingle()
    return (data as Profile) ?? null
  }
  async updateProfile(userId: string, patch: Partial<Profile>) {
    return unwrap(s().from('profiles').update({ ...patch, updated_at: ts() }).eq('id', userId).select().single()) as Promise<Profile>
  }
  async ensureAdminUser() { /* handled by SQL seed */ }
  async listProfiles() {
    // RLS: only admins may select other users' profiles
    return unwrap(s().from('profiles').select('*').order('created_at', { ascending: false })) as Promise<Profile[]>
  }
  async setUserRole(userId: string, role: UserRole) {
    // RLS: only admins; role changes enforced by is_admin() SQL function
    await unwrap(s().rpc('set_user_role', { target_user: userId, new_role: role }))
  }
  async deleteUser(userId: string) { await unwrap(s().rpc('admin_delete_user', { target_user: userId })) }

  // ---------- Notification preferences ----------
  async getNotificationPrefs(userId: string) {
    const { data } = await s().from('notification_preferences').select('*').eq('user_id', userId).maybeSingle()
    if (data) return data as NotificationPreferences
    const defaults: NotificationPreferences = {
      user_id: userId, nearby_missing_enabled: true, nearby_found_enabled: true, sighting_alerts_enabled: true,
      message_alerts_enabled: true, match_alerts_enabled: true, status_change_alerts_enabled: true,
      browser_push_enabled: false, default_radius_km: 5, updated_at: ts()
    }
    return unwrap(s().from('notification_preferences').insert(defaults).select().single()) as Promise<NotificationPreferences>
  }
  async updateNotificationPrefs(userId: string, patch: Partial<NotificationPreferences>) {
    return unwrap(s().from('notification_preferences').update({ ...patch, updated_at: ts() }).eq('user_id', userId).select().single()) as Promise<NotificationPreferences>
  }

  // ---------- Reports ----------
  async createReport(input: Partial<PetReport> & { kind: PetReport['kind']; reporter_id: string }) {
    const { reporter_id, ...rest } = input
    return unwrap(s().from('pet_reports').insert({ ...rest, reporter_id, status: 'active' }).select().single()) as Promise<PetReport>
    // Nearby fan-out + notifications are done server-side by the database trigger (handle_new_nearby_alerts)
  }
  async getReport(id: string) {
    const { data } = await s().from('pet_reports').select('*').eq('id', id).maybeSingle()
    return (data as PetReport) ?? null
  }
  async listReports(filter: { kind?: PetReport['kind']; status?: PetReport['status']; reporter_id?: string; owner_id?: string; limit?: number } = {}) {
    let q = s().from('pet_reports').select('*').order('created_at', { ascending: false })
    if (filter.kind) q = q.eq('kind', filter.kind)
    if (filter.status) q = q.eq('status', filter.status)
    if (filter.reporter_id) q = q.eq('reporter_id', filter.reporter_id)
    if (filter.owner_id) q = q.eq('owner_id', filter.owner_id)
    if (filter.limit) q = q.limit(filter.limit)
    return unwrap(q) as Promise<PetReport[]>
  }
  async updateReport(id: string, patch: Partial<PetReport>) {
    return unwrap(s().from('pet_reports').update({ ...patch, updated_at: ts() }).eq('id', id).select().single()) as Promise<PetReport>
  }
  async searchNearby(q: NearbyQuery) {
    // Uses PostGIS function created in migrations for index-accelerated radius search
    const { data, error } = await s().rpc('search_reports_near', {
      lat: q.latitude, lng: q.longitude, radius_m: q.radius_km * 1000,
      p_kind: q.kind ?? null, p_animal_type: q.animal_type ?? null, p_status: q.status ?? null, p_search: q.search ?? null
    })
    if (error) throw new Error(error.message)
    return (data as PetReport[]) ?? []
  }

  // ---------- Sightings ----------
  async createSighting(input: Omit<PetSighting, 'id' | 'created_at'>) {
    const { id: _omit, created_at: _omit2, ...rest } = input as PetSighting
    return unwrap(s().from('pet_sightings').insert(rest).select().single()) as Promise<PetSighting>
  }
  async listSightings(reportId: string) {
    return unwrap(s().from('pet_sightings').select('*').eq('report_id', reportId).order('created_at', { ascending: false })) as Promise<PetSighting[]>
  }
  async listSightingsByReporter(reporterId: string) {
    return unwrap(s().from('pet_sightings').select('*, report:pet_reports(*)').eq('reporter_id', reporterId).order('created_at', { ascending: false })) as Promise<(PetSighting & { report?: PetReport })[]>
  }

  // ---------- Notifications ----------
  async createNotification(n: Omit<Notification, 'id' | 'created_at' | 'read'>) {
    return unwrap(s().from('notifications').insert(n).select().single()) as Promise<Notification>
  }
  async listNotifications(userId: string) {
    return unwrap(s().from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)) as Promise<Notification[]>
  }
  async markNotificationRead(id: string, read: boolean) { await unwrap(s().from('notifications').update({ read }).eq('id', id).select()) }
  async markAllNotificationsRead(userId: string) { await unwrap(s().from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false).select()) }
  async deleteNotification(id: string) { await unwrap(s().from('notifications').delete().eq('id', id)) }
  async unreadCount(userId: string) {
    const { count } = await s().from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('read', false)
    return count ?? 0
  }

  // ---------- Messaging ----------
  async getOrCreateConversation(reportId: string, userA: string, userB: string) {
    if (userA === userB) throw new Error('Cannot start a conversation with yourself')
    const { data } = await s().rpc('get_or_create_conversation', { p_report_id: reportId, p_user_a: userA, p_user_b: userB })
    return data as Conversation
  }
  async getConversation(id: string) {
    const { data } = await s().from('conversations').select('*').eq('id', id).maybeSingle()
    return (data as Conversation) ?? null
  }
  async listConversations(userId: string) {
    const convs = await unwrap(s().from('conversations').select('*').or(`participant_a.eq.${userId},participant_b.eq.${userId}`).order('last_message_at', { ascending: false, nullsFirst: false })) as Conversation[]
    const out: (Conversation & { other: Profile | null; report: PetReport | null })[] = []
    for (const c of convs) {
      const otherId = c.participant_a === userId ? c.participant_b : c.participant_a
      const [other, report] = await Promise.all([this.getProfile(otherId), this.getReport(c.report_id)])
      out.push({ ...c, other, report })
    }
    return out
  }
  async listMessages(conversationId: string) {
    return unwrap(s().from('messages').select('*').eq('conversation_id', conversationId).order('created_at')) as Promise<Message[]>
  }
  async sendMessage(conversationId: string, senderId: string, body: string) {
    return unwrap(s().from('messages').insert({ conversation_id: conversationId, sender_id: senderId, body: body.trim().slice(0, 2000) }).select().single()) as Promise<Message>
  }
  async markConversationRead(conversationId: string, userId: string) {
    await unwrap(s().from('messages').update({ read_at: ts() }).eq('conversation_id', conversationId).neq('sender_id', userId).is('read_at', null).select())
  }

  // ---------- Saved reports ----------
  async toggleSaved(userId: string, reportId: string) {
    const { data } = await s().from('saved_reports').select('id').eq('user_id', userId).eq('report_id', reportId).maybeSingle()
    if (data) { await unwrap(s().from('saved_reports').delete().eq('id', (data as { id: string }).id)); return false }
    await unwrap(s().from('saved_reports').insert({ user_id: userId, report_id: reportId }))
    return true
  }
  async isSaved(userId: string, reportId: string) {
    const { data } = await s().from('saved_reports').select('id').eq('user_id', userId).eq('report_id', reportId).maybeSingle()
    return !!data
  }
  async listSaved(userId: string) {
    const rows = await unwrap(s().from('saved_reports').select('report:pet_reports(*)').eq('user_id', userId).order('created_at', { ascending: false })) as { report: PetReport | null }[]
    return rows.map(r => r.report).filter((r): r is PetReport => !!r)
  }

  // ---------- Flags ----------
  async createFlag(input: Omit<ReportFlag, 'id' | 'created_at' | 'status'>) {
    return unwrap(s().from('report_flags').insert(input).select().single()) as Promise<ReportFlag>
  }
  async listFlags() {
    return unwrap(s().from('report_flags').select('*, report:pet_reports(*)').order('created_at', { ascending: false })) as Promise<(ReportFlag & { report?: PetReport | null })[]>
  }
  async updateFlagStatus(id: string, status: ReportFlag['status']) {
    await unwrap(s().from('report_flags').update({ status }).eq('id', id).select())
  }

  // ---------- Locations ----------
  async updateLocation(userId: string, lat: number, lng: number) {
    await unwrap(s().from('user_locations').upsert({ user_id: userId, location: `POINT(${lng} ${lat})`, updated_at: ts() }))
    await this.updateProfile(userId, { location_lat: lat, location_lng: lng })
  }
  async getLocation(userId: string) {
    const { data } = await s().from('user_locations').select('*').eq('user_id', userId).maybeSingle()
    if (!data) return null
    const row = data as { user_id: string; location: string; updated_at: string }
    const match = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(row.location)
    if (!match) return null
    return { user_id: row.user_id, longitude: parseFloat(match[1]), latitude: parseFloat(match[2]), updated_at: row.updated_at }
  }

  // ---------- Storage ----------
  async uploadPhotos(userId: string, files: File[]) {
    const urls: string[] = []
    for (const file of files.slice(0, 6)) {
      if (!file.type.startsWith('image/')) throw new Error(`"${file.name}" is not an image`)
      if (file.size > 5 * 1024 * 1024) throw new Error(`"${file.name}" exceeds the 5 MB limit`)
      const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, '_')}`
      const { error } = await s().storage.from('pet-photos').upload(path, file, { contentType: file.type, upsert: false })
      if (error) throw new Error(error.message)
      urls.push(s().storage.from('pet-photos').getPublicUrl(path).data.publicUrl)
    }
    return urls
  }

  // ---------- Admin ----------
  async getStats(): Promise<Stats> {
    return unwrap(s().rpc('admin_stats')) as Promise<Stats>
  }

  // ---------- Realtime ----------
  subscribe(topic: 'reports' | 'notifications' | 'messages', cb: (payload: unknown) => void) {
    const c = s()
    if (topic === 'notifications') {
      // user-scoped channel; RLS filters rows server-side
      const ch = c.channel(`notifications:${crypto.randomUUID()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (p) => cb(p))
        .subscribe()
      return () => { c.removeChannel(ch) }
    }
    if (topic === 'messages') {
      const ch = c.channel(`messages:${crypto.randomUUID()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (p) => cb(p))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, (p) => cb(p))
        .subscribe()
      return () => { c.removeChannel(ch) }
    }
    const ch = c.channel(`reports:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pet_reports' }, (p) => cb(p))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pet_sightings' }, (p) => cb(p))
      .subscribe()
    return () => { c.removeChannel(ch) }
  }
}

export const supabaseProvider = new SupabaseProvider()
