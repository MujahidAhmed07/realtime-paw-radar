export type UserRole = 'user' | 'admin'
export type ReportStatus = 'active' | 'resolved' | 'reunited' | 'flagged' | 'archived'
export type ReportKind = 'missing' | 'found'
export type AnimalType = 'dog' | 'cat' | 'bird' | 'rabbit' | 'reptile' | 'other'
export type PetSize = 'small' | 'medium' | 'large'
export type PetGender = 'male' | 'female' | 'unknown'
export type FoundStatus = 'found' | 'spotted'
export type AnimalCondition = 'healthy' | 'injured' | 'scared' | 'hungry' | 'unknown'

export interface Profile {
  is_demo?: boolean
  id: string
  email: string
  full_name: string
  phone: string
  avatar_url: string | null
  role: UserRole
  bio: string | null
  address_hint: string | null
  location_lat: number | null
  location_lng: number | null
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  user_id: string
  nearby_missing_enabled: boolean
  nearby_found_enabled: boolean
  sighting_alerts_enabled: boolean
  message_alerts_enabled: boolean
  match_alerts_enabled: boolean
  status_change_alerts_enabled: boolean
  browser_push_enabled: boolean
  default_radius_km: 1 | 3 | 5 | 10
  updated_at: string
}

export interface PetReport {
  is_demo?: boolean
  id: string
  report_code: string
  kind: ReportKind
  status: ReportStatus
  owner_id: string | null
  reporter_id: string
  pet_name: string | null
  animal_type: AnimalType
  breed: string | null
  gender: PetGender
  age_estimate: string | null
  color: string | null
  size: PetSize | null
  photos: string[]
  distinctive_features: string | null
  description: string | null
  latitude: number
  longitude: number
  location_name: string | null
  radius_km: 1 | 3 | 5 | 10
  event_time: string
  found_status: FoundStatus | null
  animal_condition: AnimalCondition | null
  contact_preference: 'platform' | 'phone' | 'email'
  contact_value: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface PetSighting {
  is_demo?: boolean
  id: string
  report_id: string
  reporter_id: string
  latitude: number
  longitude: number
  location_name: string | null
  photos: string[]
  notes: string
  seen_at: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type:
    | 'nearby_missing'
    | 'nearby_found'
    | 'new_sighting'
    | 'new_message'
    | 'ai_match'
    | 'status_change'
    | 'reunited'
  title: string
  body: string
  data: Record<string, unknown>
  read: boolean
  created_at: string
}

export interface Conversation {
  id: string
  report_id: string
  participant_a: string
  participant_b: string
  last_message_at: string | null
  last_message_preview: string | null
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  read_at: string | null
  created_at: string
}

export interface SavedReport {
  id: string
  user_id: string
  report_id: string
  created_at: string
}

export interface ReportFlag {
  id: string
  report_id: string
  reporter_id: string
  reason: string
  details: string | null
  status: 'open' | 'reviewed' | 'dismissed'
  created_at: string
}

export interface AIMatchResult {
  id: string
  missing_report_id: string
  found_report_id: string
  similarity: number
  method: string
  status: 'suggested' | 'confirmed' | 'rejected'
  created_at: string
}

export interface UserLocation {
  user_id: string
  latitude: number
  longitude: number
  updated_at: string
}

export interface AuthUser {
  id: string
  email: string
  email_confirmed: boolean
}

export interface Session {
  user: AuthUser
}

export interface Stats {
  total_users: number
  active_missing: number
  active_found: number
  reunited: number
  recent_sightings: number
  open_flags: number
  reports_last_7d: number
}

export interface NearbyQuery {
  latitude: number
  longitude: number
  radius_km: number
  kind?: ReportKind
  animal_type?: AnimalType
  status?: ReportStatus
  search?: string
}

export interface DataProvider {
  readonly mode: 'supabase' | 'local'

  // Auth
  register(email: string, password: string, fullName: string): Promise<{ needsEmailConfirmation: boolean }>
  login(email: string, password: string): Promise<void>
  logout(): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  updatePassword(newPassword: string): Promise<void>
  getSession(): Promise<Session | null>
  onAuthChange(cb: (session: Session | null) => void): () => void

  // Profiles
  getProfile(userId: string): Promise<Profile | null>
  updateProfile(userId: string, patch: Partial<Profile>): Promise<Profile>
  ensureAdminUser(): Promise<void>
  listProfiles(): Promise<Profile[]>
  setUserRole(userId: string, role: UserRole): Promise<void>
  deleteUser(userId: string): Promise<void>

  // Notification preferences
  getNotificationPrefs(userId: string): Promise<NotificationPreferences>
  updateNotificationPrefs(userId: string, patch: Partial<NotificationPreferences>): Promise<NotificationPreferences>

  // Reports
  createReport(input: Partial<PetReport> & { kind: ReportKind; reporter_id: string }): Promise<PetReport>
  getReport(id: string): Promise<PetReport | null>
  listReports(filter?: { kind?: ReportKind; status?: ReportStatus; reporter_id?: string; owner_id?: string; limit?: number }): Promise<PetReport[]>
  updateReport(id: string, patch: Partial<PetReport>): Promise<PetReport>
  searchNearby(q: NearbyQuery): Promise<PetReport[]>

  // Sightings
  createSighting(input: Omit<PetSighting, 'id' | 'created_at'>): Promise<PetSighting>
  listSightings(reportId: string): Promise<PetSighting[]>
  listSightingsByReporter(reporterId: string): Promise<(PetSighting & { report?: PetReport })[]>

  // Notifications
  createNotification(n: Omit<Notification, 'id' | 'created_at' | 'read'>): Promise<Notification>
  listNotifications(userId: string): Promise<Notification[]>
  markNotificationRead(id: string, read: boolean): Promise<void>
  markAllNotificationsRead(userId: string): Promise<void>
  deleteNotification(id: string): Promise<void>
  unreadCount(userId: string): Promise<number>

  // Messaging
  getOrCreateConversation(reportId: string, userA: string, userB: string): Promise<Conversation>
  listConversations(userId: string): Promise<(Conversation & { other: Profile | null; report: PetReport | null })[]>
  listMessages(conversationId: string): Promise<Message[]>
  sendMessage(conversationId: string, senderId: string, body: string): Promise<Message>
  markConversationRead(conversationId: string, userId: string): Promise<void>
  getConversation(id: string): Promise<Conversation | null>

  // Saved reports
  toggleSaved(userId: string, reportId: string): Promise<boolean>
  isSaved(userId: string, reportId: string): Promise<boolean>
  listSaved(userId: string): Promise<PetReport[]>

  // Flags
  createFlag(input: Omit<ReportFlag, 'id' | 'created_at' | 'status'>): Promise<ReportFlag>
  listFlags(): Promise<(ReportFlag & { report?: PetReport | null })[]>
  updateFlagStatus(id: string, status: ReportFlag['status']): Promise<void>

  // User locations (privacy-conscious: only stored when user opts in)
  updateLocation(userId: string, lat: number, lng: number): Promise<void>
  getLocation(userId: string): Promise<UserLocation | null>

  // Storage (photos)
  uploadPhotos(userId: string, files: File[]): Promise<string[]>

  // Admin
  getStats(): Promise<Stats>

  // Realtime
  subscribe(topic: 'reports' | 'notifications' | 'messages', cb: (payload: unknown) => void): () => void
}
