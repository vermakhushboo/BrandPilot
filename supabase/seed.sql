-- BrandPilot seed data
-- Run after schema.sql. Uses fixed UUIDs for stable references.

-- ---------------------------------------------------------------------------
-- Creator profile
-- ---------------------------------------------------------------------------

insert into creator_profiles (
  id,
  name,
  handle,
  niche,
  followers,
  bio,
  rates,
  audience,
  platforms
) values (
  'a0000000-0000-4000-8000-000000000001',
  'Alex Chen',
  '@alexchen_dev',
  'Technical AI & DevTools',
  '142K',
  'Staff engineer turned creator. I write about AI agents, developer productivity, and shipping fast with modern tooling.',
  '{
    "base_rate": 7000,
    "linkedin": 5500,
    "x_thread": 2500,
    "bundle_discount": 0.10,
    "currency": "USD"
  }'::jsonb,
  '{
    "primary_geo": "US + EU",
    "senior_engineers_pct": 78,
    "ai_ml_interest_pct": 65,
    "devtools_interest_pct": 82,
    "avg_engagement_rate": 4.2
  }'::jsonb,
  '[
    {"platform": "linkedin", "followers": 98000},
    {"platform": "x", "followers": 44000}
  ]'::jsonb
);

-- ---------------------------------------------------------------------------
-- Atoms inbound deal
-- ---------------------------------------------------------------------------

insert into deals (
  id,
  creator_profile_id,
  brand_name,
  brand_logo,
  product,
  stage,
  fit_score,
  quoted_rate,
  metadata
) values (
  'd0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'Atoms',
  '⚛',
  'Atoms AI IDE Launch Sponsorship',
  'inbound',
  null,
  null,
  '{
    "source": "inbound_email",
    "contact": "partnerships@atoms.dev",
    "deliverables": ["1 LinkedIn post", "1 X thread"],
    "proposed_budget": 6000,
    "launch_window": "2026-07-15",
    "notes": "Inbound inquiry — agents have not yet qualified or quoted."
  }'::jsonb
);

insert into messages (
  deal_id,
  sender,
  body,
  created_at
) values
  (
    'd0000000-0000-4000-8000-000000000001',
    'brand',
    'Hi Alex — we''re launching Atoms, an AI-native IDE for full-stack developers. Your audience building with Cursor and Copilot would be a perfect fit. Interested in a sponsored LinkedIn + X package for our July launch?',
    '2026-06-24 09:12:00+00'
  ),
  (
    'd0000000-0000-4000-8000-000000000001',
    'agent',
    'Thanks for reaching out! I''m Alex''s deal desk. Can you share your target launch date, exact deliverables, and budget range?',
    '2026-06-24 09:14:00+00'
  );

insert into agent_runs (
  deal_id,
  agent_name,
  action,
  status,
  input,
  output,
  created_at
) values (
  'd0000000-0000-4000-8000-000000000001',
  'Intake Agent',
  'Logged inbound Atoms sponsorship inquiry',
  'completed',
  '{"channel": "email", "brand": "Atoms"}'::jsonb,
  '{"stage": "inbound", "awaiting_brand_reply": true}'::jsonb,
  '2026-06-24 09:13:00+00'
);

-- ---------------------------------------------------------------------------
-- Organic calendar posts (no deal)
-- ---------------------------------------------------------------------------

insert into calendar_posts (
  id,
  creator_profile_id,
  deal_id,
  platform,
  title,
  content,
  scheduled_at,
  status,
  is_sponsored,
  metadata
) values
  (
    'c0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    null,
    'linkedin',
    'Why I stopped chasing 10x dev tools',
    'Hot take: the best productivity gain this quarter wasn''t a new IDE — it was deleting half my toolchain.\n\nWhat I kept:\n▸ One agent for code review\n▸ One observability stack\n▸ One deployment path\n\nLess context-switching beats another plugin every time.',
    '2026-06-26 14:00:00+00',
    'scheduled',
    false,
    '{"tags": ["devtools", "productivity"], "pillar": "opinion"}'::jsonb
  ),
  (
    'c0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    null,
    'x',
    'Agent eval thread',
    '🧵 How I eval AI coding agents (the boring version that actually works):\n\n1/ Fixed task set — 20 real PRs from my repos\n2/ Score: correctness, diff size, test pass rate\n3/ Run each agent 3x, take median\n\nNo vibes. Just numbers.',
    '2026-06-27 16:30:00+00',
    'scheduled',
    false,
    '{"format": "thread", "pillar": "technical"}'::jsonb
  ),
  (
    'c0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    null,
    'linkedin',
    'Ship log: autonomous deal desk',
    'Built a small agent pipeline this week that qualifies inbound brand deals, quotes rates, and gates content on payment.\n\nHackathon scope, but the payment gates are non-negotiable in production too.',
    '2026-06-28 10:00:00+00',
    'draft',
    false,
    '{"tags": ["ai", "agents", "buildinpublic"], "pillar": "project_update"}'::jsonb
  );
