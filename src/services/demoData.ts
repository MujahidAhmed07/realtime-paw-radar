import type { PetReport, PetSighting, Profile, ReportKind, AnimalType, PetGender, PetSize } from '../types'

/**
 * Demo data — deterministic IDs ("demo-*"), Malaysian locations, clearly labeled
 * via the `is_demo` flag on every record. Seeding is idempotent: the demo user
 * profile and reports are keyed by fixed IDs, so re-running never duplicates.
 * Demo records never trigger nearby alerts or real notifications (the local
 * provider skips fan-out for is_demo; the Supabase trigger filters is_demo).
 */

export const DEMO_USER_ID = 'demo-user-00000000-0000-0000-0000-000000000000'
export const isDemoId = (id: string) => id.startsWith('demo-')

// Malaysian coordinates (approximate public area centroids — no private addresses)
const LOCATIONS = {
  'Kuala Lumpur': { lat: 3.1390, lng: 101.6869 },
  'Petaling Jaya': { lat: 3.1073, lng: 101.6067 },
  'Subang Jaya': { lat: 3.0430, lng: 101.5808 },
  'Shah Alam': { lat: 3.0733, lng: 101.5185 },
  'Cheras': { lat: 3.1015, lng: 101.7226 },
  'Bangsar': { lat: 3.1273, lng: 101.6756 },
  'Mont Kiara': { lat: 3.1710, lng: 101.6498 },
  'Puchong': { lat: 3.0190, lng: 101.6160 },
  'Damansara': { lat: 3.1470, lng: 101.6100 },
  'Ampang': { lat: 3.1480, lng: 101.7620 }
} as const

// Deterministic demo photos (sofa/farm animal CDN — stable, keyless)
const photo = (seed: number) => `https://placekitten.com/640/480?image=${seed}`

interface DemoSpec {
  found?: 'found' | 'spotted'
  condition?: 'healthy' | 'injured' | 'scared' | 'hungry' | 'unknown'
  id: string
  kind: ReportKind
  status: 'active' | 'reunited' | 'resolved'
  pet_name: string | null
  animal_type: AnimalType
  breed: string
  gender: PetGender
  age: string
  color: string
  size: PetSize
  features: string
  description: string
  location: keyof typeof LOCATIONS
  hoursAgo: number
  photoSeed: number
}

