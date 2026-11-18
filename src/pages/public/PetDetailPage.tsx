import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPin, MessageCircle, Flag, Heart, Share2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { dataProvider } from '../../services/providers'
import type { PetReport, PetSighting } from '../../types'
import { Photo } from '../../components/pets/Photo'
import { KindBadge, StatusBadge, Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../store/auth'
import { RegistrationPrompt } from '../../components/ui/RegistrationPrompt'
import { animalEmoji, timeAgo, formatDistance } from '../../lib/utils'
import { getPosition } from '../../services/location'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'

function makePin(colorClass: string, emoji: string) {
  return L.divIcon({ className: 'pet-marker', html: `<div class="pet-marker-pin ${colorClass}"><span>${emoji}</span></div>`, iconSize: [40, 40], iconAnchor: [20, 40] })
}

export function PetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { session, isGuest } = useAuth()
  const { push } = useToast()
  const [prompt, setPrompt] = useState<string | null>(null)
  const [report, setReport] = useState<PetReport | null>(null)
  const [sightings, setSightings] = useState<PetSighting[]>([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [flagOpen, setFlagOpen] = useState(false)
  const [flagReason, setFlagReason] = useState('Spam or fake report')
  const [myDistance, setMyDistance] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([dataProvider.getReport(id), dataProvider.listSightings(id)])
      .then(([r, s]) => { setReport(r); setSightings(s) })
      .finally(() => setLoading(false))
    if (session) dataProvider.isSaved(session.user.id, id).then(setSaved)
    getPosition().then(({ latitude, longitude }) => {
      if (!id) return
      dataProvider.getReport(id).then(r => {
        if (!r) return
        const R = 6371, toRad = (v: number) => v * Math.PI / 180
        const dLat = toRad(r.latitude - latitude), dLng = toRad(r.longitude - longitude)
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(latitude)) * Math.cos(toRad(r.latitude)) * Math.sin(dLng / 2) ** 2
        setMyDistance(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
      })
    }).catch(() => {})
  }, [id, session])

  if (loading) return <div className="container-page py-10"><div className="skeleton h-96 w-full" /></div>
  if (!report) {
    return <div className="container-page py-16"><EmptyState icon={<MapPin className="h-10 w-10" />} title="Report not found" description="This report may have been removed." action={<Link to="/" className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white">Go home</Link>} /></div>
  }

  const isOwner = session && (report.owner_id === session.user.id || report.reporter_id === session.user.id)

  const toggleSave = async () => {
    if (!session || !report) return
    setSaved(await dataProvider.toggleSaved(session.user.id, report.id))
  }

  const submitFlag = async () => {
    if (!session || !report) return
    try {
      await dataProvider.createFlag({ report_id: report.id, reporter_id: session.user.id, reason: flagReason, details: null })
      push('success', 'Report flagged', 'Our moderators will review it shortly.')
      setFlagOpen(false)
    } catch (e) { push('error', 'Could not flag report', (e as Error).message) }
  }

  const markerIcon = makePin(
    report.status === 'reunited' || report.status === 'resolved' ? 'pet-marker-reunited' : report.kind === 'missing' ? 'pet-marker-missing' : 'pet-marker-found',
    animalEmoji[report.animal_type] ?? '🐾')

  return (
    <div className="container-page py-8">
      <Link to={report.kind === 'missing' ? '/missing' : '/found'} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to {report.kind === 'missing' ? 'missing pets' : 'found pets'}
      </Link>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Photos */}
        <div className="lg:col-span-2">
          <div className="card-surface overflow-hidden">
            {report.photos.length
              ? <div className="grid grid-cols-2 gap-0.5">{report.photos.map((p, i) => <Photo key={i} src={p} alt={`${report.pet_name ?? 'Pet'} photo ${i + 1}`} className="h-56 w-full object-cover" />)}</div>
              : <div className="flex h-64 items-center justify-center bg-muted text-5xl dark:bg-dark-card">🐾</div>}
          </div>
        </div>

        {/* Info */}
        <div className="lg:col-span-3">
          <div className="card-surface p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <KindBadge kind={report.kind} />
                  <StatusBadge status={report.status} />
                  {report.is_demo && <Badge variant="accent">DEMO — sample data, not a real emergency</Badge>}
                  {report.found_status && <Badge variant="secondary">{report.found_status}</Badge>}
                  {report.animal_condition && report.animal_condition !== 'unknown' && <Badge variant={report.animal_condition === 'injured' ? 'destructive' : 'warning'}>{report.animal_condition}</Badge>}
                </div>
                <h1 className="mt-3">{report.pet_name ?? `${animalEmoji[report.animal_type] ?? ''} ${report.animal_type}`}</h1>
                <p className="text-sm text-muted-foreground">Report ID: {report.report_code}</p>
              </div>
              <div className="flex gap-2">
                {session && (
                  <>
                    <Button variant="outline" size="icon" onClick={toggleSave} aria-label="Save report"><Heart className={'h-4 w-4' + (saved ? ' fill-destructive text-destructive' : '')} /></Button>
                    <Button variant="outline" size="icon" onClick={() => setFlagOpen(true)} aria-label="Flag report"><Flag className="h-4 w-4" /></Button>
                  </>
                )}
                <Button variant="outline" size="icon" aria-label="Copy link" onClick={() => {
                  navigator.clipboard.writeText(window.location.href).then(() => push('success', 'Link copied'))
                    .catch(() => push('error', 'Could not copy link'))
                }}><Share2 className="h-4 w-4" /></Button>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {[
                ['Animal', `${animalEmoji[report.animal_type] ?? ''} ${report.animal_type}`],
                ['Breed', report.breed ?? '—'],
                ['Color', report.color ?? '—'],
                ['Size', report.size ?? '—'],
                ['Gender', report.gender ?? '—'],
                ['Age', report.age_estimate ?? '—'],
                [report.kind === 'missing' ? 'Last seen' : report.kind === 'found' && report.found_status === 'spotted' ? 'Spotted' : 'Found', new Date(report.event_time).toLocaleString()],
                ['Distance from you', myDistance != null ? formatDistance(myDistance) : '—']
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 font-medium capitalize">{v}</dd>
                </div>
              ))}
            </dl>

            {(report.distinctive_features || report.description) && (
              <div className="mt-5 space-y-3">
                {report.distinctive_features && (
                  <div><h3 className="text-sm font-semibold">Distinctive features</h3><p className="mt-1 text-sm text-muted-foreground">{report.distinctive_features}</p></div>
                )}
                {report.description && (
                  <div><h3 className="text-sm font-semibold">Description</h3><p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{report.description}</p></div>
                )}
              </div>
            )}

            {/* Contact */}
            <div className="mt-6 rounded-xl bg-muted p-4 dark:bg-dark-bg">
              {isOwner ? (
                <Link to="/dashboard/my-reports" className="font-medium text-secondary hover:underline">You reported this — manage it from your dashboard →</Link>
              ) : isGuest ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Sign in required to contact the reporter or submit a sighting.</p>
                  <Button variant="accent" onClick={() => setPrompt('Contact the reporter')}>Create Free Account</Button>
                </div>
              ) : session ? (
                <ContactSection report={report} />
              ) : (
                <p className="text-sm">
                  <Link to="/login" className="font-semibold text-secondary hover:underline">Sign in</Link> to contact the reporter, submit a sighting or save this report.
                </p>
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              For privacy, exact owner addresses are never shown. The map shows the approximate last-seen area only.
            </p>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-5">
          <div className="card-surface overflow-hidden">
            <div className="border-b border-border px-5 py-3 font-semibold dark:border-dark-border">Location</div>
            <MapContainer center={[report.latitude, report.longitude]} zoom={14} className="h-80 w-full" scrollWheelZoom>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[report.latitude, report.longitude]} icon={markerIcon}>
                <Popup>{report.pet_name ?? report.report_code}</Popup>
              </Marker>
              <Circle center={[report.latitude, report.longitude]} radius={report.radius_km * 1000} className="stroke-secondary/40 fill-secondary/10" />
            </MapContainer>
          </div>
        </div>

        {/* Sightings */}
        <div className="lg:col-span-5">
          <div className="card-surface p-5">
            <h2 className="text-lg font-semibold">Sightings ({sightings.length})</h2>
            {sightings.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No sightings yet. If you see this pet, submit a sighting from the contact section above.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {sightings.map(s => (
                  <li key={s.id} className="rounded-xl border border-border p-4 dark:border-dark-border">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-sm font-medium"><CheckCircle2 className="h-4 w-4 text-success-600" /> Sighting reported {timeAgo(s.created_at)}</p>
                      <p className="text-xs text-muted-foreground">Seen {new Date(s.seen_at).toLocaleString()} · {s.location_name ?? `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}`}</p>
                    </div>
                    {s.notes && <p className="mt-2 text-sm text-muted-foreground">{s.notes}</p>}
                    {s.photos.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {s.photos.map((p, i) => <Photo key={i} src={p} alt={`Sighting photo ${i + 1}`} className="h-20 w-20 rounded-lg object-cover" />)}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {prompt && <RegistrationPrompt feature={prompt} onClose={() => setPrompt(null)} />}
      <Dialog open={flagOpen} onClose={() => setFlagOpen(false)} title="Flag this report">
        <p className="mb-3 text-sm text-muted-foreground">Why are you flagging this report?</p>
        <div className="space-y-2">
          {['Spam or fake report', 'Animal cruelty concern', 'Inappropriate photos', 'Wrong information', 'Other'].map(r => (
            <label key={r} className="flex cursor-pointer items-center gap-2 rounded-lg border border-input p-3 text-sm hover:bg-muted dark:hover:bg-dark-card">
              <input type="radio" name="flag" checked={flagReason === r} onChange={() => setFlagReason(r)} /> {r}
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setFlagOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={submitFlag}>Submit flag</Button>
        </div>
      </Dialog>
    </div>
  )
}

function ContactSection({ report }: { report: PetReport }) {
  const { session } = useAuth()
  const { push } = useToast()
  const [busy, setBusy] = useState(false)

  const startChat = async () => {
    if (!session) return
    setBusy(true)
    try {
      const ownerId = report.owner_id ?? report.reporter_id
      const conv = await dataProvider.getOrCreateConversation(report.id, session.user.id, ownerId)
      window.location.href = `/dashboard/messages?c=${conv.id}`
    } catch (e) { push('error', 'Could not start chat', (e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm">
        <p className="font-medium">Contact preference: {report.contact_preference}</p>
        {report.contact_preference === 'phone' && report.contact_value && <p className="text-muted-foreground">Phone: {report.contact_value}</p>}
        {report.contact_preference === 'email' && report.contact_value && <p className="text-muted-foreground">Email: {report.contact_value}</p>}
        {report.contact_preference === 'platform' && <p className="text-muted-foreground">The reporter prefers in-app messaging.</p>}
      </div>
      <div className="flex gap-2">
        <Button onClick={startChat} loading={busy}><MessageCircle className="h-4 w-4" /> Message reporter</Button>
        <Button variant="accent" onClick={() => window.location.href = `/dashboard/report-found?ref=${report.id}`}>I saw this pet</Button>
      </div>
    </div>
  )
}
