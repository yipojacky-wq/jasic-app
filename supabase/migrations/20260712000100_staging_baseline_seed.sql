-- Baseline staging data for a fresh Supabase Free project.
-- This is provisional seed data so live-mode staging can render the dashboard
-- and discovery funnel before scheduled ingestion/scoring jobs run.

insert into public.stocks (symbol, exchange, name_zh, industry_code)
values
  ('2330', 'TWSE', 'Taiwan Semiconductor', 'SEMICONDUCTOR'),
  ('2454', 'TWSE', 'MediaTek', 'IC_DESIGN'),
  ('2382', 'TWSE', 'Quanta Computer', 'AI_SERVER'),
  ('2308', 'TWSE', 'Delta Electronics', 'POWER'),
  ('2881', 'TWSE', 'Fubon Financial', 'FINANCE'),
  ('3017', 'TWSE', 'Asia Vital Components', 'THERMAL')
on conflict (exchange, symbol) do update set
  name_zh = excluded.name_zh,
  industry_code = excluded.industry_code,
  is_active = true;

insert into public.macro_indicator_definitions
  (code, name_zh, unit, frequency, source_name, display_order, is_dashboard_core)
values
  ('GLOBAL_TREND', 'Global Trend', 'signal', 'daily', 'Staging baseline', 1, true),
  ('VIX', 'Volatility Index', 'index', 'daily', 'Staging baseline', 2, true),
  ('USD_TWD', 'USD/TWD', 'TWD', 'daily', 'Staging baseline', 3, true),
  ('US10Y', 'US 10Y Yield', 'percent', 'daily', 'Staging baseline', 4, true),
  ('TW_CYCLE', 'Taiwan Business Cycle', 'signal', 'monthly', 'Staging baseline', 5, true)
on conflict (code) do update set
  name_zh = excluded.name_zh,
  unit = excluded.unit,
  frequency = excluded.frequency,
  source_name = excluded.source_name,
  display_order = excluded.display_order,
  is_dashboard_core = excluded.is_dashboard_core;

insert into public.macro_indicator_values
  (indicator_id, observation_date, value, display_value, trend_note, state, released_at)
select
  d.id,
  v.observation_date::date,
  v.value,
  v.display_value,
  v.trend_note,
  v.state,
  v.released_at::timestamptz
from public.macro_indicator_definitions d
join (
  values
    ('GLOBAL_TREND', '2026-07-12', 1, 'Neutral / Rotation', 'Staging baseline trend signal.', 'neutral', '2026-07-12T08:30:00+08:00'),
    ('VIX', '2026-07-12', 18.6, '18.6', 'Volatility is watchful but not panic-level.', 'neutral', '2026-07-12T08:30:00+08:00'),
    ('USD_TWD', '2026-07-12', 31.2, '31.20', 'FX pressure is stable in the staging baseline.', 'neutral', '2026-07-12T08:30:00+08:00'),
    ('US10Y', '2026-07-12', 4.18, '4.18%', 'Yield level requires duration discipline.', 'negative', '2026-07-12T08:30:00+08:00'),
    ('TW_CYCLE', '2026-07-01', 0.64, 'Expansion watch', 'Cycle indicator supports selective risk taking.', 'positive', '2026-07-12T08:30:00+08:00')
) as v(code, observation_date, value, display_value, trend_note, state, released_at)
  on d.code = v.code
where not exists (
  select 1
  from public.macro_indicator_values existing
  where existing.indicator_id = d.id
    and existing.observation_date = v.observation_date::date
);

insert into public.market_score_snapshots
  (as_of, score, risk_score, signal, market_regime, component_scores, strategy_bias, confidence_score, rule_version)
values (
  '2026-07-12T08:30:00+08:00',
  76,
  42,
  'green',
  'neutral_rotation',
  '{"breadth": 68, "average_volatility_20d": 18.6}'::jsonb,
  '{"summary": "Staging baseline: market is in neutral rotation. Use risk controls and avoid profit guarantees.", "status": "provisional"}'::jsonb,
  70,
  'stock-score-provisional-0.1.0'
)
on conflict (as_of) do update set
  score = excluded.score,
  risk_score = excluded.risk_score,
  signal = excluded.signal,
  market_regime = excluded.market_regime,
  component_scores = excluded.component_scores,
  strategy_bias = excluded.strategy_bias,
  confidence_score = excluded.confidence_score,
  rule_version = excluded.rule_version;

