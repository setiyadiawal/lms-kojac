-- AUTH-REG-1 — Registration profile fields + safe self-registration role allowlist
-- Existing users remain valid because the new profile columns are nullable.

alter table public.profiles
  add column if not exists nickname text,
  add column if not exists birth_date date;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_requested_role public.app_role := 'umum'::public.app_role;
  v_birth_date date := null;
  v_birth_date_raw text := nullif(btrim(coalesce(new.raw_user_meta_data->>'birth_date', '')), '');
begin
  -- Self-registration may request only the two non-privileged user types.
  -- Any modified/unknown/privileged value falls back to the safest role: umum.
  if lower(btrim(coalesce(new.raw_user_meta_data->>'requested_user_type', ''))) = 'siswa' then
    v_requested_role := 'siswa'::public.app_role;
  else
    v_requested_role := 'umum'::public.app_role;
  end if;

  if v_birth_date_raw is not null then
    begin
      v_birth_date := v_birth_date_raw::date;
      if v_birth_date > current_date then
        v_birth_date := null;
      end if;
    exception
      when invalid_datetime_format or datetime_field_overflow then
        v_birth_date := null;
    end;
  end if;

  insert into public.profiles(user_id, full_name, nickname, birth_date)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(btrim(coalesce(new.raw_user_meta_data->>'nickname', '')), ''),
    v_birth_date
  );

  insert into public.user_roles(user_id, role)
  values(new.id, v_requested_role);

  return new;
end
$$;

-- Preserve PR-3 trigger hardening: the signup trigger remains usable internally,
-- but clients cannot call the SECURITY DEFINER function directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
