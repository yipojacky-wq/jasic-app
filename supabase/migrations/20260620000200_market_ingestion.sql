create table if not exists public.data_sources (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  provider text not null,
  dataset_name text not null,
  endpoint text not null,
  update_frequency text not null,
  attribution_text text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_code text not null references public.data_sources(code),
  dataset_date date,
  status text not null check (status in ('running', 'completed', 'failed', 'partial')),
  records_received integer not null default 0,
  records_valid integer not null default 0,
  records_rejected integer not null default 0,
  error_summary text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.stock_daily_prices (
  stock_id uuid not null references public.stocks(id) on delete cascade,
  trade_date date not null,
  open numeric(16,4),
  high numeric(16,4),
  low numeric(16,4),
  close numeric(16,4) not null,
  change numeric(16,4),
  volume bigint not null check (volume >= 0),
  turnover numeric(24,2),
  trades bigint,
  source_code text not null references public.data_sources(code),
  ingested_at timestamptz not null default now(),
  primary key (stock_id, trade_date)
);

create table if not exists public.institutional_flows_daily (
  stock_id uuid not null references public.stocks(id) on delete cascade,
  trade_date date not null,
  foreign_net bigint not null default 0,
  investment_trust_net bigint not null default 0,
  dealer_net bigint not null default 0,
  total_net bigint not null default 0,
  source_code text not null references public.data_sources(code),
  ingested_at timestamptz not null default now(),
  primary key (stock_id, trade_date)
);

create table if not exists public.stock_features_daily (
  stock_id uuid not null references public.stocks(id) on delete cascade,
  trade_date date not null,
  ma5 numeric(16,4),
  ma20 numeric(16,4),
  return_5d numeric(12,6),
  volatility_20d numeric(12,6),
  volume_ratio_20d numeric(12,6),
  institution_net_5d bigint,
  feature_version text not null,
  calculated_at timestamptz not null default now(),
  primary key (stock_id, trade_date, feature_version)
);

create table if not exists public.rule_versions (
  id uuid primary key default gen_random_uuid(),
  rule_type text not null,
  version text not null,
  config jsonb not null,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  change_note text,
  unique (rule_type, version)
);

create index if not exists stock_prices_date_idx
  on public.stock_daily_prices (trade_date desc, stock_id);
create index if not exists institutional_flows_date_idx
  on public.institutional_flows_daily (trade_date desc, stock_id);
create index if not exists ingestion_runs_source_idx
  on public.ingestion_runs (source_code, started_at desc);
create unique index if not exists stock_score_snapshot_version_idx
  on public.stock_score_snapshots (stock_id, as_of, rule_version);

alter table public.data_sources enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.stock_daily_prices enable row level security;
alter table public.institutional_flows_daily enable row level security;
alter table public.stock_features_daily enable row level security;
alter table public.rule_versions enable row level security;

create policy "Authenticated users read data sources"
  on public.data_sources for select to authenticated using (true);
create policy "Authenticated users read daily prices"
  on public.stock_daily_prices for select to authenticated using (true);
create policy "Authenticated users read institutional flows"
  on public.institutional_flows_daily for select to authenticated using (true);
create policy "Authenticated users read stock features"
  on public.stock_features_daily for select to authenticated using (true);
create policy "Authenticated users read active rules"
  on public.rule_versions for select to authenticated using (
    effective_from <= now() and (effective_to is null or effective_to > now())
  );

insert into public.data_sources
  (code, provider, dataset_name, endpoint, update_frequency, attribution_text)
values
  (
    'TWSE_STOCK_DAY_ALL',
    'Taiwan Stock Exchange',
    '上市個股日成交資訊',
    'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL',
    'trading_day_eod',
    '資料來源：臺灣證券交易所 OpenAPI'
  ),
  (
    'TWSE_T86',
    'Taiwan Stock Exchange',
    '上市三大法人買賣超',
    'https://www.twse.com.tw/rwd/zh/fund/T86',
    'trading_day_eod',
    '資料來源：臺灣證券交易所'
  ),
  (
    'TPEX_DAILY_QUOTES',
    'Taipei Exchange',
    '上櫃股票每日收盤行情',
    'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes',
    'trading_day_eod',
    '資料來源：證券櫃檯買賣中心 OpenAPI'
  ),
  (
    'TPEX_3INSTI',
    'Taipei Exchange',
    '上櫃三大法人買賣資訊',
    'https://www.tpex.org.tw/openapi/v1/tpex_3insti_daily_trading',
    'trading_day_eod',
    '資料來源：證券櫃檯買賣中心 OpenAPI'
  )
on conflict (code) do update set
  endpoint = excluded.endpoint,
  attribution_text = excluded.attribution_text;

insert into public.rule_versions (rule_type, version, config, change_note)
values (
  'stock_score',
  'stock-score-provisional-0.1.0',
  '{
    "status": "provisional",
    "technical_weight": 0.35,
    "institution_weight": 0.25,
    "chip_weight": 0.10,
    "oi_weight": 0.05,
    "market_weight": 0.25,
    "minimum_history_days": 20,
    "note": "工程驗證規則，等待 JASIC 正式憲章權重簽核"
  }'::jsonb,
  'Initial deterministic scoring pipeline; not a production investment formula.'
)
on conflict (rule_type, version) do nothing;

