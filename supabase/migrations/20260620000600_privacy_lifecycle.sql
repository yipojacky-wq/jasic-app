create table if not exists public.account_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  user_id_hash text not null,
  request_id uuid not null,
  deletion_scope text not null default 'auth_and_personal_data',
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.account_deletion_audit enable row level security;

comment on table public.account_deletion_audit is
  'Non-identifying operational record of account deletion requests. No raw email or user UUID is retained.';
