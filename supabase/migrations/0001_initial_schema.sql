-- Upforce Hub - initial schema
--
-- One internal workspace, every signed-in member sees the same pipeline. There
-- is no per-rep partition here on purpose: Upforce is a small team working a
-- shared funnel, and hiding leads from each other would make the daily queue
-- useless. RLS therefore gates on "is authenticated", not on ownership.
--
-- The one thing worth understanding before reading further: a lead's retarget
-- clock is derived, never stored. `stage_entered_at` is the only fact; days in
-- stage, the next scheduled touch and whether a demotion is due are all read
-- off it at query time. Storing a day counter would mean a nightly job that
-- can silently stop running and leave every clock frozen.

create extension if not exists "pgcrypto";

-- --------------------------------------------------------------------------
-- Enums
-- --------------------------------------------------------------------------

create type stage_id as enum (
  'cold', 'warm', 'hot', 'converted', 'reactivation', 'dead'
);

create type touch_channel as enum ('Email', 'DM', 'Call');

create type meeting_kind as enum ('meeting', 'internal');

-- --------------------------------------------------------------------------
-- People
-- --------------------------------------------------------------------------

create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  full_name   text not null default '',
  created_at  timestamptz not null default now()
);

-- A row per member, created on signup so the app never has to handle a
-- signed-in user with no profile.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- --------------------------------------------------------------------------
-- Taxonomy - all of it editable from Settings
-- --------------------------------------------------------------------------

create table tags (
  id     uuid primary key default gen_random_uuid(),
  name   text not null unique,
  color  text not null default '#8A8077',
  sort   integer not null default 0
);

create table platforms (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique,
  sort  integer not null default 0
);

create table sources (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique,
  sort  integer not null default 0
);

-- Upforce sells a retainer package plus optional add-ons. One package per
-- lead; any number of add-ons.
create table packages (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  price_cents  integer not null default 0 check (price_cents >= 0),
  sort         integer not null default 0
);

create table addons (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  price_cents  integer not null default 0 check (price_cents >= 0),
  sort         integer not null default 0
);

-- --------------------------------------------------------------------------
-- Cadences - the retarget ladders, one per stage
-- --------------------------------------------------------------------------

create table cadences (
  stage       stage_id primary key,
  demote_day  integer not null default 30 check (demote_day >= 0)
);

create table cadence_steps (
  id     uuid primary key default gen_random_uuid(),
  stage  stage_id not null references cadences (stage) on delete cascade,
  day    integer not null check (day >= 0),
  label  text not null,
  sort   integer not null default 0
);

create index cadence_steps_stage_idx on cadence_steps (stage, sort);

-- --------------------------------------------------------------------------
-- Leads
-- --------------------------------------------------------------------------

create table leads (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  audience           text not null default '',
  stage              stage_id not null default 'cold',

  -- The clock. Reset to now() on every stage change, alongside touches = 0.
  stage_entered_at   timestamptz not null default now(),
  touches            integer not null default 0 check (touches >= 0),

  -- Set only when the deal was priced off the rate card. Null means "compute
  -- from package + add-ons", which is the normal case.
  quoted_value_cents integer check (quoted_value_cents >= 0),

  notes              text not null default '',
  source_id          uuid references sources on delete set null,
  package_id         uuid references packages on delete set null,
  owner_id           uuid references profiles on delete set null,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index leads_stage_idx on leads (stage);
create index leads_clock_idx on leads (stage, stage_entered_at);

create function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_updated_at
  before update on leads
  for each row execute function touch_updated_at();

-- A lead can be several accounts on several platforms. Row sort 0 is the
-- primary account - the handle every list view shows.
create table lead_socials (
  id        uuid primary key default gen_random_uuid(),
  lead_id   uuid not null references leads on delete cascade,
  platform  text not null,
  handle    text not null,
  sort      integer not null default 0
);

create index lead_socials_lead_idx on lead_socials (lead_id, sort);

create table lead_tags (
  lead_id  uuid not null references leads on delete cascade,
  tag_id   uuid not null references tags on delete cascade,
  primary key (lead_id, tag_id)
);

create table lead_addons (
  lead_id   uuid not null references leads on delete cascade,
  addon_id  uuid not null references addons on delete cascade,
  primary key (lead_id, addon_id)
);

-- Append-only. Logging a touch writes here and increments leads.touches, which
-- is what advances the ladder.
create table touches (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads on delete cascade,
  channel     touch_channel not null,
  detail      text not null default '',
  logged_by   uuid references profiles on delete set null,
  created_at  timestamptz not null default now()
);

create index touches_lead_idx on touches (lead_id, created_at desc);

-- --------------------------------------------------------------------------
-- Calendar
-- --------------------------------------------------------------------------

-- day_of_week is 0 = Monday .. 6 = Sunday, matching the week grid columns.
create table meetings (
  id           uuid primary key default gen_random_uuid(),
  day_of_week  integer not null check (day_of_week between 0 and 6),
  time_label   text not null,
  title        text not null,
  kind         meeting_kind not null default 'meeting',
  lead_id      uuid references leads on delete set null,
  created_at   timestamptz not null default now()
);

create index meetings_day_idx on meetings (day_of_week);

-- Connection state only. No provider tokens live here - wiring CadenceDock and
-- the calendar providers is a separate piece of work, and this table must not
-- become the place someone parks a refresh token.
create table calendar_accounts (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  name       text not null,
  detail     text not null default '',
  connected  boolean not null default false,
  sort       integer not null default 0
);

create table app_settings (
  key    text primary key,
  value  jsonb not null
);

-- --------------------------------------------------------------------------
-- Row Level Security
-- --------------------------------------------------------------------------

alter table profiles          enable row level security;
alter table tags              enable row level security;
alter table platforms         enable row level security;
alter table sources           enable row level security;
alter table packages          enable row level security;
alter table addons            enable row level security;
alter table cadences          enable row level security;
alter table cadence_steps     enable row level security;
alter table leads             enable row level security;
alter table lead_socials      enable row level security;
alter table lead_tags         enable row level security;
alter table lead_addons       enable row level security;
alter table touches           enable row level security;
alter table meetings          enable row level security;
alter table calendar_accounts enable row level security;
alter table app_settings      enable row level security;

-- Shared workspace: any authenticated member reads and writes everything.
-- Written as a loop because sixteen hand-copied policy blocks is sixteen
-- chances to leave one table open.
do $$
declare
  t text;
begin
  foreach t in array array[
    'tags', 'platforms', 'sources', 'packages', 'addons',
    'cadences', 'cadence_steps', 'leads', 'lead_socials', 'lead_tags',
    'lead_addons', 'touches', 'meetings', 'calendar_accounts', 'app_settings'
  ]
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_member_all', t
    );
  end loop;
end;
$$;

-- Profiles are the exception: everyone reads the roster, nobody edits anyone
-- else's row.
create policy profiles_read   on profiles for select to authenticated using (true);
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