const SPECS: DemoSpec[] = [
  // ---- 12 missing ----
  { id: 'demo-mis-01', kind: 'missing', status: 'active', pet_name: 'Bruno', animal_type: 'dog', breed: 'Golden Retriever', gender: 'male', age: '~3 years', color: 'Golden', size: 'large', features: 'Red collar, white chest patch', description: 'Very friendly, responds to "Bruno". Slipped out during evening walk near the park.', location: 'Kuala Lumpur', hoursAgo: 3, photoSeed: 11 },
  { id: 'demo-mis-02', kind: 'missing', status: 'active', pet_name: 'Milo', animal_type: 'cat', breed: 'Domestic Shorthair', gender: 'male', age: '~2 years', color: 'Orange tabby', size: 'medium', features: 'Notched left ear, green eyes', description: 'Outdoor cat, did not return for dinner. Might be sheltering near the shops.', location: 'Petaling Jaya', hoursAgo: 8, photoSeed: 12 },
  { id: 'demo-mis-03', kind: 'missing', status: 'active', pet_name: 'Coco', animal_type: 'rabbit', breed: 'Holland Lop', gender: 'female', age: '~1 year', color: 'White and brown', size: 'small', features: 'Floppy ears, grey spot on nose', description: 'Escaped from hutch in the garden. Gentle, may approach if offered greens.', location: 'Subang Jaya', hoursAgo: 14, photoSeed: 13 },
  { id: 'demo-mis-04', kind: 'missing', status: 'active', pet_name: 'Simba', animal_type: 'cat', breed: 'Persian', gender: 'male', age: '~4 years', color: 'Cream', size: 'medium', features: 'Long fur, flat face, blue eyes', description: 'Indoor cat missing after window screen came loose. Shy — check under cars.', location: 'Shah Alam', hoursAgo: 20, photoSeed: 14 },
  { id: 'demo-mis-05', kind: 'missing', status: 'active', pet_name: 'Charlie', animal_type: 'dog', breed: 'Beagle', gender: 'male', age: '~5 years', color: 'Tricolor', size: 'medium', features: 'Blue collar with name tag', description: 'Food-motivated escape artist. Last seen following a food delivery rider.', location: 'Cheras', hoursAgo: 26, photoSeed: 15 },
  { id: 'demo-mis-06', kind: 'missing', status: 'active', pet_name: 'Luna', animal_type: 'cat', breed: 'Siamese', gender: 'female', age: '~2 years', color: 'Seal point', size: 'small', features: 'Cross-eyed slightly, chatty', description: 'Vocal cat, may respond if you call her name. Wearing a pink flea collar.', location: 'Bangsar', hoursAgo: 32, photoSeed: 16 },
  { id: 'demo-mis-07', kind: 'missing', status: 'active', pet_name: 'Max', animal_type: 'dog', breed: 'German Shepherd', gender: 'male', age: '~4 years', color: 'Black and tan', size: 'large', features: 'Scar on right ear, very alert', description: 'Guard dog, not aggressive but wary of strangers. Escaped when gate was open.', location: 'Mont Kiara', hoursAgo: 40, photoSeed: 17 },
  { id: 'demo-mis-08', kind: 'missing', status: 'reunited', pet_name: 'Oreo', animal_type: 'cat', breed: 'Domestic Shorthair', gender: 'female', age: '~3 years', color: 'Black and white', size: 'small', features: 'Tuxedo pattern, white paws', description: 'REUNITED with family after 3 days — spotted in a neighbor garage. Thank you all!', location: 'Puchong', hoursAgo: 96, photoSeed: 18 },
  { id: 'demo-mis-09', kind: 'missing', status: 'active', pet_name: 'Bella', animal_type: 'dog', breed: 'Poodle Mix', gender: 'female', age: '~2 years', color: 'Apricot', size: 'small', features: 'Curly fur, pink harness', description: 'Small and quick. May be mistaken for a stray puppy. Very affectionate.', location: 'Damansara', hoursAgo: 6, photoSeed: 19 },
  { id: 'demo-mis-10', kind: 'missing', status: 'active', pet_name: 'Kiwi', animal_type: 'bird', breed: 'Cockatiel', gender: 'male', age: '~1 year', color: 'Grey and yellow', size: 'small', features: 'Yellow crest, orange cheek patches', description: 'Flew out through open balcony door. Whistles the first bars of a pop song.', location: 'Ampang', hoursAgo: 11, photoSeed: 20 },
  { id: 'demo-mis-11', kind: 'missing', status: 'resolved', pet_name: 'Rocky', animal_type: 'dog', breed: 'Mixed Local', gender: 'male', age: '~6 years', color: 'Brown', size: 'medium', features: 'Chipped, calm temperament', description: 'Resolved — found safe two streets away. Report kept for reference.', location: 'Kuala Lumpur', hoursAgo: 72, photoSeed: 21 },
  { id: 'demo-mis-12', kind: 'missing', status: 'active', pet_name: 'Mochi', animal_type: 'rabbit', breed: 'Netherland Dwarf', gender: 'female', age: '8 months', color: 'Grey', size: 'small', features: 'Very round, dark round eyes', description: 'Escaped during cage cleaning. Prefers dark quiet corners.', location: 'Subang Jaya', hoursAgo: 18, photoSeed: 22 },
  // ---- 8 found ----
  { id: 'demo-fnd-01', kind: 'found', status: 'active', pet_name: null, animal_type: 'dog', breed: 'Shih Tzu', gender: 'female', age: 'unknown', color: 'White and grey', size: 'small', features: 'Well-groomed, wearing bell collar', description: 'Found wandering near the food court. Very tame, currently safe with finder.', location: 'Kuala Lumpur', hoursAgo: 5, photoSeed: 23, found: 'found', condition: 'healthy' },
  { id: 'demo-fnd-02', kind: 'found', status: 'active', pet_name: null, animal_type: 'cat', breed: 'unknown', gender: 'unknown', age: 'unknown', color: 'Calico', size: 'medium', features: 'Pregnant — needs quiet space', description: 'Friendly stray spotted regularly near the playground. Seems to be expecting.', location: 'Petaling Jaya', hoursAgo: 9, photoSeed: 24, found: 'spotted', condition: 'healthy' },
  { id: 'demo-fnd-03', kind: 'found', status: 'active', pet_name: null, animal_type: 'dog', breed: 'Siberian Husky', gender: 'male', age: 'unknown', color: 'Black and white', size: 'large', features: 'Blue eyes, no collar', description: 'Wandering near the highway rest stop. Approachable but panting heavily.', location: 'Shah Alam', hoursAgo: 15, photoSeed: 25, found: 'found', condition: 'hungry' },
  { id: 'demo-fnd-04', kind: 'found', status: 'active', pet_name: null, animal_type: 'bird', breed: 'Lovebird', gender: 'unknown', age: 'unknown', color: 'Green and orange', size: 'small', features: 'Ring on leg, lands on shoulders', description: 'Flew into an apartment balcony. Clearly someone pet — hand-tame.', location: 'Cheras', hoursAgo: 22, photoSeed: 26, found: 'found', condition: 'healthy' },
  { id: 'demo-fnd-05', kind: 'found', status: 'active', pet_name: null, animal_type: 'cat', breed: 'unknown', gender: 'male', age: 'unknown', color: 'Grey tabby', size: 'medium', features: 'Limping front-left leg', description: 'Spotted limping near the market. Skittish but not aggressive.', location: 'Bangsar', hoursAgo: 30, photoSeed: 27, found: 'spotted', condition: 'injured' },
  { id: 'demo-fnd-06', kind: 'found', status: 'reunited', pet_name: null, animal_type: 'dog', breed: 'Jack Russell', gender: 'male', age: 'unknown', color: 'White with brown patch', size: 'small', features: 'Extremely energetic', description: 'REUNITED — owner claimed within 4 hours via PetAlert. Happy ending!', location: 'Mont Kiara', hoursAgo: 80, photoSeed: 28, found: 'found', condition: 'healthy' },
  { id: 'demo-fnd-07', kind: 'found', status: 'active', pet_name: null, animal_type: 'rabbit', breed: 'unknown', gender: 'unknown', age: 'unknown', color: 'White', size: 'small', features: 'Looks well-fed, not a wild rabbit', description: 'Found nibbling herbs in a community garden. Almost certainly an escaped pet.', location: 'Puchong', hoursAgo: 12, photoSeed: 29, found: 'found', condition: 'healthy' },
  { id: 'demo-fnd-08', kind: 'found', status: 'active', pet_name: null, animal_type: 'cat', breed: 'unknown', gender: 'female', age: 'unknown', color: 'Black', size: 'small', features: 'Thin, very hungry, sweet', description: 'Skinny black cat approaching people for food. Possibly lost recently.', location: 'Ampang', hoursAgo: 7, photoSeed: 30, found: 'found', condition: 'hungry' }
]

