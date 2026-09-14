-- BUG-FIX FINAL-2 — secure Admin User Management verification status.
-- Expose only the minimum account-state fields needed by authorized staff.

create or replace function public.list_admin_users()
returns table (
  user_id uuid,
  full_name text,
  is_approved boolean,
  is_blocked boolean,
  role public.app_role,
  email_verified boolean
)
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
begin
  select actor_role.role into v_actor_role
  from public.user_roles actor_role
  where actor_role.user_id = v_actor;

  if v_actor is null or v_actor_role not in ('administrator','co_founder','founder') then
    raise exception 'insufficient_permission';
  end if;

  return query
  select
    profile.user_id,
    profile.full_name,
    profile.is_approved,
    profile.is_blocked,
    account_role.role,
    (auth_user.email_confirmed_at is not null) as email_verified
  from public.profiles profile
  join public.user_roles account_role
    on account_role.user_id = profile.user_id
  join auth.users auth_user
    on auth_user.id = profile.user_id
  order by profile.created_at desc;
end
$$;

revoke all on function public.list_admin_users() from public;
revoke execute on function public.list_admin_users() from anon;
grant execute on function public.list_admin_users() to authenticated;
