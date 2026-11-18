import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PawPrint, FilePlus2, MapPin, Bell, MessageCircle, Heart, Eye, CheckCircle2, UserRound, Sparkles, Info } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { dataProvider } from '../../services/providers'
import { useAuth } from '../../store/auth'
import type { PetReport } from '../../types'
import { PetCard } from '../../components/pets/PetCard'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Dialog } from '../../components/ui/Dialog'
import { SightingForm } from '../../components/pets/SightingForm'

export function DashboardPage() {
  const { isGuest } = useAuth()
  if (isGuest) return <GuestDashboard />
  return <UserDashboard />
}

function pinIcon(kind: string) {
  return L.divIcon({ className: 'pet-marker', html: `<div class="pet-marker-pin ${kind === 'missing' ? 'pet-marker-missing' : 'pet-marker-found'}"><span>🐾</span></div>`, iconSize: [40, 40], iconAnchor: [20, 40] })
}

/** Guest view — extends the dashboard concept without duplicating the user dashboard. */
function GuestDashboard() {
  const [stats, setStats] = useState({ missing: 0, found: 0, reunited: 0 })
  const [recent, setRecent] = useState<PetReport[]>([])

  useEffect(() => {
    Promise.all([
      dataProvider.listReports({ kind: 'missing', status: 'active' }),
      dataProvider.listReports({ kind: 'found', status: 'active' }),
      dataProvider.listReports({ status: 'reunited' }),
      dataProvider.listReports({ status: 'active', limit: 6 })
    ]).then(([missing, found, reunited, recentReports]) => {
      setStats({ missing: missing.length, found: found.length, reunited: reunited.length })
      setRecent(recentReports)
    }).catch(console.error)
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1>Welcome to PetAlert <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2.5 py-0.5 align-middle text-xs font-semibold text-accent-700 dark:bg-accent-700/30 dark:text-accent-100"><UserRound className="h-3 w-3" /> Guest Mode</span></h1>
        <p className="mt-1 text-muted-foreground">Explore missing and found pets around you — no account needed to browse.</p>
      </div>

      {/* Guest banner */}
      <div className="rounded-2xl border border-accent-500/30 bg-accent-50 p-5 dark:bg-accent-700/15">
        <p className="flex items-start gap-2 text-sm text-accent-700 dark:text-accent-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          You're exploring PetAlert as a guest. Create a free account to report missing pets, submit sightings, and help reunite pets with their families.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/register" className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary-700"><Sparkles className="h-4 w-4" /> Create Free Account</Link>
          <Link to="/how-it-works" className="inline-flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-semibold hover:bg-muted dark:hover:bg-dark-card">How PetAlert works</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-5"><p className="text-3xl font-bold text-destructive-600">{stats.missing}</p><p className="text-sm text-muted-foreground">Active missing reports</p></div>
        <div className="card-surface p-5"><p className="text-3xl font-bold text-success-600">{stats.found}</p><p className="text-sm text-muted-foreground">Active found reports</p></div>
        <div className="card-surface p-5"><p className="text-3xl font-bold text-primary">{stats.reunited}</p><p className="text-sm text-muted-foreground">Pets reunited</p></div>
      </div>

      {/* Live map preview */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Live pet map</h2>
        <div className="card-surface overflow-hidden">
          <MapContainer center={[3.139, 101.6869]} zoom={11} className="h-80 w-full" scrollWheelZoom>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {recent.filter(r => !r.is_demo).slice(0, 50).map(r => (
              <Marker key={r.id} position={[r.latitude, r.longitude]} icon={pinIcon(r.kind)}>
                <Popup><Link to={`/pet/${r.id}`} className="font-semibold text-secondary">{r.pet_name ?? r.report_code}</Link></Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </section>

      {/* Recent reports */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recently reported pets</h2>
          <Link to="/missing" className="text-sm font-semibold text-secondary hover:underline">View all missing →</Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={<PawPrint className="h-10 w-10" />} title="No active reports yet" description="Check back soon." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {recent.map(r => <PetCard key={r.id} report={r} />)}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="card-surface p-6">
        <h2 className="text-lg font-semibold">How PetAlert works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ['1. Report', 'Owners publish missing pets with photos and last-seen location.'],
            ['2. Alert', 'Neighbors within the alert radius are notified in real time.'],
            ['3. Reunite', 'Finders submit sightings and chat with the owner privately.']
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl bg-muted p-4 dark:bg-dark-bg">
              <p className="font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function UserDashboard() {
  const { session } = useAuth()
  const [myReports, setMyReports] = useState<PetReport[]>([])
  const [sightingsCount, setSightingsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sightingFor, setSightingFor] = useState<PetReport | null>(null)

  useEffect(() => {
    if (!session) return
    Promise.all([
      dataProvider.listReports({ reporter_id: session.user.id, status: 'active' }),
      dataProvider.listSightingsByReporter(session.user.id)
    ]).then(([reports, sightings]) => {
      setMyReports(reports)
      setSightingsCount(sightings.length)
    }).finally(() => setLoading(false))
  }, [session])

  const cards = [
    { to: '/dashboard/report-lost', icon: PawPrint, label: 'Report Lost Pet', desc: 'Alert neighbors near you', color: 'bg-destructive-50 text-destructive-700' },
    { to: '/dashboard/report-found', icon: Eye, label: 'Report Found Pet', desc: 'Help someone else\'s pet', color: 'bg-success-50 text-success-700' },
    { to: '/dashboard/my-reports', icon: FilePlus2, label: 'My Reports', desc: 'Manage and resolve', color: 'bg-secondary-50 text-secondary-700' },
    { to: '/dashboard/nearby', icon: MapPin, label: 'Nearby Alerts', desc: 'Pets near your location', color: 'bg-accent-50 text-accent-700' },
    { to: '/dashboard/notifications', icon: Bell, label: 'Notifications', desc: 'Real-time updates', color: 'bg-warning-50 text-warning-700' },
    { to: '/dashboard/messages', icon: MessageCircle, label: 'Messages', desc: 'Chat with finders/owners', color: 'bg-secondary-50 text-secondary-700' },
    { to: '/dashboard/saved', icon: Heart, label: 'Saved Reports', desc: 'Your bookmarked reports', color: 'bg-destructive-50 text-destructive-700' },
    { to: '/dashboard/profile', icon: CheckCircle2, label: 'Profile Settings', desc: 'Location & preferences', color: 'bg-muted text-muted-foreground' }
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1>Welcome back 👋</h1>
        <p className="mt-1 text-muted-foreground">Here's what's happening with your reports and nearby pets.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(c => (
          <Link key={c.to} to={c.to} className="card-surface flex items-center gap-4 p-4 transition hover:shadow-card-hover">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.color}`}><c.icon className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{c.label}</p>
              <p className="truncate text-xs text-muted-foreground">{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2>Your active reports ({myReports.length})</h2>
          <Link to="/dashboard/my-reports" className="text-sm font-semibold text-secondary hover:underline">Manage all</Link>
        </div>
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-64" />)}</div>
        ) : myReports.length === 0 ? (
          <EmptyState icon={<PawPrint className="h-10 w-10" />} title="No active reports"
            description="When you report a lost or found pet it will appear here with sightings and messages."
            action={<Link to="/dashboard/report-lost" className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white">Report a pet</Link>} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {myReports.slice(0, 3).map(r => (
              <div key={r.id}>
                <PetCard report={r} />
                <Button variant="accent" className="mt-2 w-full" onClick={() => setSightingFor(r)}>+ Add sighting I observed</Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card-surface p-5">
        <h3 className="flex items-center gap-2"><Eye className="h-4 w-4 text-secondary" /> Sightings you've submitted</h3>
        <p className="mt-1 text-sm text-muted-foreground">You've helped the community with {sightingsCount} sighting{sightingsCount === 1 ? '' : 's'}. Thank you! 🐾</p>
      </section>

      <Dialog open={!!sightingFor} onClose={() => setSightingFor(null)} title={`Add sighting — ${sightingFor?.pet_name ?? sightingFor?.report_code ?? ''}`}>
        {sightingFor && <SightingForm reportId={sightingFor.id} onDone={() => { setSightingFor(null); }} />}
      </Dialog>
    </div>
  )
}
