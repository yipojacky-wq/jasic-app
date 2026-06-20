alter table public.profiles
  add column if not exists default_horizon text not null default 'medium'
    check (default_horizon in ('short', 'swing', 'medium', 'long')),
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();

drop trigger if exists alert_rules_touch_updated_at on public.alert_rules;
create trigger alert_rules_touch_updated_at
  before update on public.alert_rules
  for each row execute procedure public.touch_updated_at();
