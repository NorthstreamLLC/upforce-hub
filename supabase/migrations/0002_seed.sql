-- Upforce Hub - baseline data
--
-- Production taxonomy only. Everything here is required: the app cannot
-- schedule a single touch without cadence steps, and cannot price a lead
-- without packages.
--
-- No sample leads live in this file, deliberately. A seed that quietly plants
-- fake creators into a real workspace is a trap, and it springs at the worst
-- moment - the first time someone resets a database or spins up staging.
-- Demo leads are in supabase/demo_data.sql, which nothing runs by accident.

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
--
-- All four seed as NOT connected, with no address. The prototype shipped these
-- pre-connected to a fictional jordan@upforcehub.com, which would have the
-- Calendar page assert a working Google sync on day one - to a person who does
-- not exist, over an integration that is not wired. Better to show the truth
-- and let someone connect them.
-- --------------------------------------------------------------------------

insert into calendar_accounts (key, name, detail, connected, sort) values
  ('gcal',        'Google Calendar', '', false, 0),
  ('outlook',     'Outlook',         '', false, 1),
  ('apple',       'Apple Calendar',  '', false, 2),
  ('cadencedock', 'CadenceDock',     'app.cadencedock.com · two-way sync, AI auto-booking', false, 3);

insert into app_settings (key, value) values
  ('team_share', '{"url":"app.cadencedock.com/team/upforce","shared":true}'::jsonb);
