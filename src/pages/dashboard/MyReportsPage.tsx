import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Clock, CheckCircle2, Archive, Pencil, Home } from 'lucide-react'
import { dataProvider } from '../../services/providers'
import type { PetReport, PetSighting } from '../../types'
import { useAuth } from '../../store/auth'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Badge, KindBadge, StatusBadge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Dialog } from '../../components/ui/Dialog'
import { SightingForm } from '../../components/pets/SightingForm'
import { ReportForm } from '../../components/pets/ReportForm'
import { PhotoGrid } from '../../components/pets/Photo'
import { animalEmoji, timeAgo } from '../../lib/utils'

export function MyReportsPage() {
  const { session } = useAuth()
  const { push } = useToast()
  const [reports, setReports] = useState<PetReport[] | null>(null)
  const [sightings, setSightings] = useState<Record<string, PetSighting[]>>({})
  const [sightingFor, setSightingFor] = useState<PetReport | null>(null)

  const load = async () => {
    if (!session) return
    const all = await dataProvider.listReports({ reporter_id: session.user.id })
    setReports(all)
    const s: Record<string, PetSighting[]> = {}
    for (const r of all) s[r.id] = await dataProvider.listSightings(r.id)
    setSightings(s)
  }
  useEffect(() => { load() }, [session])

  const setStatus = async (r: PetReport, status: PetReport['status']) => {
    try {
      await dataProvider.updateReport(r.id, { status })
      push('success', 'Report updated', `${r.report_code} is now ${status}.`)
      load()
    } catch (e) { push('error', 'Update failed', (e as Error).message) }
  }

  if (!reports) return <div className="skeleton h-64 w-full" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>My Reports</h1>
        <Link to="/dashboard/report-lost" className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary-700">+ New report</Link>
      </div>

      {reports.length === 0 ? (
        <EmptyState icon={<MapPin className="h-10 w-10" />} title="You haven't reported anything yet"
          description="Report a lost pet to alert neighbors, or a found pet to help someone."
          action={<Link to="/dashboard/report-lost" className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white">Report lost pet</Link>} />
      ) : (
        <div className="space-y-4">
          {reports.map(r => (
            <div key={r.id} className="card-surface overflow-hidden">
              <div className="flex flex-col gap-4 p-4 sm:flex-row">
                <Link to={`/pet/${r.id}`} className="sm:w-40 sm:shrink-0"><PhotoGrid photos={r.photos} alt={r.pet_name ?? 'report'} className="h-28 sm:h-24 rounded-xl" /></Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <KindBadge kind={r.kind} />
                    <StatusBadge status={r.status} />
                    <Badge>{r.report_code}</Badge>
                  </div>
                  <p className="mt-2 font-semibold">{animalEmoji[r.animal_type] ?? '🐾'} {r.pet_name ?? r.animal_type} <span className="font-normal text-muted-foreground">· {r.breed ?? r.animal_type}</span></p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {r.location_name ?? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`} · radius {r.radius_km} km
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Reported {timeAgo(r.created_at)} · {sightings[r.id]?.length ?? 0} sighting(s)</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSightingFor(r)}>+ Sighting</Button>
                    {r.status === 'active' && (
                      <>
                        <Button size="sm" variant="success" onClick={() => setStatus(r, 'reunited')}><Home className="h-3.5 w-3.5" /> Mark reunited</Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus(r, 'resolved')}><CheckCircle2 className="h-3.5 w-3.5" /> Resolve</Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus(r, 'archived')}><Archive className="h-3.5 w-3.5" /> Archive</Button>
                      </>
                    )}
                    {['resolved', 'reunited', 'archived'].includes(r.status) && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(r, 'active')}><Pencil className="h-3.5 w-3.5" /> Reactivate</Button>
                    )}
                  </div>
                </div>
                {sightings[r.id]?.length > 0 && (
                  <div className="w-full space-y-2 sm:w-72">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent sightings</p>
                    {sightings[r.id].slice(0, 2).map(s => (
                      <div key={s.id} className="rounded-lg bg-muted p-2.5 text-xs dark:bg-dark-bg">
                        <p className="font-medium">{timeAgo(s.created_at)} · {s.location_name ?? `${s.latitude.toFixed(3)}, ${s.longitude.toFixed(3)}`}</p>
                        {s.notes && <p className="mt-0.5 line-clamp-2 text-muted-foreground">{s.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!sightingFor} onClose={() => setSightingFor(null)} title="Add a sighting">
        {sightingFor && <SightingForm reportId={sightingFor.id} onDone={() => { setSightingFor(null); load() }} />}
      </Dialog>
    </div>
  )
}

export function MyPetsPage() {
  const { session } = useAuth()
  const [reports, setReports] = useState<PetReport[] | null>(null)

  useEffect(() => {
    if (!session) return
    dataProvider.listReports({ owner_id: session.user.id }).then(setReports)
  }, [session])

  if (!reports) return <div className="skeleton h-64 w-full" />
  const unique = new Map<string, PetReport>()
  for (const r of reports) {
    const key = r.pet_name ?? r.id
    if (!unique.has(key)) unique.set(key, r)
  }

  return (
    <div className="space-y-6">
      <h1>My Pets</h1>
      {unique.size === 0 ? (
        <EmptyState icon="🐾" title="No pets registered"
          description="Pets appear here from your missing reports. Report a lost pet to register it."
          action={<Link to="/dashboard/report-lost" className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white">Report lost pet</Link>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[...unique.values()].map(r => (
            <Link key={r.id} to={`/pet/${r.id}`} className="card-surface overflow-hidden transition hover:shadow-card-hover">
              <PhotoGrid photos={r.photos} alt={r.pet_name ?? 'pet'} className="h-40" />
              <div className="p-4">
                <p className="font-semibold">{animalEmoji[r.animal_type] ?? '🐾'} {r.pet_name ?? r.animal_type}</p>
                <p className="text-sm text-muted-foreground">{r.breed ?? r.animal_type} · {r.color ?? '—'} · {r.size ?? '—'}</p>
                <div className="mt-2"><StatusBadge status={r.status} /></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function ReportLostPage() {
  return (
    <div>
      <h1>Report a Lost Pet</h1>
      <p className="mt-1 mb-6 text-muted-foreground">Fill in the details — nearby users will be alerted instantly when you publish.</p>
      <ReportFormWrapper kind="missing" />
    </div>
  )
}

export function ReportFoundPage() {
  return (
    <div>
      <h1>Report a Found Pet</h1>
      <p className="mt-1 mb-6 text-muted-foreground">Found or spotted an animal? Report it — we'll notify the owner and nearby users.</p>
      <ReportFormWrapper kind="found" />
    </div>
  )
}

function ReportFormWrapper({ kind }: { kind: 'missing' | 'found' }) {
  return <ReportForm kind={kind} />
}