delete from public.stock_score_snapshots
where as_of = '2026-07-12T08:30:00+08:00'::timestamptz
  and rule_version = 'stock-score-provisional-0.1.0';

insert into public.stock_score_snapshots
  (
    stock_id,
    as_of,
    market_score,
    institution_score,
    chip_score,
    oi_score,
    technical_score,
    total_score,
    confidence_score,
    risk_score,
    signal,
    evidence,
    rule_version
  )
select
  s.id,
  '2026-07-12T08:30:00+08:00'::timestamptz,
  v.market_score,
  v.institution_score,
  50,
  50,
  v.technical_score,
  v.total_score,
  v.confidence_score,
  v.risk_score,
  v.signal,
  jsonb_build_object(
    'status', 'staging_seed',
    'note', 'Provisional baseline for live-mode smoke testing only.'
  ),
  'stock-score-provisional-0.1.0'
from public.stocks s
join (
  values
    ('2330', 76, 84, 86, 88, 65, 38, 'green'),
    ('2454', 76, 78, 82, 84, 64, 46, 'green'),
    ('2382', 76, 72, 80, 81, 62, 52, 'yellow'),
    ('2308', 76, 62, 72, 78, 60, 68, 'yellow'),
    ('2881', 76, 58, 64, 70, 58, 44, 'yellow'),
    ('3017', 76, 54, 70, 72, 56, 58, 'yellow')
) as v(symbol, market_score, institution_score, technical_score, total_score, confidence_score, risk_score, signal)
  on s.symbol = v.symbol and s.exchange = 'TWSE';

do $$
declare
  staging_run_id uuid;
begin
  delete from public.discovery_candidates
  where run_id in (
    select id from public.discovery_runs
    where as_of = '2026-07-12T08:30:00+08:00'::timestamptz
      and rule_version = 'stock-score-provisional-0.1.0'
  );

  delete from public.discovery_runs
  where as_of = '2026-07-12T08:30:00+08:00'::timestamptz
    and rule_version = 'stock-score-provisional-0.1.0';

  insert into public.discovery_runs
    (as_of, status, market_scope, rule_version, completed_at)
  values
    (
      '2026-07-12T08:30:00+08:00',
      'completed',
      'TWSE_TPEX_COMMON_STOCKS',
      'stock-score-provisional-0.1.0',
      '2026-07-12T08:31:00+08:00'
    )
  returning id into staging_run_id;

  insert into public.discovery_candidates
    (run_id, stock_id, rank, discovery_score, category, layer_results, rank_reasons, risk_flags)
  select
    staging_run_id,
    s.id,
    v.rank,
    v.discovery_score,
    v.category,
    v.layer_results::jsonb,
    v.rank_reasons::jsonb,
    v.risk_flags::jsonb
  from public.stocks s
  join (
    values
      (
        '2330',
        1,
        88,
        'Core Leader',
        '{"market":{"status":"pass","score":76},"institution":{"status":"pass","score":84},"technical_risk":{"status":"pass","technical_score":86,"risk_score":38}}',
        '["Score above baseline", "Institutional flow placeholder is positive", "Risk remains controlled"]',
        '[]'
      ),
      (
        '2454',
        2,
        84,
        'Momentum Watch',
        '{"market":{"status":"pass","score":76},"institution":{"status":"pass","score":78},"technical_risk":{"status":"pass","technical_score":82,"risk_score":46}}',
        '["Score remains strong", "Technical setup is constructive", "Staging data only"]',
        '[]'
      ),
      (
        '2382',
        3,
        81,
        'Trend Candidate',
        '{"market":{"status":"pass","score":76},"institution":{"status":"pass","score":72},"technical_risk":{"status":"pass","technical_score":80,"risk_score":52}}',
        '["Trend candidate", "Requires live validation", "Use risk controls"]',
        '["provisional_data"]'
      )
  ) as v(symbol, rank, discovery_score, category, layer_results, rank_reasons, risk_flags)
    on s.symbol = v.symbol and s.exchange = 'TWSE';
end $$;
