import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, PawPrint, MapPinned, HeartHandshake, Eye, Flag, TrendingUp, ShieldCheck, Trash2, Ban, CheckCheck } from 'lucide-react'
import { dataProvider } from '../../services/providers'
import type { Stats, Profile, PetReport, ReportFlag, AIMatchResult } from '../../types'
import { useAuth } from '../../store/auth'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Badge, KindBadge, StatusBadge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Select } from '../../components/ui'
import { timeAgo, animalEmoji } from '../../lib/utils'

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: number | string; color: string }) {
  return (
    <div className="card-surface flex items-center gap-4 p-5">
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}><Icon className="h-6 w-6" /></span>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => { dataProvider.getStats().then(setStats).catch(console.error) }, [])
  if (!stats) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-28" />)}</div>
  return (
    <div className="space-y-6">
      <h1>Admin Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={stats.total_users} color="bg-secondary-50 text-secondary-700" />
        <StatCard icon={PawPrint} label="Active missing" value={stats.active_missing} color="bg-destructive-50 text-destructive-700" />
        <StatCard icon={MapPinned} label="Active found" value={stats.active_found} color="bg-accent-50 text-accent-700" />
        <StatCard icon={HeartHandshake} label="Reunited pets" value={stats.reunited} color="bg-success-50 text-success-700" />
        <StatCard icon={Eye} label="Sightings (7 days)" value={stats.recent_sightings} color="bg-warning-50 text-warning-700" />
        <StatCard icon={Flag} label="Open flags" value={stats.open_flags} color="bg-destructive-50 text-destructive-700" />
        <StatCard icon={TrendingUp} label="Reports (7 days)" value={stats.reports_last_7d} color="bg-secondary-50 text-secondary-700" />
        <StatCard icon={ShieldCheck} label="Platform status" value="Healthy" color="bg-success-50 text-success-700" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Link to="/admin/reports" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Manage reports</Link>
        <Link to="/admin/moderation" className="rounded-lg border border-input px-4 py-2 text-sm font-semibold hover:bg-muted">Moderation queue {stats.open_flags > 0 && <span className="ml-1 rounded-full bg-destructive px-2 text-white">{stats.open_flags}</span>}</Link>
        <Link to="/admin/users" className="rounded-lg border border-input px-4 py-2 text-sm font-semibold hover:bg-muted">User management</Link>
      </div>
    </div>
  )
}

