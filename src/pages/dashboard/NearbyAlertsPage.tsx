import { useEffect, useState } from 'react'
import { MapPin, BellRing, Radar } from 'lucide-react'
import { dataProvider } from '../../services/providers'
import { useAuth } from '../../store/auth'
import { useToast } from '../../components/ui/Toast'
import type { PetReport, NotificationPreferences } from '../../types'
import { PetCard } from '../../components/pets/PetCard'
import { PetCardSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Label } from '../../components/ui'
import { getPosition } from '../../services/location'
import { cn } from '../../lib/cn'

export function NearbyAlertsPage() {
  const { session } = useAuth()
  const { push } = useToast()
  const [reports, setReports] = useState<PetReport[]>([])
  const [distances, setDistances] = useState<Record<string, number>>({})
  const [, setPrefs] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [radius, setRadius] = useState<1 | 3 | 5 | 10>(5)
  const [hasLocation, setHasLocation] = useState(false)

  useEffect(() => {
    if (!session) return
    dataProvider.getNotificationPrefs(session.user.id).then(p => { setPrefs(p); setRadius(p.default_radius_km) })
  }, [session])

  const locateAndLoad = async () => {
    setLoading(true)
    try {
      const pos = await getPosition()
      const results = await dataProvider.searchNearby({ latitude: pos.latitude, longitude: pos.longitude, radius_km: radius, status: 'active' })
      const R = 6371, toRad = (v: number) => v * Math.PI / 180
      const d: Record<string, number> = {}
      for (const r of results) {
        const dLat = toRad(r.latitude - pos.latitude), dLng = toRad(r.longitude - pos.longitude)
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(pos.latitude)) * Math.cos(toRad(r.latitude)) * Math.sin(dLng / 2) ** 2
        d[r.id] = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      }
      setDistances(d); setReports(results); setHasLocation(true)
      if (session) await dataProvider.updateLocation(session.user.id, pos.latitude, pos.longitude)
    } catch (e) {
      push('error', 'Location needed', (e as Error).message)
      setReports([])
    } finally { setLoading(false) }
  }

  useEffect(() => { locateAndLoad() }, [radius]) // eslint-disable-line react-hooks/exhaustive-deps

  const setPrefRadius = async (r: 1 | 3 | 5 | 10) => {
    setRadius(r)
    if (session) { await dataProvider.updateNotificationPrefs(session.user.id, { default_radius_km: r }); setPrefs(p => p ? { ...p, default_radius_km: r } : p) }
  }

  return (
    <div className="space-y-6">
      <h1>Nearby Alerts</h1>
      <p className="text-muted-foreground">Active reports near your location. Your saved location is used to deliver real-time alerts.</p>

      <div className="card-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label className="mb-2">Your alert radius</Label>
          <div className="grid grid-cols-4 gap-2">
            {([1, 3, 5, 10] as const).map(r => (
              <button key={r} onClick={() => setPrefRadius(r)}
                className={cn('rounded-lg border px-3 py-2 text-sm font-semibold transition',
                  radius === r ? 'border-secondary bg-secondary text-white' : 'border-input hover:bg-muted')}>
                {r} km
              </button>
            ))}
          </div>
        </div>
        <Button variant="outline" onClick={locateAndLoad}><Radar className="h-4 w-4" /> Refresh my location</Button>
      </div>

      {!hasLocation && !loading && (
        <EmptyState icon={<MapPin className="h-10 w-10" />} title="Location required"
          description="PetAlert asks for your location only when you use this feature. It is stored once (not tracked) and used to compute distances for alerts."
          action={<Button onClick={locateAndLoad}><BellRing className="h-4 w-4" /> Share my location now</Button>} />
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <PetCardSkeleton key={i} />)}</div>
      ) : hasLocation && reports.length === 0 ? (
        <EmptyState icon={<BellRing className="h-10 w-10" />} title={`No active reports within ${radius} km`}
          description="All quiet nearby. When someone reports a pet in your radius you'll get an instant notification." />
      ) : hasLocation && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {reports.map(r => <PetCard key={r.id} report={r} distanceKm={distances[r.id]} />)}
        </div>
      )}
    </div>
  )
}
