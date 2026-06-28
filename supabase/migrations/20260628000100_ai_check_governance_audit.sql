alter table public.ai_check_results
  add column if not exists response_schema_version text not null default 'ai-check-response-1.0.0',
  add column if not exists allowed_actions jsonb not null default '[]'::jsonb;

alter table public.ai_check_results
  drop constraint if exists ai_check_results_allowed_actions_array,
  add constraint ai_check_results_allowed_actions_array
    check (jsonb_typeof(allowed_actions) = 'array');
