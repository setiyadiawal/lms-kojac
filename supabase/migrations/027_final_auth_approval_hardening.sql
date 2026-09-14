-- BUG-FIX FINAL-1 — approval hardening.
-- Require verified email before activation and preserve the role selected/assigned independently.

create or replace function public.set_user_approval(
  p_target_user uuid,
  p_approved boolean,
  p_blocked boolean default false
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_target_role public.app_role;
  v_target_email_confirmed_at timestamptz;
  v_updated_rows integer := 0;
begin
  select role into v_actor_role
  from public.user_roles
  where user_id = v_actor;

  select role into v_target_role
  from public.user_roles
  where user_id = p_target_user;

  if v_actor is null or v_actor_role not in ('administrator','co_founder','founder') then
    raise exception 'insufficient permission';
  end if;

  if p_target_user = v_actor then
    raise exception 'self approval change is not allowed';
  end if;

  if v_actor_role <> 'founder'
    and public.role_rank(coalesce(v_target_role,'umum')) >= public.role_rank(v_actor_role) then
    raise exception 'cannot change approval for equal or higher role';
  end if;

  -- Activation is allowed only for a real Auth user with a verified email.
  if p_approved and not p_blocked then
    select email_confirmed_at into v_target_email_confirmed_at
    from auth.users
    where id = p_target_user;

    if not found then
      raise exception 'target_user_not_found';
    end if;

    if v_target_email_confirmed_at is null then
      raise exception 'email_not_verified';
    end if;
  end if;

  update public.profiles
  set
    is_approved = p_approved,
    is_blocked = p_blocked,
    approved_by = case
      when p_approved and approved_at is null then v_actor
      else approved_by
    end,
    approved_at = case
      when p_approved then coalesce(approved_at, now())
      else approved_at
    end,
    updated_at = now()
  where user_id = p_target_user;

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows = 0 then
    raise exception 'target_profile_not_found';
  end if;

  -- Role is intentionally NOT changed here. Registration/staff role management
  -- remains the only source of truth for user_roles.role.

  insert into public.admin_audit_logs(actor_id,action,target_user_id,details)
  values(
    v_actor,
    'set_user_approval',
    p_target_user,
    jsonb_build_object('approved',p_approved,'blocked',p_blocked)
  );
end
$$;

revoke all on function public.set_user_approval(uuid,boolean,boolean) from public;
revoke execute on function public.set_user_approval(uuid,boolean,boolean) from anon;
grant execute on function public.set_user_approval(uuid,boolean,boolean) to authenticated;
