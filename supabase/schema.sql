-- BrandPilot schema
-- PostgreSQL 13+ (gen_random_uuid() is built-in)

-- ---------------------------------------------------------------------------
-- creator_profiles
-- ---------------------------------------------------------------------------

create table creator_profiles (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  handle        text not null,
  niche         text not null,
  followers     text not null,
  bio           text,
  rates         jsonb not null default '{}'::jsonb,
  audience      jsonb not null default '{}'::jsonb,
  platforms     jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

comment on table creator_profiles is 'Single creator profile for the MVP deal desk';
comment on column creator_profiles.rates is 'Base and per-platform rate cards, e.g. {"linkedin": 5000, "x": 2500}';
comment on column creator_profiles.audience is 'Audience demographics and overlap stats for brand fit scoring';

-- ---------------------------------------------------------------------------
-- deals
-- ---------------------------------------------------------------------------

create table deals (
  id                  uuid primary key default gen_random_uuid(),
  creator_profile_id  uuid not null references creator_profiles (id) on delete cascade,
  brand_name          text not null,
  brand_logo          text,
  product             text not null,
  stage               text not null default 'inbound',
  fit_score           integer,
  quoted_rate         numeric(10, 2),
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),

  constraint deals_stage_check check (
    stage in (
      'inbound',
      'qualified',
      'negotiating',
      'advance_requested',
      'advance_paid',
      'drafting',
      'brand_review',
      'final_payment_requested',
      'final_paid',
      'ready_to_post'
    )
  ),
  constraint deals_fit_score_range check (
    fit_score is null or (fit_score >= 0 and fit_score <= 100)
  )
);

create index deals_creator_profile_id_idx on deals (creator_profile_id);
create index deals_stage_idx on deals (stage);

comment on table deals is 'Brand sponsorship deals managed by BrandPilot agents';
comment on column deals.metadata is 'Negotiation terms, deliverables, timeline, and other deal context';

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------

create table messages (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references deals (id) on delete cascade,
  sender      text not null,
  body        text not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),

  constraint messages_sender_check check (
    sender in ('brand', 'creator', 'agent')
  )
);

create index messages_deal_id_idx on messages (deal_id);
create index messages_deal_id_created_at_idx on messages (deal_id, created_at);

comment on table messages is 'WhatsApp-style conversation thread between brand, creator, and agents';

-- ---------------------------------------------------------------------------
-- agent_runs
-- ---------------------------------------------------------------------------

create table agent_runs (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references deals (id) on delete cascade,
  agent_name  text not null,
  action      text not null,
  status      text not null default 'completed',
  input       jsonb not null default '{}'::jsonb,
  output      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),

  constraint agent_runs_status_check check (
    status in ('pending', 'running', 'completed', 'failed')
  )
);

create index agent_runs_deal_id_idx on agent_runs (deal_id);
create index agent_runs_deal_id_created_at_idx on agent_runs (deal_id, created_at desc);
create index agent_runs_agent_name_idx on agent_runs (agent_name);

comment on table agent_runs is 'Audit log of every autonomous agent action on a deal';

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------

create table payments (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references deals (id) on delete cascade,
  type        text not null,
  amount      numeric(10, 2) not null,
  status      text not null default 'pending',
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),

  constraint payments_type_check check (
    type in ('advance', 'final')
  ),
  constraint payments_status_check check (
    status in ('pending', 'paid', 'failed', 'refunded')
  ),
  constraint payments_amount_positive check (amount > 0)
);

create index payments_deal_id_idx on payments (deal_id);
create unique index payments_deal_id_type_unique on payments (deal_id, type);

comment on table payments is 'Advance (50%) and final (50%) payment records with verification metadata';
comment on column payments.metadata is 'Invoice IDs, payment provider refs, verification timestamps';

-- ---------------------------------------------------------------------------
-- drafts
-- ---------------------------------------------------------------------------

create table drafts (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references deals (id) on delete cascade,
  platform    text not null,
  content     text not null,
  status      text not null default 'pending',
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),

  constraint drafts_platform_check check (
    platform in ('linkedin', 'x')
  ),
  constraint drafts_status_check check (
    status in ('pending', 'approved', 'rejected', 'revised')
  )
);

create index drafts_deal_id_idx on drafts (deal_id);

comment on table drafts is 'Agent-generated sponsored content drafts awaiting brand approval';

-- ---------------------------------------------------------------------------
-- calendar_posts
-- ---------------------------------------------------------------------------

create table calendar_posts (
  id                  uuid primary key default gen_random_uuid(),
  creator_profile_id  uuid not null references creator_profiles (id) on delete cascade,
  deal_id             uuid references deals (id) on delete set null,
  platform            text not null,
  title               text,
  content             text not null,
  scheduled_at        timestamptz,
  status              text not null default 'scheduled',
  is_sponsored        boolean not null default false,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),

  constraint calendar_posts_platform_check check (
    platform in ('linkedin', 'x', 'youtube', 'newsletter')
  ),
  constraint calendar_posts_status_check check (
    status in ('draft', 'scheduled', 'posted', 'cancelled')
  )
);

create index calendar_posts_creator_profile_id_idx on calendar_posts (creator_profile_id);
create index calendar_posts_deal_id_idx on calendar_posts (deal_id) where deal_id is not null;
create index calendar_posts_scheduled_at_idx on calendar_posts (scheduled_at);

comment on table calendar_posts is 'Organic and sponsored content calendar; deal_id set only for sponsored slots';

-- ---------------------------------------------------------------------------
-- approvals
-- ---------------------------------------------------------------------------

create table approvals (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references deals (id) on delete cascade,
  draft_id    uuid references drafts (id) on delete set null,
  status      text not null default 'pending',
  feedback    jsonb not null default '{}'::jsonb,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),

  constraint approvals_status_check check (
    status in ('pending', 'approved', 'rejected', 'changes_requested')
  )
);

create index approvals_deal_id_idx on approvals (deal_id);
create index approvals_draft_id_idx on approvals (draft_id) where draft_id is not null;

comment on table approvals is 'Brand approval requests for drafts and final post authorization';
