create table if not exists public.market_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  as_of timestamptz not null unique,
  score numeric(5,2) not null check (score between 0 and 100),
  risk_score numeric(5,2) not null check (risk_score between 0 and 100),
  signal text not null check (signal in ('green', 'yellow', 'red')),
  market_regime text not null
    check (market_regime in ('risk_on', 'neutral_rotation', 'high_volatility', 'risk_off')),
  component_scores jsonb not null default '{}'::jsonb,
  strategy_bias jsonb not null default '{}'::jsonb,
  confidence_score numeric(5,2) not null check (confidence_score between 0 and 100),
  rule_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.macro_indicator_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_zh text not null,
  unit text not null,
  frequency text not null,
  source_name text not null,
  display_order integer not null,
  is_dashboard_core boolean not null default false
);

create table if not exists public.macro_indicator_values (
  indicator_id uuid not null references public.macro_indicator_definitions(id) on delete cascade,
  observation_date date not null,
  value numeric not null,
  display_value text,
  trend_note text,
  state text not null check (state in ('positive', 'neutral', 'negative')),
  released_at timestamptz not null,
  vintage_at timestamptz not null default now(),
  primary key (indicator_id, observation_date, vintage_at)
);

create table if not exists public.discovery_runs (
  id uuid primary key default gen_random_uuid(),
  as_of timestamptz not null,
  status text not null check (status in ('pending', 'running', 'completed', 'failed')),
  market_scope text not null default 'TWSE_TPEX',
  rule_version text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.discovery_candidates (
  run_id uuid not null references public.discovery_runs(id) on delete cascade,
  stock_id uuid not null references public.stocks(id) on delete cascade,
  rank integer not null check (rank > 0),
  discovery_score numeric(5,2) not null,
  category text not null,
  layer_results jsonb not null,
  rank_reasons jsonb not null default '[]'::jsonb,
  risk_flags jsonb not null default '[]'::jsonb,
  primary key (run_id, stock_id),
  unique (run_id, rank)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null
    check (report_type in ('daily_market', 'weekly_core_pool', 'stock_war_room', 'risk_alert')),
  user_id uuid references auth.users(id) on delete cascade,
  stock_id uuid references public.stocks(id) on delete cascade,
  title text not null,
  period_start date,
  period_end date,
  as_of timestamptz not null,
  summary text not null,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'published',
  model_identifier text,
  prompt_version text,
  rule_version text not null,
  published_at timestamptz
);

create index if not exists market_score_as_of_idx
  on public.market_score_snapshots (as_of desc);
create index if not exists discovery_run_as_of_idx
  on public.discovery_runs (as_of desc) where status = 'completed';
create index if not exists reports_type_as_of_idx
  on public.reports (report_type, as_of desc);

alter table public.market_score_snapshots enable row level security;
alter table public.macro_indicator_definitions enable row level security;
alter table public.macro_indicator_values enable row level security;
alter table public.discovery_runs enable row level security;
alter table public.discovery_candidates enable row level security;
alter table public.reports enable row level security;

create policy "Authenticated users read market scores"
  on public.market_score_snapshots for select to authenticated using (true);
create policy "Authenticated users read indicator definitions"
  on public.macro_indicator_definitions for select to authenticated using (true);
create policy "Authenticated users read indicator values"
  on public.macro_indicator_values for select to authenticated using (true);
create policy "Authenticated users read discovery runs"
  on public.discovery_runs for select to authenticated using (true);
create policy "Authenticated users read discovery candidates"
  on public.discovery_candidates for select to authenticated using (true);
create policy "Users read public and own reports"
  on public.reports for select to authenticated
  using (user_id is null or user_id = auth.uid());
