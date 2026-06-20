create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stock_id uuid references public.stocks(id) on delete cascade,
  rule_type text not null
    check (rule_type in ('score_change', 'signal_change', 'risk_level')),
  config jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stock_id uuid references public.stocks(id) on delete cascade,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  alert_type text not null,
  title text not null,
  message text not null,
  evidence jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  triggered_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists alerts_user_triggered_idx
  on public.alerts (user_id, triggered_at desc);
create index if not exists alert_rules_user_idx
  on public.alert_rules (user_id, is_enabled);
create unique index if not exists alert_rules_unique_idx
  on public.alert_rules (user_id, coalesce(stock_id, '00000000-0000-0000-0000-000000000000'::uuid), rule_type);

alter table public.alert_rules enable row level security;
alter table public.alerts enable row level security;

create policy "Users manage own alert rules"
  on public.alert_rules for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users read own alerts"
  on public.alerts for select to authenticated
  using (auth.uid() = user_id);

create policy "Users update own alerts"
  on public.alerts for update to authenticated
  using (auth.uid() = user_id);

create or replace function public.create_default_alert_rules()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.alert_rules (user_id, rule_type, config)
  values
    (new.id, 'score_change', '{"threshold": 5}'::jsonb),
    (new.id, 'signal_change', '{}'::jsonb),
    (new.id, 'risk_level', '{"threshold": 70}'::jsonb)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_alert_rules on auth.users;
create trigger on_auth_user_alert_rules
  after insert on auth.users
  for each row execute procedure public.create_default_alert_rules();

insert into public.profiles (id, display_name)
select
  id,
  coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

insert into public.watchlists (user_id, name, is_default)
select id, '我的觀察清單', true from auth.users
on conflict (user_id, name) do nothing;

insert into public.alert_rules (user_id, rule_type, config)
select id, 'score_change', '{"threshold": 5}'::jsonb from auth.users
on conflict do nothing;
insert into public.alert_rules (user_id, rule_type, config)
select id, 'signal_change', '{}'::jsonb from auth.users
on conflict do nothing;
insert into public.alert_rules (user_id, rule_type, config)
select id, 'risk_level', '{"threshold": 70}'::jsonb from auth.users
on conflict do nothing;
