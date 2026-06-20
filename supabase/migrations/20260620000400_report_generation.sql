alter table public.reports
  add column if not exists report_key text;

create unique index if not exists reports_key_unique_idx
  on public.reports (report_key)
  where report_key is not null;

create index if not exists reports_published_idx
  on public.reports (published_at desc)
  where status = 'published';
