insert into public.rule_versions (rule_type, version, config, change_note)
values
  (
    'market_score',
    'market-score-provisional-0.1.0',
    '{
      "status": "provisional",
      "breadth_weight": 0.70,
      "volatility_risk_weight": 0.30,
      "green_score_threshold": 65,
      "yellow_score_threshold": 45,
      "high_volatility_risk_threshold": 65,
      "minimum_history_days": 20,
      "note": "Initial deterministic market score pipeline for staging validation; not a production investment formula."
    }'::jsonb,
    'Initial deterministic market score pipeline for staging validation; not a production investment formula.'
  ),
  (
    'discovery_funnel',
    'discovery-funnel-provisional-0.1.0',
    '{
      "status": "provisional",
      "candidate_limit": 20,
      "minimum_total_score": 50,
      "maximum_risk_score": 80,
      "market_pass_threshold": 45,
      "institution_pass_threshold": 45,
      "technical_pass_threshold": 50,
      "minimum_history_days": 20,
      "note": "Initial three-layer discovery funnel for staging validation; not a production investment formula."
    }'::jsonb,
    'Initial three-layer discovery funnel for staging validation; not a production investment formula.'
  )
on conflict (rule_type, version) do update set
  config = excluded.config,
  change_note = excluded.change_note;
