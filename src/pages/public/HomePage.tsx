import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, Bell, MessageCircle, PawPrint, ArrowRight, ShieldCheck, Zap } from 'lucide-react'
import { dataProvider } from '../../services/providers'
import type { PetReport } from '../../types'
import { PetCard } from '../../components/pets/PetCard'
import { PetCardSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAuth } from '../../store/auth'
import { usingLocalBackend } from '../../services/providers'

export function HomePage() {
  const [recent, setRecent] = useState<PetReport[] | null>(null)
  const { session } = useAuth()

  useEffect(() => {
    dataProvider.listReports({ status: 'active', limit: 6 })
      .then(setRecent)
      .catch(() => setRecent([]))
  }, [])

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-white">
        <div className="absolute inset-0 opacity-10" aria-hidden>
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-accent blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-secondary blur-3xl" />
        </div>
        <div className="container-page relative grid gap-10 py-20 lg:grid-cols-2 lg:py-28">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
              <Zap className="h-4 w-4 text-accent" /> Real-time location alerts
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Lost a pet? <span className="text-accent">Thousands of neighbors</span> can know in seconds.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-primary-100">
              PetAlert broadcasts missing-pet reports to users near the last-seen location, instantly.
              People nearby get alerted, submit sightings, and message you directly — so your pet comes home faster.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={session ? '/dashboard/report-lost' : '/register'}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-accent-foreground transition hover:bg-accent-600">
                <PawPrint className="h-5 w-5" /> Report a Lost Pet
              </Link>
              <Link to="/map" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 font-semibold transition hover:bg-white/10">
                <MapPin className="h-5 w-5" /> Open Live Map
              </Link>
            </div>
          </div>
          <div className="hidden items-center justify-center lg:flex">
            <div className="card-surface w-full max-w-md rotate-2 p-6 text-foreground shadow-card-hover transition hover:rotate-0 dark:bg-dark-card">
              <div className="flex items-center gap-3 border-b border-border pb-4 dark:border-dark-border">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive-50 text-2xl">🐕</span>
                <div>
                  <p className="font-semibold">Max is missing!</p>
                  <p className="text-xs text-muted-foreground">Golden Retriever · 800 m from you</p>
                </div>
              </div>
              <div className="space-y-3 py-4 text-sm">
                <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-warning-600" /> Nearby users alerted instantly</div>
                <div className="flex items-center gap-2"><Search className="h-4 w-4 text-secondary-600" /> Sightings with photos & GPS</div>
                <div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-accent-600" /> Private chat with the finder</div>
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success-600" /> Your contact info stays private</div>
              </div>
              <div className="rounded-xl bg-success-50 px-4 py-3 text-sm font-medium text-success-700">
                🎉 “A neighbor spotted Max 20 minutes after the alert — reunited the same evening.”
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works strip */}
      <section className="container-page grid gap-4 py-12 md:grid-cols-3">
        {[
          { icon: PawPrint, title: '1. Report', text: 'Submit a missing or found pet report with photos, details and last-seen location.' },
          { icon: Bell, title: '2. Alert', text: 'Users near the location are notified in real time based on their chosen alert radius.' },
          { icon: MessageCircle, title: '3. Reunite', text: 'Finders submit sightings and message the owner privately. Mark the pet as reunited.' }
        ].map(s => (
          <div key={s.title} className="card-surface p-6">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary-50 text-secondary"><s.icon className="h-5 w-5" /></span>
            <h3>{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </section>

      {/* Recent reports */}
      <section className="container-page pb-16">
        <div className="mb-5 flex items-center justify-between">
          <h2>Latest active reports</h2>
          <Link to="/missing" className="inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {recent === null ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <PetCardSkeleton key={i} />)}</div>
        ) : recent.length === 0 ? (
          <EmptyState icon={<PawPrint className="h-10 w-10" />} title="No active reports yet"
            description="Be the first to help — or report a lost pet and neighbors near you will be alerted."
            action={<Link to={session ? '/dashboard/report-lost' : '/register'} className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white">Report a pet</Link>} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map(r => <PetCard key={r.id} report={r} />)}
          </div>
        )}
      </section>

      {usingLocalBackend && (
        <div className="container-page pb-8">
          <div className="rounded-xl border border-secondary-600/30 bg-secondary-50 px-4 py-3 text-sm text-secondary-700">
            <strong>Development mode:</strong> no Supabase credentials detected, so PetAlert is running on the built-in local backend
            (IndexedDB persistence + BroadcastChannel realtime). Open a second browser tab or window and everything syncs in real time.
            Demo admin: <code>admin@petalert.local</code> / <code>Admin1234!</code>. See README for production setup.
          </div>
        </div>
      )}
    </>
  )
}
