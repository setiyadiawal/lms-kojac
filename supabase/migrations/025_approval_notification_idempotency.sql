-- AUTH-VERIFY-3 — keep the first approval timestamp stable so approval
-- notifications can use a deterministic idempotency key.

create or replace function public.set_user_approval(
  p_target_user uuid,
  p_approved boolean,
  p_blocked boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_target_role public.app_role;
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

  if p_approved then
    update public.user_roles
    set role = 'siswa', updated_by = v_actor, updated_at = now()
    where user_id = p_target_user and role = 'umum';
  end if;

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
