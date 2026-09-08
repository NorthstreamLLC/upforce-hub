-- Upforce Hub - baseline data
--
-- Two different kinds of thing live in this file.
--
-- The cadences, packages, add-ons, platforms and sources are REAL: they are the
-- taxonomy the app cannot function without, and the ladders are the product's
-- core logic. Keep them.
--
-- The sixteen leads at the bottom are DEMO data carried over from the design
-- prototype so the app has something to show on first run. Delete that block
-- before going live, or run it against a scratch project only.

-- --------------------------------------------------------------------------
-- Cadences
-- --------------------------------------------------------------------------

insert into cadences (stage, demote_day) values
  ('cold', 67),
  ('warm', 30),
  ('hot', 30),
  ('converted', 0),
  ('reactivation', 545),
  ('dead', 365);

insert into cadence_steps (stage, day, label, sort) values
  ('cold',   7, 'Bump the first email',              0),
  ('cold',  37, 'New angle — send a sample edit',    1),
  ('cold',  67, 'Last call before we archive',       2),

  ('warm',   7, 'Answer their open questions',       0),
  ('warm',  14, 'Send pricing and a case study',     1),
  ('warm',  21, 'Ask for a call this week',          2),

  ('hot',    3, 'Follow up on the pricing call',     0),
  ('hot',   10, 'Ask for the yes',                   1),

  ('reactivation',  90, 'Worth bringing back yet?',           0),
  ('reactivation', 180, 'Reach out — ask what changed',       1),
  ('reactivation', 365, 'Put one more offer on the table',    2),
  ('reactivation', 545, 'Final attempt',                      3),

  ('dead', 180, 'Six-month check — still cold?',     0),
  ('dead', 365, 'Last ping, then close it out',      1);

-- --------------------------------------------------------------------------
-- Taxonomy
-- --------------------------------------------------------------------------

insert into platforms (name, sort) values
  ('YouTube', 0), ('TikTok', 1), ('Instagram', 2),
  ('Twitch', 3), ('X', 4), ('Multi-platform', 5);

insert into sources (name, sort) values
  ('Inbound form', 0), ('Referral', 1), ('Cold email', 2), ('Cold DM', 3),
  ('LinkedIn', 4), ('Outbound list', 5), ('Past client', 6), ('Manual', 7);

insert into tags (name, color, sort) values
  ('Gaming',           '#8B7BD8', 0),
  ('Fitness',          '#3FBF7F', 1),
  ('Shorts-only',      '#E9A83B', 2),
  ('Long-form',        '#5B9BD5', 3),
  ('Enterprise',       '#5B9BD5', 4),
  ('Referral',         '#F2683C', 5),
  ('High value',       '#C9A227', 6),
  ('Needs thumbnails', '#8B7BD8', 7),
  ('Slow replier',     '#6B6560', 8),
  ('Past client',      '#C9A227', 9);

-- --------------------------------------------------------------------------
-- Pricing
--
-- The three retainers Upforce actually sells. Add-on prices are not yet set -
-- they seed at zero and are editable in Settings, so a lead can carry an add-on
-- before anyone has decided what it costs without corrupting the MRR figure.
-- --------------------------------------------------------------------------

insert into packages (name, price_cents, sort) values
  ('Gaming & Content Creators',  60000, 0),
  ('Business & Podcast',         75000, 1),
  ('Gambling Creators',         125000, 2);

insert into addons (name, price_cents, sort) values
  ('Animated graphics',      0, 0),
  ('Stream overlays',        0, 1),
  ('Branding',               0, 2),
  ('In-person events',       0, 3),
  ('Affiliate funnels',      0, 4),
  ('Website development',    0, 5),
  ('Affiliate cross-checker',0, 6),
  ('Sponsorship offers',     0, 7);

-- --------------------------------------------------------------------------
-- Calendar
-- --------------------------------------------------------------------------

insert into calendar_accounts (key, name, detail, connected, sort) values
  ('gcal',        'Google Calendar', 'jordan@upforcehub.com', true,  0),
  ('outlook',     'Outlook',         'ops@upforcehub.com',    true,  1),
  ('apple',       'Apple Calendar',  'jordan@icloud.com',     false, 2),
  ('cadencedock', 'CadenceDock',     'app.cadencedock.com · two-way sync, AI auto-booking', true, 3);

