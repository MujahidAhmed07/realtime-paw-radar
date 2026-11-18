-- ============================================================
-- PetAlert — seed data (optional demo content)
-- Run AFTER 0001_init.sql. Requires you to be signed in as an
-- admin, OR adjust the UUIDs to real profile ids.
-- For local dev backend you don't need this file — the app
-- creates an admin account automatically (admin@petalert.local / Admin1234!)
-- ============================================================

-- Promote a specific user to admin (replace with the email you registered):
-- update public.profiles set role = 'admin' where email = 'you@example.com';

-- Sample reports (uses fixed uuids for profiles if none exist — adjust):
-- Inserting demo rows is best done from the running app so owner/reporter
-- foreign keys match real auth.users rows. Example for one report:

-- insert into public.pet_reports
--   (reporter_id, owner_id, kind, status, pet_name, animal_type, breed, gender,
--    color, size, photos, description, latitude, longitude, location, radius_km,
--    event_time, contact_preference)
-- values
--   ('<profile-uuid>', '<profile-uuid>', 'missing', 'active', 'Max', 'dog', 'Golden Retriever',
--    'male', 'Golden', 'large', '{}', 'Friendly, wearing a red collar.',
--    41.0082, 28.9784, st_setsrid(st_makepoint(28.9784, 41.0082), 4326), 5,
--    now() - interval '2 hours', 'platform');
