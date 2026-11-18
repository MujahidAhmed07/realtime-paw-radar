-- ============================================================
-- PetAlert — initial schema
-- Requires the PostGIS extension (available on Supabase):
--   Dashboard → Database → Extensions → enable "postgis"
-- Run this in the Supabase SQL editor (or via supabase db push).
-- ============================================================

create extension if not exists postgis;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  avatar_url text,
  role text not null default 'user' check (role in ('user','admin')),
  bio text,
  address_hint text,
  location_lat double precision,
  location_lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- notification_preferences ----------
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  nearby_missing_enabled boolean not null default true,
  nearby_found_enabled boolean not null default true,
  sighting_alerts_enabled boolean not null default true,
  message_alerts_enabled boolean not null default true,
  match_alerts_enabled boolean not null default true,
  status_change_alerts_enabled boolean not null default true,
  browser_push_enabled boolean not null default false,
  default_radius_km int not null default 5 check (default_radius_km in (1,3,5,10)),
  updated_at timestamptz not null default now()
);

-- ---------- pet_reports ----------
create table if not exists public.pet_reports (
  id uuid primary key default gen_random_uuid(),
  report_code text not null unique,
  kind text not null check (kind in ('missing','found')),
  status text not null default 'active' check (status in ('active','resolved','reunited','flagged','archived')),
  owner_id uuid references public.profiles(id) on delete set null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  pet_name text,
  animal_type text not null check (animal_type in ('dog','cat','bird','rabbit','reptile','other')),
  breed text,
  gender text not null default 'unknown' check (gender in ('male','female','unknown')),
  age_estimate text,
  color text,
  size text check (size in ('small','medium','large')),
  photos text[] not null default '{}',
  distinctive_features text,
  description text,
  location geography(point, 4326) not null,
  latitude double precision not null,
  longitude double precision not null,
  location_name text,
  radius_km int not null default 5 check (radius_km in (1,3,5,10)),
  event_time timestamptz not null,
  found_status text check (found_status in ('found','spotted')),
  animal_condition text check (animal_condition in ('healthy','injured','scared','hungry','unknown')),
  contact_preference text not null default 'platform' check (contact_preference in ('platform','phone','email')),
  contact_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists pet_reports_location_idx on public.pet_reports using gist (location);
create index if not exists pet_reports_kind_status_idx on public.pet_reports (kind, status);
create index if not exists pet_reports_reporter_idx on public.pet_reports (reporter_id);

-- ---------- pet_sightings ----------
create table if not exists public.pet_sightings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.pet_reports(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  location geography(point, 4326) not null,
  latitude double precision not null,
  longitude double precision not null,
  location_name text,
  photos text[] not null default '{}',
  notes text not null default '',
  seen_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists pet_sightings_report_idx on public.pet_sightings (report_id);

-- ---------- notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('nearby_missing','nearby_found','new_sighting','new_message','ai_match','status_change','reunited')),
  title text not null,
  body text not null default '',
  data jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------- conversations & messages ----------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.pet_reports(id) on delete cascade,
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  unique (report_id, participant_a, participant_b)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at);

-- ---------- saved_reports ----------
create table if not exists public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid not null references public.pet_reports(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, report_id)
);

-- ---------- user_locations (privacy-conscious: single row per user) ----------
create table if not exists public.user_locations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  location geography(point, 4326) not null,
  updated_at timestamptz not null default now()
);

