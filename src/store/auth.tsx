import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { dataProvider } from '../services/providers'
import type { Session, Profile } from '../types'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  session: null, profile: null, loading: true, isAdmin: false,
  logout: async () => {}, refreshProfile: async () => {}
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
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

  const logout = async () => {
    await dataProvider.logout()
    setSession(null); setProfile(null)
  }

  const refreshProfile = async () => {
    if (session) setProfile(await dataProvider.getProfile(session.user.id).catch(() => null))
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, isAdmin: profile?.role === 'admin', logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