insert into app_settings (key, value) values
  ('team_share', '{"url":"app.cadencedock.com/team/upforce","shared":true}'::jsonb);

-- ==========================================================================
-- DEMO DATA BELOW THIS LINE - delete before production use
-- ==========================================================================

-- Clocks are seeded relative to now() so the queue is live on first run rather
-- than showing a pile of leads all overdue by the same amount.
with seed (name, handle, platform, audience, stage, days_in, touches, notes, source, pkg, tags, addons) as (
  values
  ('Nappyboy Gaming','@nappyboygaming','YouTube','412K','hot',12,1,'Inbound from reel. Pricing sent — wants the 3-video/wk tier. Asked about thumbnail turnaround.','Inbound form','Gaming & Content Creators',array['Gaming','High value','Needs thumbnails'],array['Animated graphics','Sponsorship offers']),
  ('Marcus Plays','@marcusplays','YouTube','128K','hot',4,1,'Demo edit delivered, loved the pacing. Waiting on his manager to sign.','Referral','Gaming & Content Creators',array['Gaming','Referral'],array['Stream overlays']),
  ('Blue Ski','@blueski','TikTok','890K','warm',9,1,'Replied to cold DM. Wants a shorts-only package quote.','Cold DM','Gaming & Content Creators',array['Shorts-only','High value'],array[]::text[]),
  ('Dara Fitness','@darafit','Instagram','54K','warm',23,3,'Three touches in. Interested but currently on a retainer elsewhere until Q4.','Cold email','Business & Podcast',array['Fitness','Slow replier'],array[]::text[]),
  ('HexaLabs','@hexalabs','Multi-platform','21K','warm',31,3,'B2B. Demotes to Cold today — 30 days without a reply.','LinkedIn','Business & Podcast',array['Enterprise','High value'],array['Website development','Branding']),
  ('Rook & Rye','@rookandrye','YouTube','76K','cold',8,1,'Opened both emails, no reply yet.','Cold email','Business & Podcast',array['Long-form'],array[]::text[]),
  ('Ava Sato','@avasato','TikTok','233K','cold',38,1,'Second touch is overdue — try a different hook.','Cold DM','Gaming & Content Creators',array['Shorts-only'],array[]::text[]),
  ('Tundra FC','@tundrafc','YouTube','1.1M','cold',66,2,'Big fish. Last shot before archive.','Outbound list','Gambling Creators',array['High value','Long-form'],array['Affiliate funnels','Affiliate cross-checker']),
  ('Kite Studio','@kitestudio','Multi-platform','12K','cold',70,3,'Ladder exhausted — ready to archive.','Outbound list','Gaming & Content Creators',array['Slow replier'],array[]::text[]),
  ('Sunny Lo','@sunnylo','TikTok','340K','converted',54,0,'Onboarded May. Daily shorts + weekly long-form.','Inbound form','Gaming & Content Creators',array['Shorts-only','High value'],array['Animated graphics']),
  ('Grit Garage','@gritgarage','YouTube','188K','converted',121,0,'Renewed for 6 months.','Referral','Business & Podcast',array['Long-form','Referral'],array['Branding']),
  ('Volt Athletics','@voltath','Instagram','67K','converted',18,0,'New. First thumbnail batch shipped.','Inbound form','Business & Podcast',array['Fitness','Needs thumbnails'],array[]::text[]),
  ('Pixel Pantry','@pixelpantry','YouTube','95K','reactivation',96,1,'Paused for budget in June, left happy. Worth a look.','Past client','Gaming & Content Creators',array['Past client','Long-form'],array[]::text[]),
  ('Nova Reads','@novareads','TikTok','44K','reactivation',186,1,'Hard retarget due — six months out.','Past client','Gaming & Content Creators',array['Past client','Shorts-only'],array[]::text[]),
  ('Drift Motors','@driftmotors','YouTube','310K','dead',201,1,'Went in-house. 12-month ping still scheduled.','Cold email','Gambling Creators',array['Long-form'],array[]::text[]),
  ('Loop Cafe','@loopcafe','Instagram','9K','dead',44,0,'Too small, wrong fit.','Cold DM','Business & Podcast',array['Slow replier'],array[]::text[])
),
inserted as (
  insert into leads (name, audience, stage, stage_entered_at, touches, notes, source_id, package_id)
  select
    s.name,
    s.audience,
    s.stage::stage_id,
    now() - make_interval(days => s.days_in),
    s.touches,
    s.notes,
    (select id from sources  where name = s.source),
    (select id from packages where name = s.pkg)
  from seed s
  returning id, name
)
insert into lead_socials (lead_id, platform, handle, sort)
select i.id, s.platform, s.handle, 0
from inserted i join seed s on s.name = i.name;

