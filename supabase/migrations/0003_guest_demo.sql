-- ============================================================
-- PetAlert — migration 0003: Guest mode & demo data
-- Backward-compatible: adds nullable is_demo columns (existing rows
-- default to NOT demo), guards the nearby-alert trigger, and seeds
-- idempotent demo records. Run AFTER 0001_init.sql.
-- ============================================================

-- ---------- is_demo columns ----------
alter table public.pet_reports add column if not exists is_demo boolean not null default false;
alter table public.pet_sightings add column if not exists is_demo boolean not null default false;
alter table public.profiles add column if not exists is_demo boolean not null default false;

create index if not exists pet_reports_demo_idx on public.pet_reports (is_demo);

-- ---------- guard the nearby fan-out trigger ----------
create or replace function public.handle_report_notifications()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p record;
  dist double precision;
  topic text;
begin
  if new.status <> 'active' then return new; end if;
  if new.is_demo then return new; end if;  -- demo records never alert real users
  topic := case when new.kind = 'missing' then 'nearby_missing_enabled' else 'nearby_found_enabled' end;

  for p in
    select np.*, pr.id as pid
    from public.notification_preferences np
    join public.profiles pr on pr.id = np.user_id
    where np.user_id <> new.reporter_id
      and case when new.kind = 'missing' then np.nearby_missing_enabled else np.nearby_found_enabled end
      and pr.location_lat is not null
      and st_dwithin(
            st_setsrid(st_makepoint(pr.location_lng, pr.location_lat), 4326)::geography,
            new.location,
            np.default_radius_km * 1000)
  loop
    dist := st_distance(
      st_setsrid(st_makepoint(p.location_lng, p.location_lat), 4326)::geography,
      new.location) / 1000.0;
    insert into public.notifications (user_id, type, title, body, data)
    values (
      p.pid,
      case when new.kind = 'missing' then 'nearby_missing' else 'nearby_found' end,
      case when new.kind = 'missing' then '🐾 Missing ' || new.animal_type || ' nearby' else '🐾 Found ' || new.animal_type || ' nearby' end,
      coalesce(new.pet_name, 'A pet') || ' was reported ~' || round(dist::numeric, 1) || ' km from you.',
      jsonb_build_object('report_id', new.id, 'distance_km', round(dist::numeric, 1))
    );
  end loop;
  return new;
end $$;

-- ---------- RLS: demo records readable by everyone, writable only by admins ----------
drop policy if exists "demo reports public read" on public.pet_reports;
create policy "demo reports public read" on public.pet_reports for select using (is_demo = true);

drop policy if exists "demo sightings public read" on public.pet_sightings;
create policy "demo sightings public read" on public.pet_sightings for select using (is_demo = true);

drop policy if exists "profiles demo read" on public.profiles;
create policy "profiles demo read" on public.profiles for select using (is_demo = true);

-- Only admins (or service_role seed scripts) can insert/update/delete demo rows
drop policy if exists "demo reports admin write" on public.pet_reports;
create policy "demo reports admin write" on public.pet_reports for update using (public.is_admin()) with check (public.is_admin());

-- ---------- idempotent demo seed ----------
-- Fixed demo-user row (no auth.users record — login impossible by design;
-- data is only reachable via the public-read policies above).
insert into public.profiles (id, email, full_name, role, bio, is_demo)
values ('00000000-0000-0000-0000-00000000dem0'::uuid, 'demo@petalert.local', 'PetAlert Demo', 'user',
        'Demo account — sample records for exploring PetAlert. Not a real user.', true)
on conflict (id) do nothing;

-- Sample reports (12 missing + 8 found). Deterministic IDs -> idempotent.
insert into public.pet_reports
  (id, report_code, kind, status, owner_id, reporter_id, pet_name, animal_type, breed, gender,
   age_estimate, color, size, photos, distinctive_features, description, location, latitude, longitude,
   location_name, radius_km, event_time, found_status, animal_condition, contact_preference, is_demo)
