import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, PawPrint } from 'lucide-react'
import { dataProvider } from '../../services/providers'
import type { PetReport, ReportKind } from '../../types'
import { PetCard } from '../../components/pets/PetCard'
import { PetCardSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input, Select } from '../../components/ui'
import { loadMapFilters, saveMapFilters, type MapFilters } from '../../services/storage'
import { getPosition, FALLBACK_CENTER } from '../../services/location'

export function ReportListPage({ kind }: { kind: ReportKind }) {
  const [reports, setReports] = useState<PetReport[] | null>(null)
  const [search, setSearch] = useState('')
  const [animalType, setAnimalType] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'distance'>('newest')
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null)
  const location = useLocation()

  useEffect(() => {
    const savedFilters = loadMapFilters()
    setSearch(savedFilters.search)
    setAnimalType(savedFilters.animalType)
  }, [])

  useEffect(() => {
    getPosition()
      .then(({ latitude, longitude }) => setMyPos({ lat: latitude, lng: longitude }))
      .catch(() => setMyPos({ lat: FALLBACK_CENTER.lat, lng: FALLBACK_CENTER.lng }))
  }, [])

  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      const all = await dataProvider.listReports({ kind, status: 'active' })
      if (cancelled) return
      let filtered = all
      if (search.trim()) {
        const s = search.toLowerCase()
        filtered = filtered.filter(r =>
          (r.pet_name ?? '').toLowerCase().includes(s) || (r.breed ?? '').toLowerCase().includes(s) ||
          r.animal_type.includes(s) || (r.location_name ?? '').toLowerCase().includes(s) || r.report_code.toLowerCase().includes(s))
      }
      if (animalType !== 'all') filtered = filtered.filter(r => r.animal_type === animalType)
      if (sortBy === 'distance' && myPos) {
        const R = 6371, toRad = (v: number) => v * Math.PI / 180
        const dist = (r: PetReport) => {
          const dLat = toRad(r.latitude - myPos.lat), dLng = toRad(r.longitude - myPos.lng)
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(myPos.lat)) * Math.cos(toRad(r.latitude)) * Math.sin(dLng / 2) ** 2
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        }
        filtered = [...filtered].sort((a, b) => dist(a) - dist(b))
      }
      setReports(filtered)
      saveMapFilters({ ...loadMapFilters(), search, animalType } as MapFilters)
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [kind, search, animalType, sortBy, myPos])

  // React to ?ref= (e.g., "I saw this pet") — scroll to top
  useEffect(() => { if (location.search) window.scrollTo(0, 0) }, [location.search])

  const title = kind === 'missing' ? 'Missing Pets' : 'Found Pets'
  const subtitle = kind === 'missing'
    ? 'Help reunite these pets with their families. Click a card for details and sightings.'
    : 'Pets that were found or spotted by the community. See one you recognize?'

  return (
    <div className="container-page py-10">
      <h1>{title}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, breed, location or report ID…" className="pl-9" aria-label="Search reports" />
        </div>
        <Select value={animalType} onChange={e => setAnimalType(e.target.value)} aria-label="Filter by animal type" className="sm:w-44">
          <option value="all">All animals</option>
          <option value="dog">Dogs</option><option value="cat">Cats</option><option value="bird">Birds</option>
          <option value="rabbit">Rabbits</option><option value="reptile">Reptiles</option><option value="other">Other</option>
        </Select>
        <Select value={sortBy} onChange={e => setSortBy(e.target.value as 'newest' | 'distance')} aria-label="Sort" className="sm:w-44">
          <option value="newest">Newest first</option>
          <option value="distance">Closest to me</option>
        </Select>
      </div>

      <div className="mt-8">
        {reports === null ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <PetCardSkeleton key={i} />)}</div>
        ) : reports.length === 0 ? (
          <EmptyState icon={<PawPrint className="h-10 w-10" />} title={search || animalType !== 'all' ? 'No reports match your filters' : `No active ${kind} reports`}
            description={search || animalType !== 'all' ? 'Try clearing the search or choosing another animal type.' : 'Check back soon — new reports appear in real time.'} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map(r => <PetCard key={r.id} report={r} />)}
          </div>
        )}
      </div>
    </div>
  )
}