export function buildDemoReports(): PetReport[] {
  const now = Date.now()
  return SPECS.map(spec => {
    const loc = LOCATIONS[spec.location]
    const created = new Date(now - spec.hoursAgo * 3600_000).toISOString()
    const isMissing = spec.kind === 'missing'
    return {
      id: spec.id,
      report_code: (isMissing ? 'MIS-DEMO-' : 'FND-DEMO-') + spec.id.slice(-2).toUpperCase(),
      kind: spec.kind,
      status: spec.status,
      owner_id: isMissing ? DEMO_USER_ID : null,
      reporter_id: DEMO_USER_ID,
      pet_name: spec.pet_name ?? null,
      animal_type: spec.animal_type,
      breed: spec.breed === 'unknown' ? null : spec.breed,
      gender: spec.gender,
      age_estimate: spec.age,
      color: spec.color,
      size: spec.size,
      photos: [photo(spec.photoSeed)],
      distinctive_features: spec.features,
      description: spec.description,
      latitude: loc.lat,
      longitude: loc.lng,
      location_name: `${spec.location} (approximate area)`,
      radius_km: 5,
      event_time: created,
      found_status: isMissing ? null : spec.found ?? 'found',
      animal_condition: isMissing ? null : spec.condition ?? 'unknown',
      contact_preference: 'platform',
      contact_value: null,
      created_at: created,
      updated_at: created,
      resolved_at: spec.status === 'active' ? null : created,
      is_demo: true
    }
  })
}

