import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { PawPrint, Map, Bell, LayoutDashboard, Menu, X, LogOut, Shield, Sun, Moon, Monitor, WifiOff } from 'lucide-react'
import { useAuth } from '../../store/auth'
import { useApp } from '../../store/app'
import { cn } from '../../lib/cn'
import { initials } from '../../lib/utils'

const publicNav = [
  { to: '/', label: 'Home' },
  { to: '/map', label: 'Live Map', icon: Map },
  { to: '/missing', label: 'Missing Pets' },
  { to: '/found', label: 'Found Pets' },
  { to: '/about', label: 'About' },
  { to: '/how-it-works', label: 'How It Works' }
]

function ThemeToggle() {
  const { theme, setTheme } = useApp()
  const cycle = () => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')
  return (
    <button onClick={cycle} aria-label={`Theme: ${theme}`} title={`Theme: ${theme}`} className="rounded-lg p-2 hover:bg-muted dark:hover:bg-dark-card">
      {theme === 'light' ? <Sun className="h-5 w-5" /> : theme === 'dark' ? <Moon className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
    </button>
  )
}

export function Layout() {
  const { session, profile, isAdmin, logout } = useAuth()
  const { unread, online } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    setUserOpen(false)
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur dark:bg-dark-card/90 dark:border-dark-border">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-primary dark:text-dark-fg">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white"><PawPrint className="h-5 w-5" /></span>
            <span className="text-lg">PetAlert</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {publicNav.map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted dark:hover:bg-dark-card', isActive && 'bg-muted dark:bg-dark-card text-secondary')}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            {!online && (
              <span className="flex items-center gap-1 rounded-full bg-warning-50 px-2.5 py-1 text-xs font-semibold text-warning-700" title="You are offline">
                <WifiOff className="h-3.5 w-3.5" /> Offline
              </span>
            )}
            {session ? (
              <>
                <Link to="/dashboard/notifications" className="relative rounded-lg p-2 hover:bg-muted dark:hover:bg-dark-card" aria-label={`Notifications (${unread} unread)`}>
                  <Bell className="h-5 w-5" />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </Link>
                <Link to="/dashboard" className="hidden rounded-lg p-2 hover:bg-muted dark:hover:bg-dark-card sm:block" aria-label="Dashboard">
                  <LayoutDashboard className="h-5 w-5" />
                </Link>
                <div className="relative">
                  <button onClick={() => setUserOpen(o => !o)} className="flex items-center gap-2 rounded-full pl-1" aria-label="Account menu">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white">
                      {profile?.avatar_url
                        ? <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        : initials(profile?.full_name ?? '?')}
                    </span>
                  </button>
                  {userOpen && (
                    <div className="absolute right-0 top-11 w-56 card-surface animate-fade-in overflow-hidden">
                      <div className="border-b border-border px-4 py-3 dark:border-dark-border">
                        <p className="truncate text-sm font-semibold">{profile?.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
                      </div>
                      <div className="p-1.5">
                        <Link to="/dashboard" onClick={() => setUserOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted dark:hover:bg-dark-border"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
                        <Link to="/dashboard/profile" onClick={() => setUserOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted dark:hover:bg-dark-border"><Shield className="h-4 w-4" /> Profile Settings</Link>
                        {isAdmin && (
                          <Link to="/admin" onClick={() => setUserOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:bg-muted dark:hover:bg-dark-border"><Shield className="h-4 w-4" /> Admin Panel</Link>
                        )}
                        <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-muted dark:hover:bg-dark-border"><LogOut className="h-4 w-4" /> Sign out</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted dark:hover:bg-dark-card">Sign in</Link>
                <Link to="/register" className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary-700">Sign up</Link>
              </div>
            )}
            <button className="rounded-lg p-2 lg:hidden" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-border bg-card p-3 lg:hidden dark:border-dark-border dark:bg-dark-card" aria-label="Mobile navigation">
            <div className="flex flex-col gap-1">
              {publicNav.map(item => (
                <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => cn('rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted dark:hover:bg-dark-border', isActive && 'bg-muted text-secondary')}>
                  {item.label}
                </NavLink>
              ))}
              {!session && (
                <div className="mt-2 flex gap-2 border-t border-border pt-3 dark:border-dark-border">
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 rounded-lg border border-input px-3 py-2 text-center text-sm font-medium">Sign in</Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)} className="flex-1 rounded-lg bg-secondary px-3 py-2 text-center text-sm font-semibold text-white">Sign up</Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 animate-fade-in">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-card dark:border-dark-border dark:bg-dark-card">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <PawPrint className="h-4 w-4" />
            <span>© {new Date().getFullYear()} PetAlert — Reuniting pets with their families.</span>
          </div>
          <div className="flex gap-4">
            <Link to="/about" className="hover:text-foreground">About</Link>
            <Link to="/how-it-works" className="hover:text-foreground">How It Works</Link>
            <Link to="/map" className="hover:text-foreground">Live Map</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
