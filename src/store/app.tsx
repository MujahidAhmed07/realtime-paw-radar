import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { dataProvider } from '../services/providers'
import { useAuth } from './auth'
import { loadTheme, saveTheme, onOnlineChange } from '../services/storage'
import { applyTheme } from '../lib/utils'
import type { Notification } from '../types'

interface AppState {
  notifications: Notification[]
  unread: number
  online: boolean
  theme: 'light' | 'dark' | 'system'
  setTheme: (t: 'light' | 'dark' | 'system') => void
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  removeNotification: (id: string) => Promise<void>
  refreshNotifications: () => Promise<void>
}

const AppContext = createContext<AppState>({} as AppState)
export const useApp = () => useContext(AppContext)

export function AppProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [online, setOnline] = useState(navigator.onLine)
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(loadTheme().theme)

  const setTheme = useCallback((t: 'light' | 'dark' | 'system') => {
    saveTheme({ theme: t })
    applyTheme(t)
    setThemeState(t)
  }, [])

  const refreshNotifications = useCallback(async () => {
    if (!session) { setNotifications([]); setUnread(0); return }
    const list = await dataProvider.listNotifications(session.user.id)
    setNotifications(list)
    setUnread(list.filter(n => !n.read).length)
  }, [session])

  useEffect(() => { refreshNotifications() }, [refreshNotifications])

  // Realtime notifications (cross-user / cross-device / cross-tab)
  useEffect(() => {
    if (!session) return
    const unsub = dataProvider.subscribe('notifications', () => { refreshNotifications() })
    return unsub
  }, [session, refreshNotifications])

  useEffect(() => onOnlineChange(setOnline), [])

  const markRead = useCallback(async (id: string) => {
    await dataProvider.markNotificationRead(id, true)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(u => Math.max(0, u - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    if (!session) return
    await dataProvider.markAllNotificationsRead(session.user.id)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
  }, [session])

  const removeNotification = useCallback(async (id: string) => {
    await dataProvider.deleteNotification(id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    setUnread(u => { const n = notifications.find(x => x.id === id); return n && !n.read ? Math.max(0, u - 1) : u })
  }, [notifications])

  return (
    <AppContext.Provider value={{ notifications, unread, online, theme, setTheme, markRead, markAllRead, removeNotification, refreshNotifications }}>
      {children}
    </AppContext.Provider>
  )
}
