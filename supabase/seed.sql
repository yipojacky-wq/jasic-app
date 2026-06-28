insert into public.stocks (symbol, exchange, name_zh, industry_code)
values
  ('2330', 'TWSE', '台積電', 'SEMICONDUCTOR'),
  ('2454', 'TWSE', '聯發科', 'IC_DESIGN'),
  ('2382', 'TWSE', '廣達', 'AI_SERVER'),
  ('2308', 'TWSE', '台達電', 'POWER'),
  ('2881', 'TWSE', '富邦金', 'FINANCE'),
  ('3017', 'TWSE', '奇鋐', 'THERMAL')
on conflict (exchange, symbol) do nothing;

insert into public.macro_indicator_definitions
  (code, name_zh, unit, frequency, source_name, display_order, is_dashboard_core)
values
  ('GLOBAL_TREND', '全球趨勢', 'signal', 'daily', 'Licensed market provider', 1, true),
  ('VIX', '市場波動', 'index', 'daily', 'Licensed market provider', 2, true),
  ('USD_TWD', '美元資金', 'TWD', 'daily', 'Central Bank / provider', 3, true),
  ('US10Y', '資金成本', 'percent', 'daily', 'Official / provider', 4, true),
  ('TW_CYCLE', '台灣景氣', 'signal', 'monthly', 'NDC / MOF', 5, true)
on conflict (code) do nothing;

-- Staging live-mode baseline.
-- These rows are intentionally provisional demo values so a fresh staging DB can
-- render Macro Dashboard, Discovery Pool, and Data Health before the first
-- scheduled ingestion/scoring run completes.

insert into public.macro_indicator_values
  (indicator_id, observation_date, value, display_value, trend_note, state, released_at)
select d.id, v.observation_date::date, v.value, v.display_value, v.trend_note, v.state, v.released_at::timestamptz
from public.macro_indicator_definitions d
join (
  values
    ('GLOBAL_TREND', '2026-06-20', 1, 'Neutral / Rotation', 'Staging baseline trend signal.', 'neutral', '2026-06-20T08:30:00+08:00'),
    ('VIX', '2026-06-20', 18.6, '18.6', 'Volatility remains watchful but not panic-level.', 'neutral', '2026-06-20T08:30:00+08:00'),
    ('USD_TWD', '2026-06-20', 31.2, '31.20', 'FX pressure is stable in the staging baseline.', 'neutral', '2026-06-20T08:30:00+08:00'),
    ('US10Y', '2026-06-20', 4.18, '4.18%', 'Yield level requires duration discipline.', 'negative', '2026-06-20T08:30:00+08:00'),
    ('TW_CYCLE', '2026-06-01', 0.64, 'Expansion watch', 'Cycle indicator supports selective risk taking.', 'positive', '2026-06-20T08:30:00+08:00')
) as v(code, observation_date, value, display_value, trend_note, state, released_at)
  on d.code = v.code
on conflict (indicator_id, observation_date, vintage_at) do nothing;

insert into public.market_score_snapshots
  (as_of, score, risk_score, signal, market_regime, component_scores, strategy_bias, confidence_score, rule_version)
values (
  '2026-06-20T08:30:00+08:00',
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
  '2026-06-20T08:30:00+08:00'::timestamptz,
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
  on s.symbol = v.symbol and s.exchange = 'TWSE'
on conflict (stock_id, as_of, rule_version) do update set
  market_score = excluded.market_score,
  institution_score = excluded.institution_score,
  chip_score = excluded.chip_score,
  oi_score = excluded.oi_score,
  technical_score = excluded.technical_score,
  total_score = excluded.total_score,
  confidence_score = excluded.confidence_score,
  risk_score = excluded.risk_score,
  signal = excluded.signal,
  evidence = excluded.evidence;

do $$
declare
  staging_run_id uuid;
begin
  delete from public.discovery_candidates
  where run_id in (
    select id from public.discovery_runs
    where as_of = '2026-06-20T08:30:00+08:00'::timestamptz
      and rule_version = 'stock-score-provisional-0.1.0'
  );

  delete from public.discovery_runs
  where as_of = '2026-06-20T08:30:00+08:00'::timestamptz
    and rule_version = 'stock-score-provisional-0.1.0';

  insert into public.discovery_runs
    (as_of, status, market_scope, rule_version, completed_at)
  values
    (
      '2026-06-20T08:30:00+08:00',
      'completed',
      'TWSE_TPEX_COMMON_STOCKS',
      'stock-score-provisional-0.1.0',
      '2026-06-20T08:31:00+08:00'
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