values
  ('00000000-0000-0000-0000-100000000001','MIS-DEMO-01','missing','active','00000000-0000-0000-0000-00000000dem0','00000000-0000-0000-0000-00000000dem0','Bruno','dog','Golden Retriever','male','~3 years','Golden','large','{"https://placedog.net/640/480?id=1"}','Red collar, white chest patch','Very friendly, responds to name. Slipped out during evening walk near the park.',st_setsrid(st_makepoint(101.6869,3.1390),4326),3.1390,101.6869,'Kuala Lumpur (approximate area)',5, now() - interval '3 hours', null, null, 'platform', true),
  ('00000000-0000-0000-0000-100000000002','MIS-DEMO-02','missing','active','00000000-0000-0000-0000-00000000dem0','00000000-0000-0000-0000-00000000dem0','Milo','cat','Domestic Shorthair','male','~2 years','Orange tabby','medium','{"https://picsum.photos/seed/petalert2/640/480"}','Notched left ear, green eyes','Outdoor cat, did not return for dinner.',st_setsrid(st_makepoint(101.6067,3.1073),4326),3.1073,101.6067,'Petaling Jaya (approximate area)',5, now() - interval '8 hours', null, null, 'platform', true),
  ('00000000-0000-0000-0000-100000000003','MIS-DEMO-03','missing','active','00000000-0000-0000-0000-00000000dem0','00000000-0000-0000-0000-00000000dem0','Coco','rabbit','Holland Lop','female','~1 year','White and brown','small','{"https://picsum.photos/seed/petalert3/640/480"}','Floppy ears, grey spot on nose','Escaped from hutch in the garden.',st_setsrid(st_makepoint(101.5808,3.0430),4326),3.0430,101.5808,'Subang Jaya (approximate area)',5, now() - interval '14 hours', null, null, 'platform', true),
  ('00000000-0000-0000-0000-100000000004','MIS-DEMO-04','missing','active','00000000-0000-0000-0000-00000000dem0','00000000-0000-0000-0000-00000000dem0','Simba','cat','Persian','male','~4 years','Cream','medium','{"https://picsum.photos/seed/petalert4/640/480"}','Long fur, blue eyes','Indoor cat missing after window screen came loose.',st_setsrid(st_makepoint(101.5185,3.0733),4326),3.0733,101.5185,'Shah Alam (approximate area)',5, now() - interval '20 hours', null, null, 'platform', true),
  ('00000000-0000-0000-0000-100000000005','MIS-DEMO-05','missing','active','00000000-0000-0000-0000-00000000dem0','00000000-0000-0000-0000-00000000dem0','Charlie','dog','Beagle','male','~5 years','Tricolor','medium','{"https://placedog.net/640/480?id=5"}','Blue collar with name tag','Food-motivated escape artist.',st_setsrid(st_makepoint(101.7226,3.1015),4326),3.1015,101.7226,'Cheras (approximate area)',5, now() - interval '26 hours', null, null, 'platform', true),
  ('00000000-0000-0000-0000-100000000006','MIS-DEMO-06','missing','active','00000000-0000-0000-0000-00000000dem0','00000000-0000-0000-0000-00000000dem0','Luna','cat','Siamese','female','~2 years','Seal point','small','{"https://picsum.photos/seed/petalert6/640/480"}','Chatty, pink flea collar','Vocal cat, may respond to her name.',st_setsrid(st_makepoint(101.6756,3.1273),4326),3.1273,101.6756,'Bangsar (approximate area)',5, now() - interval '32 hours', null, null, 'platform', true),
  ('00000000-0000-0000-0000-100000000007','MIS-DEMO-07','missing','active','00000000-0000-0000-0000-00000000dem0','00000000-0000-0000-0000-00000000dem0','Max','dog','German Shepherd','male','~4 years','Black and tan','large','{"https://placedog.net/640/480?id=7"}','Scar on right ear','Guard dog, wary of strangers. Escaped when gate was open.',st_setsrid(st_makepoint(101.6498,3.1710),4326),3.1710,101.6498,'Mont Kiara (approximate area)',5, now() - interval '40 hours', null, null, 'platform', true),
  ('00000000-0000-0000-0000-100000000008','MIS-DEMO-08','missing','reunited','00000000-0000-0000-0000-00000000dem0','00000000-0000-0000-0000-00000000dem0','Oreo','cat','Domestic Shorthair','female','~3 years','Black and white','small','{"https://picsum.photos/seed/petalert8/640/480"}','Tuxedo pattern, white paws','REUNITED with family after 3 days.',st_setsrid(st_makepoint(101.6160,3.0190),4326),3.0190,101.6160,'Puchong (approximate area)',5, now() - interval '96 hours', null, null, 'platform', true),
  ('00000000-0000-0000-0000-100000000009','MIS-DEMO-09','missing','active','00000000-0000-0000-0000-00000000dem0','00000000-0000-0000-0000-00000000dem0','Bella','dog','Poodle Mix','female','~2 years','Apricot','small','{"https://placedog.net/640/480?id=9"}','Curly fur, pink harness','Small and quick. Very affectionate.',st_setsrid(st_makepoint(101.6100,3.1470),4326),3.1470,101.6100,'Damansara (approximate area)',5, now() - interval '6 hours', null, null, 'platform', true),
  ('00000000-0000-0000-0000-100000000010','MIS-DEMO-10','missing','active','00000000-0000-0000-0000-00000000dem0','00000000-0000-0000-0000-00000000dem0','Kiwi','bird','Cockatiel','male','~1 year','Grey and yellow','small','{"https://picsum.photos/seed/petalert10/640/480"}','Yellow crest, orange cheeks','Flew out through open balcony door. Whistles a pop song.',st_setsrid(st_makepoint(101.7620,3.1480),4326),3.1480,101.7620,'Ampang (approximate area)',5, now() - interval '11 hours', null, null, 'platform', true),
  ('00000000-0000-0000-0000-100000000011','MIS-DEMO-11','missing','resolved','00000000-0000-0000-0000-00000000dem0','00000000-0000-0000-0000-00000000dem0','Rocky','dog','Mixed Local','male','~6 years','Brown','medium','{"https://placedog.net/640/480?id=11"}','Chipped, calm temperament','Resolved — found safe two streets away.',st_setsrid(st_makepoint(101.6869,3.1390),4326),3.1390,101.6869,'Kuala Lumpur (approximate area)',5, now() - interval '72 hours', null, null, 'platform', true),
  ('00000000-0000-0000-0000-100000000012','MIS-DEMO-12','missing','active','00000000-0000-0000-0000-00000000dem0','00000000-0000-0000-0000-00000000dem0','Mochi','rabbit','Netherland Dwarf','female','8 months','Grey','small','{"https://picsum.photos/seed/petalert12/640/480"}','Very round, dark round eyes','Escaped during cage cleaning. Prefers dark quiet corners.',st_setsrid(st_makepoint(101.5808,3.0450),4326),3.0450,101.5808,'Subang Jaya (approximate area)',5, now() - interval '18 hours', null, null, 'platform', true),
  ('00000000-0000-0000-0000-200000000001','FND-DEMO-01','found','active',null,'00000000-0000-0000-0000-00000000dem0',null,'dog','Shih Tzu','female','unknown','White and grey','small','{"https://placedog.net/640/480?id=13"}','Well-groomed, bell collar','Found wandering near the food court. Tame.',st_setsrid(st_makepoint(101.6869,3.1400),4326),3.1400,101.6869,'Kuala Lumpur (approximate area)',5, now() - interval '5 hours','found','healthy','platform', true),
  ('00000000-0000-0000-0000-200000000002','FND-DEMO-02','found','active',null,'00000000-0000-0000-0000-00000000dem0',null,'cat',null,'unknown','unknown','Calico','medium','{"https://picsum.photos/seed/petalert14/640/480"}','Pregnant — needs quiet space','Friendly stray spotted near the playground.',st_setsrid(st_makepoint(101.6067,3.1080),4326),3.1080,101.6067,'Petaling Jaya (approximate area)',5, now() - interval '9 hours','spotted','healthy','platform', true),
  ('00000000-0000-0000-0000-200000000003','FND-DEMO-03','found','active',null,'00000000-0000-0000-0000-00000000dem0',null,'dog','Siberian Husky','male','unknown','Black and white','large','{"https://placedog.net/640/480?id=15"}','Blue eyes, no collar','Wandering near the highway rest stop.',st_setsrid(st_makepoint(101.5185,3.0740),4326),3.0740,101.5185,'Shah Alam (approximate area)',5, now() - interval '15 hours','found','hungry','platform', true),
  ('00000000-0000-0000-0000-200000000004','FND-DEMO-04','found','active',null,'00000000-0000-0000-0000-00000000dem0',null,'bird','Lovebird','unknown','unknown','Green and orange','small','{"https://picsum.photos/seed/petalert16/640/480"}','Ring on leg, hand-tame','Flew into an apartment balcony. Clearly someone pet.',st_setsrid(st_makepoint(101.7226,3.1020),4326),3.1020,101.7226,'Cheras (approximate area)',5, now() - interval '22 hours','found','healthy','platform', true),
  ('00000000-0000-0000-0000-200000000005','FND-DEMO-05','found','active',null,'00000000-0000-0000-0000-00000000dem0',null,'cat',null,'male','unknown','Grey tabby','medium','{"https://picsum.photos/seed/petalert17/640/480"}','Limping front-left leg','Spotted limping near the market. Skittish.',st_setsrid(st_makepoint(101.6756,3.1280),4326),3.1280,101.6756,'Bangsar (approximate area)',5, now() - interval '30 hours','spotted','injured','platform', true),
  ('00000000-0000-0000-0000-200000000006','FND-DEMO-06','found','reunited',null,'00000000-0000-0000-0000-00000000dem0',null,'dog','Jack Russell','male','unknown','White with brown patch','small','{"https://placedog.net/640/480?id=18"}','Extremely energetic','REUNITED — owner claimed within 4 hours via PetAlert.',st_setsrid(st_makepoint(101.6498,3.1720),4326),3.1720,101.6498,'Mont Kiara (approximate area)',5, now() - interval '80 hours','found','healthy','platform', true),
  ('00000000-0000-0000-0000-200000000007','FND-DEMO-07','found','active',null,'00000000-0000-0000-0000-00000000dem0',null,'rabbit',null,'unknown','unknown','White','small','{"https://picsum.photos/seed/petalert19/640/480"}','Well-fed, not a wild rabbit','Found in a community garden. Likely an escaped pet.',st_setsrid(st_makepoint(101.6160,3.0200),4326),3.0200,101.6160,'Puchong (approximate area)',5, now() - interval '12 hours','found','healthy','platform', true),
  ('00000000-0000-0000-0000-200000000008','FND-DEMO-08','found','active',null,'00000000-0000-0000-0000-00000000dem0',null,'cat',null,'female','unknown','Black','small','{"https://picsum.photos/seed/petalert20/640/480"}','Thin, very hungry, sweet','Skinny black cat approaching people for food.',st_setsrid(st_makepoint(101.7620,3.1490),4326),3.1490,101.7620,'Ampang (approximate area)',5, now() - interval '7 hours','found','hungry','platform', true)