-- Secondary accounts. A lead is often the same person on three platforms, and
-- search has to find them by any of the three.
insert into lead_socials (lead_id, platform, handle, sort)
select l.id, x.platform, x.handle, x.sort
from (values
  ('Nappyboy Gaming', 'TikTok',    '@nappyboyclips', 1),
  ('Nappyboy Gaming', 'Twitch',    '@nappyboy',      2),
  ('Blue Ski',        'Instagram', '@blue.ski',      1),
  ('HexaLabs',        'YouTube',   '@hexalabs',      1),
  ('HexaLabs',        'Instagram', '@hexa.labs',     2),
  ('Sunny Lo',        'YouTube',   '@sunnylolongform', 1),
  ('Tundra FC',       'TikTok',    '@tundrafc',      1),
  ('Tundra FC',       'Instagram', '@tundra.fc',     2),
  ('Grit Garage',     'Instagram', '@gritgarage',    1),
  ('Pixel Pantry',    'TikTok',    '@pixelpantry',   1)
) as x (lead_name, platform, handle, sort)
join leads l on l.name = x.lead_name;

insert into lead_tags (lead_id, tag_id)
select l.id, t.id
from (values
  ('Nappyboy Gaming', array['Gaming','High value','Needs thumbnails']),
  ('Marcus Plays',    array['Gaming','Referral']),
  ('Blue Ski',        array['Shorts-only','High value']),
  ('Dara Fitness',    array['Fitness','Slow replier']),
  ('HexaLabs',        array['Enterprise','High value']),
  ('Rook & Rye',      array['Long-form']),
  ('Ava Sato',        array['Shorts-only']),
  ('Tundra FC',       array['High value','Long-form']),
  ('Kite Studio',     array['Slow replier']),
  ('Sunny Lo',        array['Shorts-only','High value']),
  ('Grit Garage',     array['Long-form','Referral']),
  ('Volt Athletics',  array['Fitness','Needs thumbnails']),
  ('Pixel Pantry',    array['Past client','Long-form']),
  ('Nova Reads',      array['Past client','Shorts-only']),
  ('Drift Motors',    array['Long-form']),
  ('Loop Cafe',       array['Slow replier'])
) as x (lead_name, tag_names)
join leads l on l.name = x.lead_name
join tags  t on t.name = any (x.tag_names);

insert into lead_addons (lead_id, addon_id)
select l.id, a.id
from (values
  ('Nappyboy Gaming', array['Animated graphics','Sponsorship offers']),
  ('Marcus Plays',    array['Stream overlays']),
  ('HexaLabs',        array['Website development','Branding']),
  ('Tundra FC',       array['Affiliate funnels','Affiliate cross-checker']),
  ('Sunny Lo',        array['Animated graphics']),
  ('Grit Garage',     array['Branding'])
) as x (lead_name, addon_names)
join leads  l on l.name = x.lead_name
join addons a on a.name = any (x.addon_names);

-- One history row per logged touch, so the drawer is not empty on a lead that
-- the seed says has already been touched twice.
insert into touches (lead_id, channel, detail, created_at)
select
  l.id,
  'Email'::touch_channel,
  'Touch ' || g.n || ' logged',
  l.stage_entered_at + make_interval(days => g.n * 7)
from leads l
cross join lateral generate_series(1, l.touches) as g (n)
where l.touches > 0;

insert into meetings (day_of_week, time_label, title, kind, lead_id) values
  (0, '10:00', 'Pricing call — Nappyboy Gaming', 'meeting',
     (select id from leads where name = 'Nappyboy Gaming')),
  (1, '14:30', 'Onboarding — Volt Athletics', 'meeting',
     (select id from leads where name = 'Volt Athletics')),
  (2, '09:15', 'Team standup', 'internal', null),
  (3, '16:00', 'Intro call — Blue Ski', 'meeting',
     (select id from leads where name = 'Blue Ski')),
  (4, '11:00', 'Q4 pipeline review', 'internal', null);
