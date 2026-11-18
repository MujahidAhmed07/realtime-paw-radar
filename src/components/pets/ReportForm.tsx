import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { MapPin, Camera, Send, LocateFixed, X, AlertTriangle } from 'lucide-react'
import { dataProvider } from '../../services/providers'
import { getPosition, reverseGeocode } from '../../services/location'
import { loadDraft, saveDraft, clearDraft, loadFormStep, saveFormStep } from '../../services/storage'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '../ui/Button'
import { Input, Select, Label, Textarea } from '../ui'
import { useToast } from '../ui/Toast'
import { cn } from '../../lib/cn'

const baseSchema = z.object({
  pet_name: z.string().optional(),
  animal_type: z.enum(['dog', 'cat', 'bird', 'rabbit', 'reptile', 'other']),
  breed: z.string().optional(),
  gender: z.enum(['male', 'female', 'unknown']).default('unknown'),
  age_estimate: z.string().optional(),
  color: z.string().optional(),
  size: z.preprocess(v => v === '' || v == null ? undefined : v, z.enum(['small', 'medium', 'large']).optional()),
  distinctive_features: z.string().optional(),
  description: z.string().optional(),
  location_name: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  event_date: z.string().min(1, 'Date is required'),
  event_time: z.string().min(1, 'Time is required'),
  radius_km: z.union([z.literal('1'), z.literal('3'), z.literal('5'), z.literal('10')]),
  contact_preference: z.enum(['platform', 'phone', 'email']),
  contact_value: z.string().optional()
})

const lostSchema = baseSchema.extend({ pet_name: z.string().min(1, 'Pet name is required') })
const foundSchema = baseSchema.extend({
  found_status: z.enum(['found', 'spotted']),
  animal_condition: z.enum(['healthy', 'injured', 'scared', 'hungry', 'unknown'])
})
export type ReportFormValues = z.infer<typeof lostSchema> & { found_status?: 'found' | 'spotted'; animal_condition?: z.infer<typeof foundSchema>['animal_condition'] }

const pinIcon = L.divIcon({ className: 'pet-marker', html: '<div class="pet-marker-pin pet-marker-found"><span>📍</span></div>', iconSize: [40, 40], iconAnchor: [20, 40] })

