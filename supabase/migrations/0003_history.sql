-- Upforce Hub - pipeline history
--
-- Everything the app showed before this migration was computed from current
-- state: Active MRR meant "what converted clients pay right now". That answers
-- today's question and no other. Ask "what did September close at" and there
-- was nothing to read, because a stage change overwrote the previous stage and
-- left no trace.
--
-- Two things fix that, and they answer different questions.
--
--   stage_events      append-only log of every stage change, written by a
--                     trigger as it happens. Answers WHY a month moved: how
--                     many Warm leads went Hot, where deals actually die.
--                     Cannot be backfilled - it only ever knows what happened
--                     after it existed.
--
--   monthly_snapshots one row per closed month, written by pg_cron. Answers
--                     WHAT a month closed at, as a fixed record that does not
--                     drift when a lead converts later.

-- --------------------------------------------------------------------------
-- Shared: what a lead is worth
-- --------------------------------------------------------------------------

-- The same rule the app applies in lib/engine.ts: a quoted override wins,
-- otherwise package price plus every attached add-on. Defined here so the
-- snapshot and the UI can never drift into disagreeing about one lead's MRR.
create or replace function lead_mrr_cents(p_lead leads)
returns integer
language sql
stable
as $$
  select coalesce(
    p_lead.quoted_value_cents,
    coalesce(
      (select price_cents from packages where id = p_lead.package_id), 0
    ) + coalesce(
      (select sum(a.price_cents)
         from lead_addons la
         join addons a on a.id = la.addon_id
        where la.lead_id = p_lead.id), 0
    )
  );
$$;

-- --------------------------------------------------------------------------
-- Stage transition log
-- --------------------------------------------------------------------------

create table stage_events (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads on delete cascade,

  -- null on the row that records a lead first entering the pipeline.
  from_stage  stage_id,
  to_stage    stage_id not null,

  -- The lead's MRR at the moment it moved. Denormalised on purpose: package
  -- prices change, and a September transition should keep September's price
  -- rather than being silently repriced by a later edit in Settings.
  mrr_cents   integer not null default 0,

  occurred_at timestamptz not null default now()
);

create index stage_events_lead_idx on stage_events (lead_id, occurred_at desc);
create index stage_events_month_idx on stage_events (occurred_at);

/* SECURITY DEFINER because the trigger inserts on behalf of whoever moved the
   lead, and stage_events deliberately has no insert policy - the log must not
   be writable by hand, or it stops being evidence. */
create function log_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into stage_events (lead_id, from_stage, to_stage, mrr_cents, occurred_at)
    values (new.id, null, new.stage, lead_mrr_cents(new), new.stage_entered_at);

  elsif (new.stage is distinct from old.stage) then
    insert into stage_events (lead_id, from_stage, to_stage, mrr_cents, occurred_at)
    values (new.id, old.stage, new.stage, lead_mrr_cents(new), now());
  end if;

  return new;
end;
$$;

create trigger leads_log_stage_insert
  after insert on leads
  for each row execute function log_stage_change();

create trigger leads_log_stage_update
  after update of stage on leads
  for each row execute function log_stage_change();

-- Give every lead that already exists an opening row, so the log has a
-- starting position rather than beginning mid-story. These carry the lead's
-- real stage_entered_at, so they are honest about when it got there.
insert into stage_events (lead_id, from_stage, to_stage, mrr_cents, occurred_at)
select l.id, null, l.stage, lead_mrr_cents(l), l.stage_entered_at
from leads l;

-- --------------------------------------------------------------------------
-- Monthly snapshots
-- --------------------------------------------------------------------------

create table monthly_snapshots (
  -- First day of the month being reported. One row per month, so re-running a
  -- capture corrects that month rather than duplicating it.
  month               date primary key,

  active_mrr_cents    integer not null,
  pipeline_mrr_cents  integer not null,

  lead_count          integer not null,
  converted_count     integer not null,

  -- {"hot": 3, "warm": 5, ...} - kept as jsonb so adding a stage later does
  -- not require a migration on a table that already holds closed months.
  stage_counts        jsonb not null default '{}'::jsonb,
  stage_values        jsonb not null default '{}'::jsonb,

  -- Counted from stage_events inside the month, so these are exact rather
  -- than inferred from where leads happen to sit now.
  won_count           integer not null default 0,
  lost_count          integer not null default 0,

  captured_at         timestamptz not null default now()
);