on conflict (id) do nothing;

-- 10 sample sightings (deterministic IDs)
insert into public.pet_sightings
  (id, report_id, reporter_id, location, latitude, longitude, location_name, photos, notes, seen_at, is_demo)
values
  ('00000000-0000-0000-0000-300000000001','00000000-0000-0000-0000-100000000001','00000000-0000-0000-0000-00000000dem0',st_setsrid(st_makepoint(101.6889,3.1410),4326),3.1410,101.6889,'Kuala Lumpur — nearby street','{}','Seen near the playground, heading north towards the main road.', now() - interval '1 hour', true),
  ('00000000-0000-0000-0000-300000000002','00000000-0000-0000-0000-100000000002','00000000-0000-0000-0000-00000000dem0',st_setsrid(st_makepoint(101.6057,3.1063),4326),3.1063,101.6057,'Petaling Jaya — nearby street','{}','A neighbor says the cat sleeps under their porch at night.', now() - interval '4 hours', true),
  ('00000000-0000-0000-0000-300000000003','00000000-0000-0000-0000-100000000004','00000000-0000-0000-0000-00000000dem0',st_setsrid(st_makepoint(101.5200,3.0748),4326),3.0748,101.5200,'Shah Alam — nearby street','{}','Spotted around dusk behind the shoplots — matches the description.', now() - interval '9 hours', true),
  ('00000000-0000-0000-0000-300000000004','00000000-0000-0000-0000-100000000005','00000000-0000-0000-0000-00000000dem0',st_setsrid(st_makepoint(101.7201,3.0990),4326),3.0990,101.7201,'Cheras — nearby street','{}','Possible sighting at the food court.', now() - interval '13 hours', true),
  ('00000000-0000-0000-0000-300000000005','00000000-0000-0000-0000-100000000006','00000000-0000-0000-0000-00000000dem0',st_setsrid(st_makepoint(101.6741,3.1288),4326),3.1288,101.6741,'Bangsar — nearby street','{}','Someone shared a photo in the community group — looks very similar.', now() - interval '16 hours', true),
  ('00000000-0000-0000-0000-300000000006','00000000-0000-0000-0000-100000000007','00000000-0000-0000-0000-00000000dem0',st_setsrid(st_makepoint(101.6528,3.1732),4326),3.1732,101.6528,'Mont Kiara — nearby street','{}','Seen drinking water at the drain near the temple.', now() - interval '20 hours', true),
  ('00000000-0000-0000-0000-300000000007','00000000-0000-0000-0000-100000000009','00000000-0000-0000-0000-00000000dem0',st_setsrid(st_makepoint(101.6115,3.1485),4326),3.1485,101.6115,'Damansara — nearby street','{}','Reported by a delivery rider at the junction, moving fast.', now() - interval '3 hours', true),
  ('00000000-0000-0000-0000-300000000008','00000000-0000-0000-0000-100000000010','00000000-0000-0000-0000-00000000dem0',st_setsrid(st_makepoint(101.7642,3.1492),4326),3.1492,101.7642,'Ampang — nearby street','{}','Resting under a parked car, very scared.', now() - interval '6 hours', true),
  ('00000000-0000-0000-0000-300000000009','00000000-0000-0000-0000-100000000012','00000000-0000-0000-0000-00000000dem0',st_setsrid(st_makepoint(101.5790,3.0440),4326),3.0440,101.5790,'Subang Jaya — community garden','{}','Spotted in the community garden area early this morning.', now() - interval '10 hours', true),
  ('00000000-0000-0000-0000-300000000010','00000000-0000-0000-0000-100000000003','00000000-0000-0000-0000-00000000dem0',st_setsrid(st_makepoint(101.5823,3.0420),4326),3.0420,101.5823,'Subang Jaya — nearby bins','{}','Heard a rabbit might be near the bins at night.', now() - interval '8 hours', true)
on conflict (id) do nothing;
