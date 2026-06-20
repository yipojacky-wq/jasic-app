create table if not exists public.report_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, report_id)
);

create index if not exists report_bookmarks_user_idx
  on public.report_bookmarks (user_id, created_at desc);

alter table public.report_bookmarks enable row level security;

create policy "Users manage own report bookmarks"
  on public.report_bookmarks for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.report_bookmarks is
  'User-owned saved report references. Deleting a report or account removes its bookmarks.';
