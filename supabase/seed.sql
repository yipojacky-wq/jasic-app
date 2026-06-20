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
