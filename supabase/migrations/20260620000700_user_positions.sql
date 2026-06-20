create table if not exists public.user_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stock_id uuid not null references public.stocks(id) on delete cascade,
  average_cost numeric(16,4) not null check (average_cost > 0),
  quantity_shares numeric(16,4) not null check (quantity_shares > 0),
  investment_horizon text not null
    check (investment_horizon in ('short', 'swing', 'medium', 'long')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, stock_id)
);

create index if not exists user_positions_user_idx
  on public.user_positions (user_id, updated_at desc);

alter table public.user_positions enable row level security;

create policy "Users manage own positions"
  on public.user_positions for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.user_positions is
  'User-entered research positions only. This table is not connected to a broker and cannot execute orders.';
