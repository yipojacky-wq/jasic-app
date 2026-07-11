create table if not exists public.edge_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  function_name text not null,
  window_start timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, function_name)
);

alter table public.edge_rate_limits enable row level security;

create or replace function public.consume_edge_rate_limit(
  target_user_id uuid,
  target_function_name text,
  target_limit integer,
  target_window_seconds integer
)
returns table (
  allowed boolean,
  request_count integer,
  retry_after_seconds integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.edge_rate_limits%rowtype;
  now_value timestamptz := now();
  window_reset_at timestamptz;
  next_count integer;
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  if target_function_name is null or length(trim(target_function_name)) = 0 then
    raise exception 'target_function_name is required';
  end if;

  if target_limit < 1 or target_window_seconds < 1 then
    raise exception 'invalid rate-limit policy';
  end if;

  select *
    into current_row
    from public.edge_rate_limits
    where user_id = target_user_id
      and function_name = target_function_name
    for update;

  if not found then
    insert into public.edge_rate_limits
      (user_id, function_name, window_start, request_count)
    values
      (target_user_id, target_function_name, now_value, 1);

    allowed := true;
    request_count := 1;
    retry_after_seconds := 0;
    reset_at := now_value + make_interval(secs => target_window_seconds);
    return next;
    return;
  end if;

  window_reset_at := current_row.window_start + make_interval(secs => target_window_seconds);

  if window_reset_at <= now_value then
    update public.edge_rate_limits
      set window_start = now_value,
          request_count = 1,
          updated_at = now_value
      where user_id = target_user_id
        and function_name = target_function_name;

    allowed := true;
    request_count := 1;
    retry_after_seconds := 0;
    reset_at := now_value + make_interval(secs => target_window_seconds);
    return next;
    return;
  end if;

  next_count := current_row.request_count + 1;

  update public.edge_rate_limits
    set request_count = next_count,
        updated_at = now_value
    where user_id = target_user_id
      and function_name = target_function_name;

  allowed := next_count <= target_limit;
  request_count := next_count;
  retry_after_seconds := greatest(
    0,
    ceiling(extract(epoch from (window_reset_at - now_value)))::integer
  );
  reset_at := window_reset_at;
  return next;
end;
$$;
