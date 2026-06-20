update public.ai_check_requests
set investment_horizon = case investment_horizon
  when '短線' then 'short'
  when '波段' then 'swing'
  when '中期' then 'medium'
  when '長期' then 'long'
  else investment_horizon
end;

alter table public.ai_check_requests
  drop constraint if exists ai_check_requests_cost_guardrail,
  drop constraint if exists ai_check_requests_quantity_guardrail,
  drop constraint if exists ai_check_requests_cost_basis_guardrail,
  drop constraint if exists ai_check_requests_horizon_guardrail,
  drop constraint if exists ai_check_requests_risk_profile_guardrail;

alter table public.ai_check_requests
  add constraint ai_check_requests_cost_guardrail
    check (cost between 0.01 and 1000000),
  add constraint ai_check_requests_quantity_guardrail
    check (quantity_shares between 1 and 10000000),
  add constraint ai_check_requests_cost_basis_guardrail
    check (cost * quantity_shares <= 10000000000),
  add constraint ai_check_requests_horizon_guardrail
    check (investment_horizon in ('short', 'swing', 'medium', 'long')),
  add constraint ai_check_requests_risk_profile_guardrail
    check (risk_profile in ('conservative', 'balanced', 'aggressive', 'growth'));
