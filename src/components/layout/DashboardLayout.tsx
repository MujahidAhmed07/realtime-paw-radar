import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { useAuth } from '../../store/auth'
import { RegistrationPrompt } from '../ui/RegistrationPrompt'

const userLinks = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/dashboard/report-lost', label: 'Report Lost Pet' },
  { to: '/dashboard/report-found', label: 'Report Found Pet' },
  { to: '/dashboard/my-pets', label: 'My Pets' },
  { to: '/dashboard/my-reports', label: 'My Reports' },
  { to: '/dashboard/nearby', label: 'Nearby Alerts' },
  { to: '/dashboard/notifications', label: 'Notifications' },
  { to: '/dashboard/messages', label: 'Messages' },
  { to: '/dashboard/saved', label: 'Saved Reports' },
  { to: '/dashboard/profile', label: 'Profile Settings' }
]

const adminLinks = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'User Management' },
  { to: '/admin/reports', label: 'Report Management' },
  { to: '/admin/moderation', label: 'Report Moderation' },
  { to: '/admin/suspicious', label: 'Suspicious Activity' },
  { to: '/admin/analytics', label: 'Platform Analytics' }
]

export function DashboardLayout({ admin = false }: { admin?: boolean }) {
  const { isAdmin } = useAuth()
  const links = admin ? adminLinks : userLinks

  return (
    <div className="container-page py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-60 lg:shrink-0">
          <nav className="card-surface flex flex-row gap-1 overflow-x-auto p-2 lg:flex-col" aria-label="Dashboard navigation">
            {links.map(l => (
              <NavLink key={l.to} to={l.to} end={l.end}
                className={({ isActive }) => cn('whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted dark:hover:bg-dark-border',
                  isActive && 'bg-primary text-white hover:bg-primary-700')}>
                {l.label}
              </NavLink>
            ))}
            {!admin && isAdmin && (
              <NavLink to="/admin" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:bg-muted dark:hover:bg-dark-border">
                Admin Panel →
              </NavLink>
            )}
            {admin && (
              <NavLink to="/dashboard" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:bg-muted dark:hover:bg-dark-border">
                ← Back to Dashboard
              </NavLink>
            )}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export function RequireRole({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const { session, isGuest, loading, isAdmin } = useAuth()
  const location = useLocation()
  const [promptOpen, setPromptOpen] = useState(false)

  if (loading) return <div className="container-page py-16"><div className="skeleton h-64 w-full" /></div>

  // The dashboard root IS the guest experience — guests pass; all other routes gate.
  const isDashboardRoot = location.pathname === '/dashboard'
  if (!session) {
    if (isGuest && !admin && isDashboardRoot) return <>{children}</>

    // Guests: keep them on the page and show a non-destructive registration prompt.
    if (isGuest && !admin) {
      return (
        <>
          <div className="container-page py-16 text-center">
            <h1 className="text-2xl font-bold">{featureName(location.pathname)}</h1>
            <p className="mt-2 text-muted-foreground">This feature needs a free account.</p>
          </div>
          {promptOpen && <RegistrationPrompt onClose={() => setPromptOpen(false)} feature={featureName(location.pathname)} />}
        </>
      )
    }
    if (isGuest && admin) {
      return (
        <div className="container-page py-20 text-center">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="mt-2 text-muted-foreground">This area is restricted to registered administrators.</p>
          <Link to="/" className="mt-6 inline-block rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold text-white">Back to home</Link>
        </div>
      )
    }
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold">Sign in required</h1>
        <p className="mt-2 text-muted-foreground">Please sign in to access this page.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/login" className="rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold text-white hover:bg-secondary-700">Sign in</Link>
          <Link to="/register" className="rounded-lg border border-input px-5 py-2.5 text-sm font-semibold">Create account</Link>
        </div>
      </div>
    )
  }
  if (admin && !isAdmin) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="mt-2 text-muted-foreground">This area is restricted to administrators.</p>
        <Link to="/dashboard" className="mt-6 inline-block rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold text-white">Back to dashboard</Link>
      </div>
    )
  }
  return <>{children}</>
}

function featureName(path: string): string {
  const map: Record<string, string> = {
    '/dashboard/report-lost': 'Report a Lost Pet',
    '/dashboard/report-found': 'Report a Found Pet',
    '/dashboard/my-reports': 'Manage your reports',
    '/dashboard/my-pets': 'Your pets',
    '/dashboard/messages': 'Messaging',
    '/dashboard/notifications': 'Notifications',
    '/dashboard/saved': 'Saved reports',
    '/dashboard/profile': 'Profile settings'
  }
  return map[path] ?? 'This feature'
}
