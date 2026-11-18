import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { dataProvider } from '../services/providers'
import type { Session, Profile } from '../types'
import { createGuestSession, getGuestSession, endGuestSession, type GuestSession } from '../services/guest'

type AuthKind = 'none' | 'user' | 'guest'

interface AuthState {
  session: Session | null
  profile: Profile | null
  guestSession: GuestSession | null
  authKind: AuthKind          // 'user' = registered session, 'guest' = guest session, 'none'
  isGuest: boolean
  isAdmin: boolean
  loading: boolean
  logout: () => Promise<void>
  loginAsGuest: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  session: null, profile: null, guestSession: null, authKind: 'none', isGuest: false, isAdmin: false,
  loading: true, logout: async () => {}, loginAsGuest: () => {}, refreshProfile: async () => {}
})

export const useAuth = () => useContext(AuthContext)

/**
 * Existing registered-user auth is unchanged. Guest sessions run in parallel:
 * a guest is NOT an authenticated user — `isGuest` gates the UI, and
 * `RequireRole` treats guests like signed-out visitors for restricted routes.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [guestSession, setGuestSession] = useState<GuestSession | null>(() => getGuestSession())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        await dataProvider.ensureAdminUser()
        const s = await dataProvider.getSession()
        if (!mounted) return
        setSession(s)
        if (s) setProfile(await dataProvider.getProfile(s.user.id))
      } catch (err) {
        console.error('Auth init failed', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()
    const unsub = dataProvider.onAuthChange(async (s) => {
      setSession(s)
      if (s) setProfile(await dataProvider.getProfile(s.user.id).catch(() => null))
      else setProfile(null)
    })
    return () => { mounted = false; unsub() }
  }, [])

  // Periodically expire stale guest sessions while the tab is open
  useEffect(() => {
    const t = setInterval(() => {
      const current = getGuestSession()
      setGuestSession(current)
    }, 60_000)
    return () => clearInterval(t)
  }, [])

  const authKind: AuthKind = session ? 'user' : guestSession ? 'guest' : 'none'

  const logout = async () => {
    if (session) {
      await dataProvider.logout()
      setSession(null); setProfile(null)
    } else if (guestSession) {
      endGuestSession()
      setGuestSession(null)
    }
  }

  const loginAsGuest = () => {
    // A registered session always wins; guest login replaces a previous guest session.
    if (session) return
    setGuestSession(createGuestSession())
  }

  const refreshProfile = async () => {
    if (session) setProfile(await dataProvider.getProfile(session.user.id).catch(() => null))
  }

  return (
    <AuthContext.Provider value={{
      session, profile, guestSession, authKind,
      isGuest: !session && !!guestSession,
      isAdmin: profile?.role === 'admin',
      loading, logout, loginAsGuest, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}
