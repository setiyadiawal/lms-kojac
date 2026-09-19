-- KOJAC LMS v1.1 — Streak System Phase 2
-- Backend foundation only.
-- No historical backfill: tracking starts when this migration is applied.
-- Activity is counted only when persisted learning progress changes.

begin;

create table private.study_activity_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  timezone_name text not null,
  first_activity_at timestamptz not null,
  last_activity_at timestamptz not null,
  primary key (user_id, activity_date),
  constraint study_activity_days_timezone_name_nonempty
    check (length(btrim(timezone_name)) > 0),
  constraint study_activity_days_timestamp_order
    check (last_activity_at >= first_activity_at)
);

alter table private.study_activity_days enable row level security;

revoke all
on table private.study_activity_days
from public, anon, authenticated;

create or replace function private.capture_study_activity_day()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_activity_at timestamptz;
  v_old_activity_at timestamptz;
  v_timezone text;
  v_activity_date date;
begin
  if tg_table_schema <> 'public' then
    return new;
  end if;

  case tg_table_name
    when 'review_progress' then
      v_activity_at := new.last_reviewed_at;
      if tg_op = 'UPDATE' then
        v_old_activity_at := old.last_reviewed_at;
      end if;

    when 'reading_progress' then
      v_activity_at := new.last_completed_at;
      if tg_op = 'UPDATE' then
        v_old_activity_at := old.last_completed_at;
      end if;

    when 'listening_progress' then
      v_activity_at := new.last_completed_at;
      if tg_op = 'UPDATE' then
        v_old_activity_at := old.last_completed_at;
      end if;

    else
      return new;
  end case;

  if v_activity_at is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and v_activity_at is not distinct from v_old_activity_at then
    return new;
  end if;

  begin
    select p.timezone
      into v_timezone
    from public.profiles as p
    where p.user_id = new.user_id;

    if v_timezone is null
       or not exists (
         select 1
         from pg_catalog.pg_timezone_names as tz
         where tz.name = v_timezone
       ) then
      v_timezone := 'Asia/Jakarta';
    end if;

    v_activity_date := (v_activity_at at time zone v_timezone)::date;

    insert into private.study_activity_days as sad (
      user_id,
      activity_date,
      timezone_name,
      first_activity_at,
      last_activity_at
    ) values (
      new.user_id,
      v_activity_date,
      v_timezone,
      v_activity_at,
      v_activity_at
    )
    on conflict (user_id, activity_date) do update
    set
      timezone_name = excluded.timezone_name,
      first_activity_at = least(
        sad.first_activity_at,
        excluded.first_activity_at
      ),
      last_activity_at = greatest(
        sad.last_activity_at,
        excluded.last_activity_at
      );
  exception
    when others then
      -- Fail-safe: streak tracking must never block core learning progress.
      raise warning 'study activity tracking failed: %', sqlerrm;
  end;

  return new;
end;
$$;

revoke all
on function private.capture_study_activity_day()
from public, anon, authenticated;

create trigger review_progress_capture_study_day
after insert or update of last_reviewed_at
on public.review_progress
for each row
execute function private.capture_study_activity_day();

create trigger reading_progress_capture_study_day
after insert or update of last_completed_at
on public.reading_progress
for each row
execute function private.capture_study_activity_day();

create trigger listening_progress_capture_study_day
after insert or update of last_completed_at
on public.listening_progress
for each row
execute function private.capture_study_activity_day();

create or replace function public.get_my_study_streak()
returns table (
  current_streak integer,
  longest_streak integer,
  active_today boolean,
  last_activity_date date,
  total_active_days integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_user uuid := auth.uid();
  v_timezone text;
  v_today date;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  select p.timezone
    into v_timezone
  from public.profiles as p
  where p.user_id = v_user;

  if v_timezone is null
     or not exists (
       select 1
       from pg_catalog.pg_timezone_names as tz
       where tz.name = v_timezone
     ) then
    v_timezone := 'Asia/Jakarta';
  end if;

  v_today := (now() at time zone v_timezone)::date;

  return query
  with activity_dates as (
    select sad.activity_date
    from private.study_activity_days as sad
    where sad.user_id = v_user
  ),
  numbered as (
    select
      ad.activity_date,
      ad.activity_date
        - row_number() over (order by ad.activity_date)::integer
          as island_key
    from activity_dates as ad
  ),
  islands as (
    select
      max(n.activity_date) as end_date,
      count(*)::integer as streak_length
    from numbered as n
    group by n.island_key
  ),
  summary as (
    select
      count(*)::integer as total_days,
      max(ad.activity_date) as last_date
    from activity_dates as ad
  )
  select
    case
      when s.last_date is null
        or s.last_date < v_today - 1
        then 0
      else coalesce((
        select i.streak_length
        from islands as i
        where i.end_date = s.last_date
        limit 1
      ), 0)
    end::integer as current_streak,
    coalesce(
      (select max(i.streak_length) from islands as i),
      0
    )::integer as longest_streak,
    coalesce(s.last_date = v_today, false) as active_today,
    s.last_date as last_activity_date,
    coalesce(s.total_days, 0)::integer as total_active_days
  from summary as s;
end;
$$;

revoke all
on function public.get_my_study_streak()
from public, anon;

grant execute
on function public.get_my_study_streak()
to authenticated;

commit;