/** 10 sightings spread over demo missing reports, linked back to the demo user. */
export function buildDemoSightings(): PetSighting[] {
  const targets = ['demo-mis-01', 'demo-mis-02', 'demo-mis-04', 'demo-mis-05', 'demo-mis-06', 'demo-mis-07', 'demo-mis-09', 'demo-mis-10', 'demo-mis-12', 'demo-mis-03']
  const notes = [
    'Seen near the playground, heading north towards the main road.',
    'A neighbor says the animal sleeps under their porch at night.',
    'Spotted around dusk behind the shoplots — matches the description.',
    'Possible sighting at the food court; was chased away by other strays.',
    'Someone shared a photo in the community group — looks very similar.',
    'Seen drinking water at the drain near the temple.',
    'Reported by a delivery rider at the junction, moving fast.',
    'Resting under a parked car, very scared, did not respond to name.',
    'Spotted in the community garden area early this morning.',
    'Heard a cat matching the description at night near the bins.'
  ]
  const shifts = [0.002, -0.001, 0.0015, -0.0025, 0.001, 0.003, -0.0015, 0.0022, -0.003, 0.0018]
  return targets.map((reportId, i) => {
    const spec = SPECS.find(s => s.id === reportId)!
    const loc = LOCATIONS[spec.location]
    const when = new Date(Date.now() - (spec.hoursAgo / 2) * 3600_000).toISOString()
    return {
      id: `demo-sight-${String(i + 1).padStart(2, '0')}`,
      report_id: reportId,
      reporter_id: DEMO_USER_ID,
      latitude: loc.lat + shifts[i],
      longitude: loc.lng + shifts[i],
      location_name: `${spec.location} — nearby street`,
      photos: [],
      notes: notes[i],
      seen_at: when,
      created_at: when,
      is_demo: true
    } as PetSighting
  })
}

/** Demo profile used as reporter/owner for all demo records. */
export function buildDemoProfile(): Profile {
  return {
    id: DEMO_USER_ID,
    email: 'demo@petalert.local',
    full_name: 'PetAlert Demo',
    phone: '',
    avatar_url: null,
    role: 'user',
    bio: 'Demo account — sample records for exploring PetAlert. Not a real user.',
    address_hint: null,
    location_lat: null,
    location_lng: null,
    created_at: new Date(Date.now() - 30 * 86400_000).toISOString(),
    updated_at: new Date().toISOString(),
    is_demo: true
  }
}

export interface DemoSeedStore {
  getReport(id: string): Promise<PetReport | undefined>
  putReport(r: PetReport): Promise<void>
  getSighting(id: string): Promise<PetSighting | undefined>
  putSighting(s: PetSighting): Promise<void>
  getProfile(id: string): Promise<Profile | undefined>
  putProfile(p: Profile): Promise<void>
}

/**
 * Idempotent seed — safe to run on every app start. Uses fixed IDs and never
 * touches records it doesn't own (only checks/inserts `demo-*` keys).
 */
export async function seedDemoData(store: DemoSeedStore): Promise<{ reports: number; sightings: number }> {
  let inserted = 0
  const profile = buildDemoProfile()
  if (!(await store.getProfile(profile.id))) { await store.putProfile(profile); inserted++ }
  let reports = 0
  for (const r of buildDemoReports()) {
    if (!(await store.getReport(r.id))) { await store.putReport(r); reports++ }
  }
  let sightings = 0
  for (const s of buildDemoSightings()) {
    if (!(await store.getSighting(s.id))) { await store.putSighting(s); sightings++ }
  }
  return { reports, sightings }
}