-- ---------- report_flags ----------
create table if not exists public.report_flags (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.pet_reports(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz not null default now()
);

-- ---------- ai_match_results (future AI service writes here) ----------
create table if not exists public.ai_match_results (
  id uuid primary key default gen_random_uuid(),
  missing_report_id uuid not null references public.pet_reports(id) on delete cascade,
  found_report_id uuid not null references public.pet_reports(id) on delete cascade,
  similarity double precision not null,
  method text not null default 'clip-v0',
  status text not null default 'suggested' check (status in ('suggested','confirmed','rejected')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Helpers
-- ============================================================

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.report_code(kind text)
returns text language sql volatile as $$
  select upper(left(kind, 3)) || '-' ||
    upper(to_hex((extract(epoch from now()) * 1000)::bigint)) ||
    upper(substr(md5(random()::text), 1, 3));
$$;

-- ============================================================
-- Triggers
-- ============================================================

-- Auto-create profile + default prefs on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  insert into public.notification_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-set report_code if not provided
create or replace function public.handle_report_code()
returns trigger language plpgsql as $$
begin
  if new.report_code is null or new.report_code = '' then
    new.report_code := public.report_code(new.kind);
  end if;
  if new.kind = 'missing' and new.owner_id is null then
    new.owner_id := new.reporter_id;
  end if;
  return new;
end $$;

drop trigger if exists set_report_code on public.pet_reports;
create trigger set_report_code before insert on public.pet_reports
  for each row execute function public.handle_report_code();

-- Nearby-user fan-out + owner notifications (server-side, bypasses RLS as definer)
create or replace function public.handle_report_notifications()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p record;
  dist double precision;
  topic text;
begin
  if new.status <> 'active' then return new; end if;
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

drop trigger if exists fanout_nearby_alerts on public.pet_reports;
create trigger fanout_nearby_alerts after insert on public.pet_reports
  for each row execute function public.handle_report_notifications();

-- Owner notification on new sighting
create or replace function public.handle_new_sighting()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r public.pet_reports;
begin
  select * into r from public.pet_reports where id = new.report_id;
  if r is null then return new; end if;
  if coalesce(r.owner_id, r.reporter_id) <> new.reporter_id then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      coalesce(r.owner_id, r.reporter_id),
      'new_sighting',
      '👀 New sighting for ' || coalesce(r.pet_name, r.report_code),
      left(new.notes, 120),
      jsonb_build_object('report_id', r.id, 'sighting_id', new.id, 'conversation_partner', new.reporter_id)
    );
  end if;
  return new;
end $$;

drop trigger if exists notify_owner_sighting on public.pet_sightings;
create trigger notify_owner_sighting after insert on public.pet_sightings
  for each row execute function public.handle_new_sighting();

-- Message → conversation bump + recipient notification
create or replace function public.handle_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c public.conversations;
  other uuid;
  sender_name text;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if c is null then return new; end if;
  update public.conversations
    set last_message_at = new.created_at, last_message_preview = left(new.body, 80)
    where id = new.conversation_id;
  other := case when c.participant_a = new.sender_id then c.participant_b else c.participant_a end;
  select full_name into sender_name from public.profiles where id = new.sender_id;
  insert into public.notifications (user_id, type, title, body, data)
  values (other, 'new_message', '💬 New message from ' || coalesce(sender_name, 'a user'),
          left(new.body, 100), jsonb_build_object('conversation_id', c.id, 'report_id', c.report_id));
  return new;
end $$;

drop trigger if exists bump_conversation on public.messages;
create trigger bump_conversation after insert on public.messages
  for each row execute function public.handle_new_message();

-- Reunited notification
create or replace function public.handle_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> old.status and new.status = 'reunited' then
    new.resolved_at := now();
    if new.owner_id is not null and new.owner_id <> auth.uid() then
      insert into public.notifications (user_id, type, title, body, data)
      values (new.owner_id, 'reunited', '🎉 Reunited!',
              coalesce(new.pet_name, 'Your pet') || ' is home!',
              jsonb_build_object('report_id', new.id));
    end if;
  elsif new.status <> old.status and new.owner_id is not null and new.owner_id <> auth.uid() then
    insert into public.notifications (user_id, type, title, body, data)
    values (new.owner_id, 'status_change', 'Report status updated',
            'Your report ' || new.report_code || ' is now "' || new.status || '".',
            jsonb_build_object('report_id', new.id));
  end if;
  return new;
end $$;

drop trigger if exists notify_status_change on public.pet_reports;
create trigger notify_status_change after update on public.pet_reports
  for each row execute function public.handle_status_change();

-- ============================================================
-- RPC functions (used by the frontend)
-- ============================================================

create or replace function public.search_reports_near(
  lat double precision, lng double precision, radius_m double precision,
  p_kind text default null, p_animal_type text default null,
  p_status text default null, p_search text default null
)
returns setof public.pet_reports
language sql stable as $$
  select *
  from public.pet_reports r
  where st_dwithin(r.location, st_setsrid(st_makepoint(lng, lat), 4326)::geography, radius_m)
    and (p_kind is null or r.kind = p_kind)
    and (p_animal_type is null or r.animal_type = p_animal_type)
    and (p_status is null or r.status = p_status or r.status <> 'archived' and p_status is null)
    and (p_search is null or r.report_code ilike '%' || p_search || '%'
         or coalesce(r.pet_name,'') ilike '%' || p_search || '%'
         or coalesce(r.breed,'') ilike '%' || p_search || '%'
         or coalesce(r.location_name,'') ilike '%' || p_search || '%')
  order by st_distance(r.location, st_setsrid(st_makepoint(lng, lat), 4326)::geography)
  limit 200;
$$;

create or replace function public.get_or_create_conversation(p_report_id uuid, p_user_a uuid, p_user_b uuid)
returns public.conversations
language plpgsql security definer set search_path = public as $$
declare
  c public.conversations;
begin
  if p_user_a = p_user_b then
    raise exception 'Cannot start a conversation with yourself';
  end if;
  select * into c from public.conversations
    where report_id = p_report_id
      and (participant_a = p_user_a and participant_b = p_user_b
        or participant_a = p_user_b and participant_b = p_user_a);
  if c is not null then return c; end if;
  insert into public.conversations (report_id, participant_a, participant_b)
  values (p_report_id, least(p_user_a, p_user_b), greatest(p_user_a, p_user_b))
  returning * into c;
  return c;
end $$;

create or replace function public.set_user_role(target_user uuid, new_role text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if new_role not in ('user','admin') then raise exception 'Invalid role'; end if;
  update public.profiles set role = new_role, updated_at = now() where id = target_user;
end $$;

create or replace function public.admin_delete_user(target_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if target_user = auth.uid() then raise exception 'Cannot delete yourself'; end if;
  delete from auth.users where id = target_user;
end $$;

create or replace function public.admin_stats()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'active_missing', (select count(*) from public.pet_reports where kind='missing' and status='active'),
    'active_found', (select count(*) from public.pet_reports where kind='found' and status='active'),
    'reunited', (select count(*) from public.pet_reports where status='reunited'),
    'recent_sightings', (select count(*) from public.pet_sightings where created_at > now() - interval '7 days'),
    'open_flags', (select count(*) from public.report_flags where status='open'),
    'reports_last_7d', (select count(*) from public.pet_reports where created_at > now() - interval '7 days')
  );
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.pet_reports enable row level security;
alter table public.pet_sightings enable row level security;
alter table public.notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.saved_reports enable row level security;
alter table public.user_locations enable row level security;
alter table public.report_flags enable row level security;
alter table public.ai_match_results enable row level security;

-- profiles: everyone can read public info; users update own; admins read all + update roles via RPC
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (auth.uid() = id or public.is_admin());
drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self" on public.profiles for insert with check (auth.uid() = id);

-- notification_preferences: own only
drop policy if exists "prefs own" on public.notification_preferences;
create policy "prefs own" on public.notification_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- pet_reports: authenticated users read active/others + own everything; CRUD own; admins all
drop policy if exists "reports read" on public.pet_reports;
create policy "reports read" on public.pet_reports for select
  using (status <> 'archived' or reporter_id = auth.uid() or public.is_admin());
drop policy if exists "reports insert" on public.pet_reports;
create policy "reports insert" on public.pet_reports for insert with check (auth.uid() = reporter_id);
drop policy if exists "reports update" on public.pet_reports;
create policy "reports update" on public.pet_reports for update
  using (auth.uid() = reporter_id or auth.uid() = owner_id or public.is_admin());
drop policy if exists "reports delete" on public.pet_reports;
create policy "reports delete" on public.pet_reports for delete using (public.is_admin());

-- pet_sightings: read for signed-in users; insert own; reporters of the parent report may read all
drop policy if exists "sightings read" on public.pet_sightings;
create policy "sightings read" on public.pet_sightings for select using (true);
drop policy if exists "sightings insert" on public.pet_sightings;
create policy "sightings insert" on public.pet_sightings for insert with check (auth.uid() = reporter_id);

-- notifications: strictly own
drop policy if exists "notifications own" on public.notifications;
create policy "notifications own" on public.notifications for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- conversations: participants only
drop policy if exists "conversations participants" on public.conversations;
create policy "conversations participants" on public.conversations for select
  using (auth.uid() = participant_a or auth.uid() = participant_b or public.is_admin());
drop policy if exists "conversations insert participants" on public.conversations;
create policy "conversations insert participants" on public.conversations for insert
  with check (auth.uid() = participant_a or auth.uid() = participant_b);

-- messages: participants only
drop policy if exists "messages participants read" on public.messages;
create policy "messages participants read" on public.messages for select
  using (exists (select 1 from public.conversations c
                 where c.id = conversation_id
                   and (c.participant_a = auth.uid() or c.participant_b = auth.uid())));
drop policy if exists "messages insert" on public.messages;
create policy "messages insert" on public.messages for insert
  with check (auth.uid() = sender_id and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.participant_a = auth.uid() or c.participant_b = auth.uid())));

-- saved_reports: own
drop policy if exists "saved own" on public.saved_reports;
create policy "saved own" on public.saved_reports for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_locations: own (upsert handled by frontend)
drop policy if exists "locations own" on public.user_locations;
create policy "locations own" on public.user_locations for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- report_flags: anyone can create; admins manage
drop policy if exists "flags insert" on public.report_flags;
create policy "flags insert" on public.report_flags for insert with check (auth.uid() = reporter_id);
drop policy if exists "flags admin read" on public.report_flags;
create policy "flags admin read" on public.report_flags for select using (public.is_admin() or auth.uid() = reporter_id);
drop policy if exists "flags admin update" on public.report_flags;
create policy "flags admin update" on public.report_flags for update using (public.is_admin());

-- ai_match_results: readable by the owner of the missing report + admins; written by service_role (AI service)
drop policy if exists "matches read" on public.ai_match_results;
create policy "matches read" on public.ai_match_results for select
  using (public.is_admin() or exists (
    select 1 from public.pet_reports m where m.id = missing_report_id
      and (m.owner_id = auth.uid() or m.reporter_id = auth.uid())));

-- ============================================================
-- Storage bucket for pet photos
-- ============================================================
insert into storage.buckets (id, name, public) values ('pet-photos', 'pet-photos', true)
  on conflict (id) do nothing;

drop policy if exists "pet-photos public read" on storage.objects;
create policy "pet-photos public read" on storage.objects for select
  using (bucket_id = 'pet-photos');
drop policy if exists "pet-photos user upload" on storage.objects;
create policy "pet-photos user upload" on storage.objects for insert
  with check (bucket_id = 'pet-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "pet-photos user delete" on storage.objects;
create policy "pet-photos user delete" on storage.objects for delete
  using (bucket_id = 'pet-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
