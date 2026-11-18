import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PawPrint, FilePlus2, MapPin, Bell, MessageCircle, Heart, Eye, CheckCircle2 } from 'lucide-react'
import { dataProvider } from '../../services/providers'
import { useAuth } from '../../store/auth'
import type { PetReport } from '../../types'
import { PetCard } from '../../components/pets/PetCard'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Dialog } from '../../components/ui/Dialog'
import { SightingForm } from '../../components/pets/SightingForm'

export function DashboardPage() {
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