export function AdminUsersPage() {
  const { session } = useAuth()
  const { push } = useToast()
  const [users, setUsers] = useState<Profile[]>([])
  useEffect(() => { dataProvider.listProfiles().then(setUsers).catch(console.error) }, [])

  const changeRole = async (u: Profile, role: Profile['role']) => {
    try {
      await dataProvider.setUserRole(u.id, role)
      push('success', 'Role updated', `${u.full_name} is now ${role}.`)
      setUsers(prev => prev.map(p => p.id === u.id ? { ...p, role } : p))
    } catch (e) { push('error', 'Failed', (e as Error).message) }
  }

  const removeUser = async (u: Profile) => {
    if (!window.confirm(`Delete ${u.full_name}? This cannot be undone.`)) return
    try {
      await dataProvider.deleteUser(u.id)
      push('success', 'User deleted')
      setUsers(prev => prev.filter(p => p.id !== u.id))
    } catch (e) { push('error', 'Failed', (e as Error).message) }
  }

  return (
    <div className="space-y-6">
      <h1>User Management</h1>
      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground dark:border-dark-border">
            <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-border last:border-0 dark:border-dark-border">
                <td className="px-4 py-3 font-medium">{u.full_name}{u.id === session?.user.id && <span className="ml-1 text-xs text-secondary">(you)</span>}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <Select value={u.role} onChange={e => changeRole(u, e.target.value as Profile['role'])} className="w-28" aria-label={`Role for ${u.full_name}`}>
                    <option value="user">user</option><option value="admin">admin</option>
                  </Select>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{timeAgo(u.created_at)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{u.location_lat != null ? `${u.location_lat.toFixed(2)}, ${u.location_lng?.toFixed(2)}` : '—'}</td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="icon" aria-label="Delete user" disabled={u.id === session?.user.id} onClick={() => removeUser(u)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminReportsPage() {
  const { push } = useToast()
  const [reports, setReports] = useState<PetReport[] | null>(null)
  const [filter, setFilter] = useState('all')
  useEffect(() => { dataProvider.listReports().then(setReports).catch(console.error) }, [])

  const setStatus = async (r: PetReport, status: PetReport['status']) => {
    try {
      await dataProvider.updateReport(r.id, { status })
      push('success', 'Updated', `${r.report_code} → ${status}`)
      setReports(prev => prev ? prev.map(p => p.id === r.id ? { ...p, status } : p) : prev)
    } catch (e) { push('error', 'Failed', (e as Error).message) }
  }

  if (!reports) return <div className="skeleton h-96 w-full" />
  const visible = reports.filter(r => filter === 'all' || r.status === filter)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Pet Report Management</h1>
        <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-44" aria-label="Filter by status">
          <option value="all">All statuses</option><option value="active">Active</option><option value="flagged">Flagged</option>
          <option value="reunited">Reunited</option><option value="resolved">Resolved</option><option value="archived">Archived</option>
        </Select>
      </div>
      {visible.length === 0 ? <EmptyState title="No reports match" /> : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground dark:border-dark-border">
              <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Pet</th><th className="px-4 py-3">Kind</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Actions</th></tr>
            </thead>
            <tbody>
              {visible.map(r => (
                <tr key={r.id} className="border-b border-border last:border-0 dark:border-dark-border">
                  <td className="px-4 py-3"><Link to={`/pet/${r.id}`} className="font-semibold text-secondary hover:underline">{r.report_code}</Link></td>
                  <td className="px-4 py-3">{animalEmoji[r.animal_type] ?? '🐾'} {r.pet_name ?? r.animal_type}{r.breed && <span className="text-muted-foreground"> · {r.breed}</span>}</td>
                  <td className="px-4 py-3"><KindBadge kind={r.kind} /></td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{timeAgo(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {r.status !== 'active' && <Button size="sm" variant="outline" onClick={() => setStatus(r, 'active')}>Activate</Button>}
                      {r.status === 'active' && <Button size="sm" variant="outline" onClick={() => setStatus(r, 'archived')}>Archive</Button>}
                      {r.status !== 'reunited' && <Button size="sm" variant="success" onClick={() => setStatus(r, 'reunited')}>Reunited</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function AdminModerationPage() {
  const { push } = useToast()
  const [flags, setFlags] = useState<(ReportFlag & { report?: PetReport | null })[]>([])
  const load = () => dataProvider.listFlags().then(setFlags).catch(console.error)
  useEffect(() => { load() }, [])

  const act = async (f: ReportFlag, status: ReportFlag['status']) => {
    try {
      await dataProvider.updateFlagStatus(f.id, status)
      push('success', status === 'dismissed' ? 'Flag dismissed — report reactivated' : 'Flag reviewed')
      load()
    } catch (e) { push('error', 'Failed', (e as Error).message) }
  }

  return (
    <div className="space-y-6">
      <h1>Report Moderation</h1>
      {flags.length === 0 ? (
        <EmptyState icon={<CheckCheck className="h-10 w-10" />} title="Moderation queue is empty" description="No reports have been flagged by users." />
      ) : (
        <ul className="space-y-3">
          {flags.map(f => (
            <li key={f.id} className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">{f.reason} {f.status !== 'open' && <Badge variant={f.status === 'reviewed' ? 'success' : 'default'}>{f.status}</Badge>}</p>
                <p className="text-sm text-muted-foreground">
                  {f.report ? <>Report <Link className="text-secondary hover:underline" to={`/pet/${f.report.id}`}>{f.report.report_code}</Link> · </> : ''}
                  Flagged {timeAgo(f.created_at)}
                </p>
              </div>
              {f.status === 'open' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="success" onClick={() => act(f, 'reviewed')}>Mark reviewed</Button>
                  <Button size="sm" variant="outline" onClick={() => act(f, 'dismissed')}>Dismiss &amp; reactivate</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AdminSuspiciousPage() {
  const [reports, setReports] = useState<PetReport[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  useEffect(() => {
    dataProvider.listReports().then(setReports).catch(console.error)
    dataProvider.listProfiles().then(setUsers).catch(console.error)
  }, [])

  // Heuristics for suspicious activity (no AI dependency)
  const suspiciousReports = reports.filter(r => r.status === 'flagged' || (!r.photos.length && r.description && r.description.length < 10))
  const now = Date.now()
  const perUser = new Map<string, number>()
  for (const r of reports) if (now - new Date(r.created_at).getTime() < 3600e3) perUser.set(r.reporter_id, (perUser.get(r.reporter_id) ?? 0) + 1)
  const hyperactiveUsers = users.filter(u => (perUser.get(u.id) ?? 0) >= 5)

  return (
    <div className="space-y-6">
      <h1>Suspicious Activity</h1>
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Flag className="h-5 w-5 text-destructive" /> Flagged / low-quality reports ({suspiciousReports.length})</h2>
        {suspiciousReports.length === 0 ? <EmptyState title="Nothing suspicious detected" /> : (
          <ul className="space-y-2">
            {suspiciousReports.map(r => (
              <li key={r.id} className="card-surface flex items-center justify-between gap-3 p-4">
                <div>
                  <Link to={`/pet/${r.id}`} className="font-semibold text-secondary hover:underline">{r.report_code}</Link>
                  <p className="text-sm text-muted-foreground">{r.status === 'flagged' ? 'User-flagged' : 'No photos, very short description'} · {timeAgo(r.created_at)}</p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Ban className="h-5 w-5 text-warning-600" /> High-frequency submitters (&ge;5 reports in the last hour)</h2>
        {hyperactiveUsers.length === 0 ? <EmptyState title="No abnormal submission rates" /> : (
          <ul className="space-y-2">
            {hyperactiveUsers.map(u => (
              <li key={u.id} className="card-surface flex items-center justify-between p-4">
                <p className="font-medium">{u.full_name} <span className="text-sm text-muted-foreground">({u.email})</span></p>
                <Badge variant="warning">{perUser.get(u.id)} reports/hour</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [reports, setReports] = useState<PetReport[]>([])
  const [matches, setMatches] = useState<AIMatchResult[]>([])
  useEffect(() => {
    dataProvider.getStats().then(setStats).catch(console.error)
    dataProvider.listReports().then(setReports).catch(console.error)
    const dp = dataProvider as unknown as { listMatches?: () => Promise<AIMatchResult[]> }
    dp.listMatches?.().then(setMatches).catch(() => { /* matches only in local mode */ })
  }, [])

  if (!stats) return <div className="skeleton h-96 w-full" />
  const total = reports.length || 1
  const byType = ['dog', 'cat', 'bird', 'rabbit', 'reptile', 'other'].map(t => ({ t, n: reports.filter(r => r.animal_type === t).length })).sort((a, b) => b.n - a.n)
  const maxN = Math.max(1, ...byType.map(b => b.n))
  const reunionRate = Math.round((stats.reunited / total) * 100)

  return (
    <div className="space-y-6">
      <h1>Platform Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-5">
          <p className="text-sm text-muted-foreground">Reunited pets</p>
          <p className="mt-1 text-3xl font-bold text-success-600">{stats.reunited}</p>
          <p className="text-xs text-muted-foreground">{reunionRate}% of all reports</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-sm text-muted-foreground">Sightings last 7 days</p>
          <p className="mt-1 text-3xl font-bold text-warning-600">{stats.recent_sightings}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-sm text-muted-foreground">New reports last 7 days</p>
          <p className="mt-1 text-3xl font-bold text-secondary">{stats.reports_last_7d}</p>
        </div>
      </div>

      <div className="card-surface p-5">
        <h2 className="text-lg font-semibold">Reports by animal type</h2>
        <div className="mt-4 space-y-2">
          {byType.map(({ t, n }) => (
            <div key={t} className="flex items-center gap-3">
              <span className="w-20 text-sm capitalize">{animalEmoji[t]} {t}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-secondary" style={{ width: `${(n / maxN) * 100}%` }} />
              </div>
              <span className="w-8 text-right text-sm font-semibold">{n}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-surface p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold">AI match suggestions</h2>
        <p className="mt-1 text-sm text-muted-foreground">Suggestions only — never automatic identity decisions. (AI service integration is future-ready.)</p>
        {matches.length === 0
          ? <p className="mt-3 text-sm text-muted-foreground">No match suggestions recorded yet. They are generated when a found report closely resembles an active missing report.</p>
          : (
            <ul className="mt-3 space-y-2">
              {matches.map(m => (
                <li key={m.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm dark:border-dark-border">
                  <span>Missing <b>{m.missing_report_id.slice(0, 8)}</b> ↔ Found <b>{m.found_report_id.slice(0, 8)}</b> <span className="text-muted-foreground">({m.method})</span></span>
                  <Badge variant="accent">{Math.round(m.similarity * 100)}%</Badge>
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  )
}