create or replace function public.calculate_stock_features(
  target_date date,
  target_feature_version text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  with price_series as (
    select
      p.stock_id,
      p.trade_date,
      p.close,
      p.volume,
      row_number() over (
        partition by p.stock_id order by p.trade_date desc
      ) as rn,
      lag(p.close) over (
        partition by p.stock_id order by p.trade_date
      ) as previous_close
    from public.stock_daily_prices p
    where p.trade_date <= target_date
  ),
  price_aggregates as (
    select
      stock_id,
      max(trade_date) filter (where rn = 1) as trade_date,
      max(close) filter (where rn = 1) as latest_close,
      max(close) filter (where rn = 6) as close_5_sessions_ago,
      avg(close) filter (where rn <= 5) as ma5,
      avg(close) filter (where rn <= 20) as ma20,
      stddev_samp((close / nullif(previous_close, 0)) - 1)
        filter (where rn <= 20 and previous_close is not null) as volatility_20d,
      max(volume) filter (where rn = 1)
        / nullif(avg(volume) filter (where rn <= 20), 0) as volume_ratio_20d,
      count(*) filter (where rn <= 20) as history_count
    from price_series
    where rn <= 20
    group by stock_id
  ),
  institution_aggregates as (
    select stock_id, sum(total_net)::bigint as institution_net_5d
    from (
      select
        f.*,
        row_number() over (
          partition by f.stock_id order by f.trade_date desc
        ) as rn
      from public.institutional_flows_daily f
      where f.trade_date <= target_date
    ) ranked
    where rn <= 5
    group by stock_id
  )
  insert into public.stock_features_daily (
    stock_id,
    trade_date,
    ma5,
    ma20,
    return_5d,
    volatility_20d,
    volume_ratio_20d,
    institution_net_5d,
    feature_version
  )
  select
    p.stock_id,
    p.trade_date,
    round(p.ma5, 4),
    round(p.ma20, 4),
    round((p.latest_close / nullif(p.close_5_sessions_ago, 0)) - 1, 6),
    round(coalesce(p.volatility_20d, 0), 6),
    round(coalesce(p.volume_ratio_20d, 0), 6),
    coalesce(i.institution_net_5d, 0),
    target_feature_version
  from price_aggregates p
  left join institution_aggregates i using (stock_id)
  where p.history_count >= 20 and p.trade_date = target_date
  on conflict (stock_id, trade_date, feature_version) do update set
    ma5 = excluded.ma5,
    ma20 = excluded.ma20,
    return_5d = excluded.return_5d,
    volatility_20d = excluded.volatility_20d,
    volume_ratio_20d = excluded.volume_ratio_20d,
    institution_net_5d = excluded.institution_net_5d,
    calculated_at = now();

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