/* Captures one month.

   Honest about its own limits: the MRR figures are read from state as it
   stands WHEN THIS RUNS, and attributed to the month given. Run on the 1st,
   that is a faithful picture of how the month ended. Run it against a month
   from a year ago and you will get today's numbers under an old label -
   reconstructing historical MRR properly would need price history, which is
   deliberately out of scope.

   The won/lost counts have no such caveat. They come from stage_events and
   are exact for whatever window is asked for. */
create or replace function capture_month(p_month date default (date_trunc('month', current_date) - interval '1 month')::date)
returns monthly_snapshots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end   date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_row   monthly_snapshots;
begin
  with valued as (
    select l.stage, lead_mrr_cents(l) as mrr from leads l
  ),
  totals as (
    select
      coalesce(sum(mrr) filter (where stage = 'converted'), 0)::int as active_mrr,
      coalesce(sum(mrr) filter (where stage not in ('converted', 'dead')), 0)::int as pipeline_mrr,
      count(*)::int as lead_count,
      (count(*) filter (where stage = 'converted'))::int as converted_count
    from valued
  ),
  per_stage as (
    select stage, count(*)::int as cnt, coalesce(sum(mrr), 0)::int as val
    from valued
    group by stage
  ),
  maps as (
    select
      coalesce(jsonb_object_agg(stage::text, cnt), '{}'::jsonb) as counts,
      coalesce(jsonb_object_agg(stage::text, val), '{}'::jsonb) as vals
    from per_stage
  )
  insert into monthly_snapshots (
    month, active_mrr_cents, pipeline_mrr_cents, lead_count, converted_count,
    stage_counts, stage_values, won_count, lost_count, captured_at
  )
  select
    v_start,
    t.active_mrr,
    t.pipeline_mrr,
    t.lead_count,
    t.converted_count,
    m.counts,
    m.vals,
    (select count(*)::int from stage_events
      where to_stage = 'converted' and occurred_at >= v_start and occurred_at < v_end),
    (select count(*)::int from stage_events
      where to_stage = 'dead' and occurred_at >= v_start and occurred_at < v_end),
    now()
  from totals t cross join maps m
  on conflict (month) do update set
    active_mrr_cents   = excluded.active_mrr_cents,
    pipeline_mrr_cents = excluded.pipeline_mrr_cents,
    lead_count         = excluded.lead_count,
    converted_count    = excluded.converted_count,
    stage_counts       = excluded.stage_counts,
    stage_values       = excluded.stage_values,
    won_count          = excluded.won_count,
    lost_count         = excluded.lost_count,
    captured_at        = excluded.captured_at
  returning * into v_row;

  return v_row;
end;
$$;

-- --------------------------------------------------------------------------
-- RLS
-- --------------------------------------------------------------------------

alter table stage_events      enable row level security;
alter table monthly_snapshots enable row level security;

-- Read-only to the app. stage_events is written by its trigger and
-- monthly_snapshots by pg_cron, both SECURITY DEFINER / superuser, so neither
-- needs a write policy - and not having one is what keeps the history
-- tamper-evident.
create policy stage_events_read      on stage_events      for select to authenticated using (true);
create policy monthly_snapshots_read on monthly_snapshots for select to authenticated using (true);

/* capture_month is SECURITY DEFINER, so leaving it executable by PUBLIC would
   let any signed-in member close a month early over the REST API. Restrict it
   to the roles that actually need it - pg_cron runs as postgres, and the SQL
   editor does too, so manual calls still work. */
revoke all on function capture_month(date) from public;
revoke all on function log_stage_change() from public;

-- --------------------------------------------------------------------------
-- Schedule
--
-- Requires the pg_cron extension. On Supabase: Database -> Extensions ->
-- enable "pg_cron", or run the create extension below (it needs to run in the
-- postgres database, which the SQL editor uses).
--
-- Runs 00:05 UTC on the 1st and captures the month that just ended. If you
-- want the current month closed early, call capture_month() by hand - see the
-- comment at the bottom.
-- --------------------------------------------------------------------------

create extension if not exists pg_cron;

select cron.unschedule('upforce-close-month')
where exists (select 1 from cron.job where jobname = 'upforce-close-month');

select cron.schedule(
  'upforce-close-month',
  '5 0 1 * *',
  $$ select capture_month(); $$
);

-- Manual use:
--
--   select capture_month();                        -- close last month
--   select capture_month(date '2026-09-01');       -- close a named month
--   select * from monthly_snapshots order by month desc;
--   select * from cron.job where jobname = 'upforce-close-month';
