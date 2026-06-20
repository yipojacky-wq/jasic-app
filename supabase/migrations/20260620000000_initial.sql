create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  risk_profile text not null default 'balanced'
    check (risk_profile in ('conservative', 'balanced', 'aggressive', 'growth')),
  timezone text not null default 'Asia/Taipei',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stocks (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  exchange text not null check (exchange in ('TWSE', 'TPEx', 'ESB')),
  name_zh text not null,
  industry_code text,
  is_active boolean not null default true,
  unique (exchange, symbol)
);

create table if not exists public.stock_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks(id) on delete cascade,
  as_of timestamptz not null,
  market_score numeric(5,2),
  institution_score numeric(5,2),
  chip_score numeric(5,2),
  oi_score numeric(5,2),
  technical_score numeric(5,2),
  total_score numeric(5,2) not null check (total_score between 0 and 100),
  confidence_score numeric(5,2) not null check (confidence_score between 0 and 100),
  risk_score numeric(5,2) not null check (risk_score between 0 and 100),
  signal text not null check (signal in ('green', 'yellow', 'red')),
  evidence jsonb not null default '{}'::jsonb,
  rule_version text not null
);

create index if not exists stock_scores_lookup
  on public.stock_score_snapshots (stock_id, as_of desc);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '我的觀察清單',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  stock_id uuid not null references public.stocks(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (watchlist_id, stock_id)
);

create table if not exists public.ai_check_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stock_id uuid not null references public.stocks(id),
  cost numeric(16,4) not null check (cost > 0),
  quantity_shares numeric(16,4) not null check (quantity_shares > 0),
  investment_horizon text not null,
  risk_profile text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_check_results (
  request_id uuid primary key references public.ai_check_requests(id) on delete cascade,
  action text not null check (action in ('ADD', 'HOLD', 'WAIT', 'REDUCE', 'STOP_LOSS')),
  conclusion text not null,
  reasons jsonb not null,
  risks jsonb not null,
  suggestions jsonb not null,
  confidence numeric(5,2) not null check (confidence between 0 and 100),
  facts_snapshot jsonb not null,
  model_identifier text not null,
  prompt_version text not null,
  rule_version text not null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.watchlists (user_id, name, is_default)
  values (new.id, '我的觀察清單', true)
  on conflict (user_id, name) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.stocks enable row level security;
alter table public.stock_score_snapshots enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.ai_check_requests enable row level security;
alter table public.ai_check_results enable row level security;

create policy "Users read own profile"
  on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Authenticated users read stocks"
  on public.stocks for select to authenticated using (true);
create policy "Authenticated users read stock scores"
  on public.stock_score_snapshots for select to authenticated using (true);
create policy "Users manage own watchlists"
  on public.watchlists for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users manage own watchlist items"
  on public.watchlist_items for all to authenticated
  using (
    exists (
      select 1 from public.watchlists w
      where w.id = watchlist_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.watchlists w
      where w.id = watchlist_id and w.user_id = auth.uid()
    )
  );
create policy "Users manage own AI requests"
  on public.ai_check_requests for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users read own AI results"
  on public.ai_check_results for select to authenticated
  using (
    exists (
      select 1 from public.ai_check_requests r
      where r.id = request_id and r.user_id = auth.uid()
    )
  );
