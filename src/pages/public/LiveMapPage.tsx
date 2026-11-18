import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Search, LocateFixed, Filter } from 'lucide-react'
import { Link } from 'react-router-dom'
import { dataProvider } from '../../services/providers'
import type { PetReport, AnimalType } from '../../types'
import { getPosition, FALLBACK_CENTER } from '../../services/location'
import { loadMapFilters, saveMapFilters, type MapFilters } from '../../services/storage'
import { Input, Select, Button } from '../../components/ui'
import { animalEmoji, formatDistance } from '../../lib/utils'

function makePin(colorClass: string, emoji: string) {
  return L.divIcon({
    className: 'pet-marker',
    html: `<div class="pet-marker-pin ${colorClass}"><span>${emoji}</span></div>`,
    iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -36]
  })
}
const icons = {
  missing: makePin('pet-marker-missing', '🐾'),
  found: makePin('pet-marker-found', '🐾'),
  sighting: makePin('pet-marker-sighting', '👀'),
  reunited: makePin('pet-marker-reunited', '🏠')
}

function Recenter({ center, trigger }: { center: [number, number]; trigger: number }) {
  const map = useMap()
  useEffect(() => { map.setView(center) }, [trigger]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export function LiveMapPage() {
  const [filters, setFilters] = useState<MapFilters>(() => loadMapFilters())
  const [reports, setReports] = useState<PetReport[]>([])
  const [loading, setLoading] = useState(true)
  const [center, setCenter] = useState<[number, number]>([filters.lat ?? FALLBACK_CENTER.lat, filters.lng ?? FALLBACK_CENTER.lng])
  const [recenterTrigger, setRecenterTrigger] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const dataVersion = useRef(0)

  const reload = async () => {
    const v = ++dataVersion.current
    const list = await dataProvider.searchNearby({
      latitude: center[0], longitude: center[1], radius_km: 500,
      animal_type: filters.animalType === 'all' ? undefined : (filters.animalType as AnimalType),
      search: filters.search || undefined
    })
    if (v !== dataVersion.current) return
    setReports(list)
    setLoading(false)
  }

  useEffect(() => { setLoading(true); reload() }, [center, filters.animalType, filters.search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime map updates
  useEffect(() => {
    const unsub = dataProvider.subscribe('reports', () => reload())
    return unsub
  }, [center, filters.animalType, filters.search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { saveMapFilters(filters) }, [filters])

  const visible = useMemo(() => {
    const R = 6371, toRad = (v: number) => v * Math.PI / 180
    const dist = (r: PetReport) => {
      const dLat = toRad(r.latitude - center[0]), dLng = toRad(r.longitude - center[1])
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(center[0])) * Math.cos(toRad(r.latitude)) * Math.sin(dLng / 2) ** 2
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }
    return reports
      .filter(r => filters.status === 'all' ? r.status !== 'archived' : r.status === filters.status)
      .map(r => ({ r, d: dist(r) }))
      .filter(x => x.d <= filters.radiusKm)
      .sort((a, b) => a.d - b.d)
  }, [reports, filters, center])

  const useMyLocation = async () => {
    try {
      const pos = await getPosition()
      setCenter([pos.latitude, pos.longitude])
      setRecenterTrigger(t => t + 1)
      setStatusMsg('Centered on your location')
      setTimeout(() => setStatusMsg(''), 2500)
    } catch (e) {
      setStatusMsg((e as Error).message)
      setTimeout(() => setStatusMsg(''), 4000)
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="flex w-full flex-col border-b border-border bg-card dark:border-dark-border dark:bg-dark-card lg:w-96 lg:border-b-0 lg:border-r">
        <div className="space-y-3 border-b border-border p-4 dark:border-dark-border">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Search reports…" className="pl-9" aria-label="Search map reports" />
            </div>
            <Button variant="outline" size="icon" onClick={() => setShowFilters(s => !s)} aria-label="Toggle filters"><Filter className="h-4 w-4" /></Button>
          </div>
          <Button variant="accent" className="w-full" onClick={useMyLocation}><LocateFixed className="h-4 w-4" /> Center on my location</Button>
          {statusMsg && <p className="text-xs text-muted-foreground">{statusMsg}</p>}
          {showFilters && (
            <div className="grid grid-cols-2 gap-2 animate-fade-in">
              <Select value={filters.radiusKm} onChange={e => setFilters(f => ({ ...f, radiusKm: Number(e.target.value) as MapFilters['radiusKm'] }))} aria-label="Radius">
                <option value={1}>Within 1 km</option><option value={3}>Within 3 km</option>
                <option value={5}>Within 5 km</option><option value={10}>Within 10 km</option>
              </Select>
              <Select value={filters.animalType} onChange={e => setFilters(f => ({ ...f, animalType: e.target.value }))} aria-label="Animal type">
                <option value="all">All animals</option><option value="dog">Dogs</option><option value="cat">Cats</option>
                <option value="bird">Birds</option><option value="rabbit">Rabbits</option><option value="reptile">Reptiles</option><option value="other">Other</option>
              </Select>
              <Select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="col-span-2" aria-label="Status">
                <option value="all">All statuses</option><option value="active">Active</option><option value="reunited">Reunited</option><option value="resolved">Resolved</option>
              </Select>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{loading ? 'Loading…' : `${visible.length} report${visible.length === 1 ? '' : 's'} in radius`}</p>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 w-full" />)}</div>
          ) : visible.length === 0 ? (
            <p className="px-1 py-8 text-center text-sm text-muted-foreground">No reports within {filters.radiusKm} km. Try a larger radius or different filters.</p>
          ) : (
            <ul className="space-y-2">
              {visible.map(({ r, d }) => (
                <li key={r.id}>
                  <Link to={`/pet/${r.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-muted dark:border-dark-border dark:hover:bg-dark-border">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg dark:bg-dark-border">{animalEmoji[r.animal_type] ?? '🐾'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.pet_name ?? `${r.animal_type} ${r.kind === 'missing' ? '(missing)' : '(found)'}`}</p>
                      <p className="text-xs text-muted-foreground">{formatDistance(d)} · {r.kind} · {r.status}</p>
                    </div>
                    <span className={'h-2.5 w-2.5 shrink-0 rounded-full ' + (r.kind === 'missing' ? 'bg-destructive' : r.status === 'reunited' ? 'bg-muted-foreground' : 'bg-success')} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-3 text-xs text-muted-foreground dark:border-dark-border">
          <span className="mr-3"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-destructive" />Missing</span>
          <span className="mr-3"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-success" />Found</span>
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground" />Reunited</span>
        </div>
      </aside>

      {/* Map */}
      <div className="relative min-h-[400px] flex-1">
        <MapContainer center={center} zoom={12} className="h-full w-full" scrollWheelZoom>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Recenter center={center} trigger={recenterTrigger} />
          <Circle center={center} radius={filters.radiusKm * 1000} pathOptions={{ color: '#2563EB', weight: 1, fillOpacity: 0.05 }} />
          <MarkerClusterGroup chunkedLoading>
            {visible.map(({ r }) => (
              <Marker key={r.id} position={[r.latitude, r.longitude]}
                icon={r.status === 'reunited' || r.status === 'resolved' ? icons.reunited : r.kind === 'missing' ? icons.missing : icons.found}>
                <Popup>
                  <div className="min-w-44">
                    <p className="font-semibold">{animalEmoji[r.animal_type] ?? '🐾'} {r.pet_name ?? r.report_code}</p>
                    <p className="text-xs text-gray-500">{r.breed ? `${r.breed} · ` : ''}{r.kind === 'missing' ? 'Missing' : 'Found'} · {r.status}</p>
                    {r.photos[0] && <img src={r.photos[0]} alt="" className="mt-2 h-24 w-full rounded object-cover" />}
                    <Link to={`/pet/${r.id}`} className="mt-2 block rounded bg-secondary px-3 py-1.5 text-center text-xs font-semibold text-white">Open report</Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  )
}