function LocationPicker({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  const marker = useMapEvents({
    click(e) { onChange(e.latlng.lat, e.latlng.lng) }
  })
  useEffect(() => { if (Number.isFinite(lat) && Number.isFinite(lng)) marker.setView([lat, lng], marker.getZoom()) }, [lat, lng]) // eslint-disable-line react-hooks/exhaustive-deps
  return Number.isFinite(lat) && Number.isFinite(lng) ? <Marker position={[lat, lng]} icon={pinIcon} /> : null
}

export function ReportForm({ kind }: { kind: 'missing' | 'found' }) {
  const { push } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [step, setStep] = useState(() => loadFormStep(`report-${kind}`))
  const [photos, setPhotos] = useState<File[]>([])
  const [photoBusy, setPhotoBusy] = useState(false)
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoError, setGeoError] = useState('')
  const draftKey = `report-${kind}`
  const refReportId = params.get('ref') // e.g. sighting referring to a missing report

  const schema = (kind === 'missing' ? lostSchema : foundSchema) as typeof lostSchema
  const { register, trigger, watch, setValue, formState: { errors, isSubmitting } } = useForm<ReportFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: loadDraft(draftKey, {
      animal_type: 'dog', gender: 'unknown', event_date: new Date().toISOString().slice(0, 10),
      event_time: new Date().toTimeString().slice(0, 5), radius_km: '5', contact_preference: 'platform',
      found_status: 'found', animal_condition: 'unknown'
    } as Partial<ReportFormValues>)
  })

  const lat = watch('latitude')
  const lng = watch('longitude')
  const contactPreference = watch('contact_preference')

  // Draft persistence
  const values = watch()
  useEffect(() => { const t = setTimeout(() => saveDraft(draftKey, values), 800); return () => clearTimeout(t) }, [values, draftKey])

  const setCoords = (newLat: number, newLng: number) => {
    setValue('latitude', newLat, { shouldValidate: true })
    setValue('longitude', newLng, { shouldValidate: true })
    reverseGeocode(newLat, newLng).then(name => { if (name) setValue('location_name', name.slice(0, 120)) })
  }

  const useMyLocation = async () => {
    setGeoBusy(true); setGeoError('')
    try {
      const pos = await getPosition()
      setCoords(pos.latitude, pos.longitude)
    } catch (e) { setGeoError((e as Error).message) } finally { setGeoBusy(false) }
  }

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    setPhotoBusy(true)
    try {
      const list = Array.from(files)
      for (const f of list) {
        if (!f.type.startsWith('image/')) throw new Error(`"${f.name}" is not an image`)
        if (f.size > 5 * 1024 * 1024) throw new Error(`"${f.name}" exceeds the 5 MB limit`)
      }
      setPhotos(prev => [...prev, ...list].slice(0, 6))
    } catch (e) { push('error', 'Invalid file', (e as Error).message) } finally { setPhotoBusy(false) }
  }

  const removePhoto = (idx: number) => setPhotos(p => p.filter((_, i) => i !== idx))

  const steps = kind === 'missing'
    ? ['Pet details', 'Photos', 'Location & time', 'Alerts & contact']
    : ['Animal details', 'Photos', 'Location & time', 'Contact']

  const stepFields: Record<number, string[]> = {
    0: kind === 'missing' ? ['pet_name', 'animal_type'] : ['animal_type', 'found_status'],
    2: ['latitude', 'longitude', 'event_date', 'event_time'],
    3: ['contact_preference']
  }

  const nextStep = async () => {
    const fields = stepFields[step] ?? []
    if (fields.length && !(await trigger(fields as never))) return
    const s = Math.min(step + 1, steps.length - 1)
    setStep(s); saveFormStep(draftKey, s)
  }
  const prevStep = () => { const s = Math.max(step - 1, 0); setStep(s); saveFormStep(draftKey, s) }

  const onSubmit = async (v: ReportFormValues) => {
    try {
      const session = await dataProvider.getSession()
      if (!session) throw new Error('You must be signed in to submit a report')
      const uploaded = photos.length ? await dataProvider.uploadPhotos(session.user.id, photos) : []
      const event_time = new Date(`${v.event_date}T${v.event_time}`).toISOString()
      const report = await dataProvider.createReport({
        reporter_id: session.user.id,
        kind,
        pet_name: v.pet_name || null,
        animal_type: v.animal_type,
        breed: v.breed || null,
        gender: v.gender,
        age_estimate: v.age_estimate || null,
        color: v.color || null,
        size: v.size || null,
        photos: uploaded,
        distinctive_features: v.distinctive_features || null,
        description: v.description || null,
        latitude: v.latitude,
        longitude: v.longitude,
        location_name: v.location_name || null,
        radius_km: Number(v.radius_km) as 1 | 3 | 5 | 10,
        event_time,
        found_status: kind === 'found' ? v.found_status! : null,
        animal_condition: kind === 'found' ? v.animal_condition! : null,
        contact_preference: v.contact_preference,
        contact_value: v.contact_preference === 'platform' ? null : (v.contact_value || null)
      })
      clearDraft(draftKey)
      saveFormStep(draftKey, 0)
      push('success', kind === 'missing' ? 'Missing pet report published' : 'Found pet report published',
        `Report ID ${report.report_code}. Nearby users within ${v.radius_km} km have been alerted.`)
      navigate(`/pet/${report.id}`)
    } catch (e) {
      push('error', 'Submission failed', (e as Error).message)
    }
  }


  return (
    <form onSubmit={e => { e.preventDefault(); void (async () => {
      const parsed = schema.safeParse(watch())
      if (!parsed.success) return
      await onSubmit(parsed.data as ReportFormValues)
    })() }} className="card-surface mx-auto max-w-2xl p-6" noValidate>
      {refReportId && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-secondary-50 px-4 py-3 text-sm text-secondary-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          You're reporting a sighting connected to an existing report. After submitting, the owner will be notified instantly.
        </div>
      )}

      {/* Stepper */}
      <ol className="mb-6 flex items-center gap-1" aria-label={`Step ${step + 1} of ${steps.length}`}>
        {steps.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-1">
            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
              i < step ? 'bg-success text-white' : i === step ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>
              {i < step ? '✓' : i + 1}
            </span>
            <span className={cn('hidden text-xs font-medium sm:block', i === step ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
            {i < steps.length - 1 && <span className={cn('h-0.5 flex-1', i < step ? 'bg-success' : 'bg-border dark:bg-dark-border')} />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-4 animate-fade-in">
          {kind === 'missing' && (
            <div>
              <Label htmlFor="pet_name">Pet name *</Label>
              <Input id="pet_name" {...register('pet_name')} placeholder="e.g. Max" />
              {errors.pet_name && <p className="mt-1 text-xs text-destructive">{errors.pet_name.message}</p>}
            </div>
          )}
          {kind === 'found' && (
            <>
              <div>
                <Label>Status *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[['found', 'I found / took in the animal'], ['spotted', 'I spotted it (still outside)']].map(([v, label]) => (
                    <label key={v} className={cn('flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm',
                      watch('found_status') === v ? 'border-secondary bg-secondary-50' : 'border-input')}>
                      <input type="radio" {...register('found_status')} value={v} /> {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="animal_condition">Animal condition</Label>
                <Select id="animal_condition" {...register('animal_condition')}>
                  <option value="healthy">Healthy</option><option value="injured">Injured</option>
                  <option value="scared">Scared / nervous</option><option value="hungry">Hungry</option><option value="unknown">Unknown</option>
                </Select>
              </div>
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="animal_type">Animal type *</Label>
              <Select id="animal_type" {...register('animal_type')}>
                <option value="dog">Dog</option><option value="cat">Cat</option><option value="bird">Bird</option>
                <option value="rabbit">Rabbit</option><option value="reptile">Reptile</option><option value="other">Other</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="breed">Breed</Label>
              <Input id="breed" {...register('breed')} placeholder="e.g. Golden Retriever" />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select id="gender" {...register('gender')}>
                <option value="unknown">Unknown</option><option value="male">Male</option><option value="female">Female</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="age_estimate">Age (estimate)</Label>
              <Input id="age_estimate" {...register('age_estimate')} placeholder="e.g. ~2 years" />
            </div>
            <div>
              <Label htmlFor="color">Colour</Label>
              <Input id="color" {...register('color')} placeholder="e.g. Golden, white chest" />
            </div>
            <div>
              <Label htmlFor="size">Size</Label>
              <Select id="size" {...register('size')}>
                <option value="">Unknown</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="distinctive_features">Distinctive characteristics</Label>
            <Textarea id="distinctive_features" {...register('distinctive_features')} placeholder="Collar colour, markings, microchip, limp…" />
          </div>
          <div>
            <Label htmlFor="description">Additional description</Label>
            <Textarea id="description" {...register('description')} placeholder="Anything else that helps identify the animal…" />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="animate-fade-in">
          <Label>Photos (up to 6, JPG/PNG, max 5 MB each)</Label>
          <label className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-10 transition hover:border-secondary hover:bg-secondary-50/40 dark:border-dark-border">
            <Camera className="h-8 w-8 text-muted-foreground" />
            <span className="mt-2 text-sm font-medium">Click to choose photos</span>
            <span className="text-xs text-muted-foreground">Clear photos dramatically improve reunion chances</span>
            <input type="file" accept="image/*" multiple className="sr-only" onChange={e => onFiles(e.target.files)} disabled={photoBusy} />
          </label>
          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {photos.map((f, i) => (
                <div key={i} className="group relative">
                  <img src={URL.createObjectURL(f)} alt={`Photo ${i + 1}`} className="h-24 w-full rounded-lg object-cover" />
                  <button type="button" onClick={() => removePhoto(i)} aria-label={`Remove photo ${i + 1}`}
                    className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow hover:bg-white"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <Label className="mb-0">Last-seen location *</Label>
            <Button type="button" variant="outline" size="sm" onClick={useMyLocation} loading={geoBusy}>
              <LocateFixed className="h-4 w-4" /> Use my location
            </Button>
          </div>
          {geoError && <p className="text-xs text-warning-700">{geoError}</p>}
          {Number.isFinite(lat) && Number.isFinite(lng) ? (
            <div className="overflow-hidden rounded-xl border border-border dark:border-dark-border">
              <MapContainer center={[lat, lng]} zoom={14} style={{ height: 280 }} scrollWheelZoom>
                <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker lat={lat} lng={lng} onChange={setCoords} />
              </MapContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-border py-10 text-sm text-muted-foreground dark:border-dark-border">
              <MapPin className="mb-2 h-8 w-8" />
              Click "Use my location" or set coordinates manually below
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="latitude">Latitude</Label>
              <Input id="latitude" type="number" step="any" {...register('latitude', { valueAsNumber: true })} />
              {errors.latitude && <p className="mt-1 text-xs text-destructive">{errors.latitude.message}</p>}
            </div>
            <div>
              <Label htmlFor="longitude">Longitude</Label>
              <Input id="longitude" type="number" step="any" {...register('longitude', { valueAsNumber: true })} />
              {errors.longitude && <p className="mt-1 text-xs text-destructive">{errors.longitude.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="location_name">Location description</Label>
            <Input id="location_name" {...register('location_name')} placeholder="e.g. Near the park entrance on 5th Ave" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="event_date">{kind === 'missing' ? 'Date lost' : 'Date seen'} *</Label>
              <Input id="event_date" type="date" {...register('event_date')} />
              {errors.event_date && <p className="mt-1 text-xs text-destructive">{errors.event_date.message}</p>}
            </div>
            <div>
              <Label htmlFor="event_time">Time *</Label>
              <Input id="event_time" type="time" {...register('event_time')} />
              {errors.event_time && <p className="mt-1 text-xs text-destructive">{errors.event_time.message}</p>}
            </div>
          </div>
          <div>
            <Label>Alert radius (how far the notification spreads)</Label>
            <div className="grid grid-cols-4 gap-2">
              {(['1', '3', '5', '10'] as const).map(r => (
                <label key={r} className={cn('flex cursor-pointer flex-col items-center rounded-xl border p-3 text-sm font-semibold',
                  watch('radius_km') === r ? 'border-secondary bg-secondary-50 text-secondary' : 'border-input')}>
                  <input type="radio" {...register('radius_km')} value={r} className="sr-only" /> {r} km
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <Label>Contact preference</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {[['platform', 'In-app messaging (recommended — keeps contact private)'], ['phone', 'Phone number'], ['email', 'Email']].map(([v, label]) => (
                <label key={v} className={cn('flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm',
                  contactPreference === v ? 'border-secondary bg-secondary-50' : 'border-input')}>
                  <input type="radio" {...register('contact_preference')} value={v} /> {label}
                </label>
              ))}
            </div>
          </div>
          {contactPreference !== 'platform' && (
            <div>
              <Label htmlFor="contact_value">{contactPreference === 'phone' ? 'Phone number' : 'Email'} *</Label>
              <Input id="contact_value" {...register('contact_value', { required: true })} />
              {errors.contact_value && <p className="mt-1 text-xs text-destructive">Contact value is required</p>}
            </div>
          )}
          <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground dark:bg-dark-bg">
            <p className="font-medium text-foreground">What happens next?</p>
            <ul className="mt-1.5 list-inside list-disc space-y-1">
              <li>Your report is published with a unique ID and appears on the live map.</li>
              <li>Users within {watch('radius_km') ?? '5'} km who enabled alerts are notified in real time.</li>
              <li>Any sighting triggers an instant notification for you.</li>
            </ul>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <Button type="button" variant="outline" onClick={prevStep} disabled={step === 0}>Back</Button>
        {step < steps.length - 1
          ? <Button type="button" onClick={nextStep}>Continue</Button>
          : <Button type="submit" variant="accent" loading={isSubmitting}><Send className="h-4 w-4" /> Publish report</Button>}
      </div>
    </form>
  )
}
