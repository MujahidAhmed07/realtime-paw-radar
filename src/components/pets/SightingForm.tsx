import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, LocateFixed, Camera, X } from 'lucide-react'
import { dataProvider } from '../../services/providers'
import { getPosition, reverseGeocode } from '../../services/location'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '../ui/Button'
import { Input, Label, Textarea } from '../ui'
import { useToast } from '../ui/Toast'

const schema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  location_name: z.string().optional(),
  notes: z.string().min(5, 'Please describe what you saw (at least 5 characters)'),
  seen_date: z.string().min(1, 'Date is required'),
  seen_time: z.string().min(1, 'Time is required')
})
type SightingValues = z.infer<typeof schema>

const pinIcon = L.divIcon({ className: 'pet-marker', html: '<div class="pet-marker-pin pet-marker-sighting"><span>👀</span></div>', iconSize: [40, 40], iconAnchor: [20, 40] })

function SightingPicker({ lat, lng, onChange }: { lat: number; lng: number; onChange: (a: number, b: number) => void }) {
  useMapEvents({ click(e) { onChange(e.latlng.lat, e.latlng.lng) } })
  return Number.isFinite(lat) && Number.isFinite(lng) ? <Marker position={[lat, lng]} icon={pinIcon} /> : null
}

export function SightingForm({ reportId, onDone }: { reportId: string; onDone?: () => void }) {
  const { push } = useToast()
  const [photos, setPhotos] = useState<File[]>([])
  const [geoBusy, setGeoBusy] = useState(false)
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<SightingValues>({
    resolver: zodResolver(schema),
    defaultValues: { latitude: 0, longitude: 0, seen_date: new Date().toISOString().slice(0, 10), seen_time: new Date().toTimeString().slice(0, 5), notes: '' }
  })
  const lat = watch('latitude'), lng = watch('longitude')
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    getPosition().then(({ latitude, longitude }) => {
      setValue('latitude', latitude)
      setValue('longitude', longitude)
      reverseGeocode(latitude, longitude).then(n => n && setValue('location_name', n.slice(0, 120)))
    }).catch(() => {})
    setMapReady(true)
  }, [setValue])

  const setCoords = (a: number, b: number) => {
    setValue('latitude', a, { shouldValidate: true }); setValue('longitude', b, { shouldValidate: true })
  }
  const useMyLocation = async () => {
    setGeoBusy(true)
    try { const p = await getPosition(); setCoords(p.latitude, p.longitude) }
    catch (e) { push('error', 'Location unavailable', (e as Error).message) }
    finally { setGeoBusy(false) }
  }
  const onFiles = (files: FileList | null) => {
    if (!files) return
    const list = Array.from(files)
    for (const f of list) {
      if (!f.type.startsWith('image/')) { push('error', 'Invalid file', `"${f.name}" is not an image`); return }
      if (f.size > 5 * 1024 * 1024) { push('error', 'File too large', `"${f.name}" exceeds 5 MB`); return }
    }
    setPhotos(prev => [...prev, ...list].slice(0, 4))
  }

  const onSubmit = async (v: SightingValues) => {
    try {
      const session = await dataProvider.getSession()
      const uploaded = photos.length && session ? await dataProvider.uploadPhotos(session.user.id, photos) : []
      await dataProvider.createSighting({
        report_id: reportId,
        reporter_id: session!.user.id,
        latitude: v.latitude, longitude: v.longitude,
        location_name: v.location_name || null,
        photos: uploaded,
        notes: v.notes,
        seen_at: new Date(`${v.seen_date}T${v.seen_time}`).toISOString()
      })
      push('success', 'Sighting submitted', 'The owner has been notified in real time.')
      onDone?.()
    } catch (e) { push('error', 'Submission failed', (e as Error).message) }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="flex items-center justify-between">
        <Label className="mb-0">Where did you see it? *</Label>
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation} loading={geoBusy}><LocateFixed className="h-4 w-4" /> My location</Button>
      </div>
      {mapReady && (
        <div className="overflow-hidden rounded-xl border border-border dark:border-dark-border">
          <MapContainer center={[Number.isFinite(lat) && lat !== 0 ? lat : 41, Number.isFinite(lng) && lng !== 0 ? lng : 29]} zoom={13} style={{ height: 220 }} scrollWheelZoom>
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <SightingPicker lat={lat} lng={lng} onChange={setCoords} />
          </MapContainer>
        </div>
      )}
      <div>
        <Label htmlFor="location_name">Location description</Label>
        <Input id="location_name" {...register('location_name')} placeholder="e.g. Corner of Oak & 3rd" />
      </div>
      <div>
        <Label>What did you see? *</Label>
        <Textarea {...register('notes')} placeholder="Behaviour, direction it went, collar, time observed…" />
        {errors.notes && <p className="mt-1 text-xs text-destructive">{errors.notes.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="seen_date">Date seen</Label><Input id="seen_date" type="date" {...register('seen_date')} /></div>
        <div><Label htmlFor="seen_time">Time</Label><Input id="seen_time" type="time" {...register('seen_time')} /></div>
      </div>
      <div>
        <Label>Photos (optional, max 4)</Label>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-6 text-sm transition hover:border-secondary dark:border-dark-border">
          <Camera className="h-4 w-4" /> Choose photos
          <input type="file" accept="image/*" multiple className="sr-only" onChange={e => onFiles(e.target.files)} />
        </label>
        {photos.length > 0 && (
          <div className="mt-2 flex gap-2">
            {photos.map((f, i) => (
              <div key={i} className="relative">
                <img src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <button type="button" onClick={() => setPhotos(p => p.filter((_, j) => j !== i))} className="absolute -right-1 -top-1 rounded-full bg-white p-0.5 shadow" aria-label="Remove"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Button type="submit" className="w-full" variant="accent" loading={isSubmitting}><Eye className="h-4 w-4" /> Submit sighting</Button>
    </form>
  )
}
