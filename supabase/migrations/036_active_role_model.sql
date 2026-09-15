-- USER SYSTEM PHASE 2E — ACTIVE ROLE MODEL SIMPLIFICATION
-- Keeps `staff` in app_role for compatibility, but blocks new Staff assignment.
-- Replaces only set_user_role(); no enum/table/data changes.

create or replace function public.set_user_role(
  p_target_user uuid,
  p_new_role public.app_role
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
  v_actor_role_text text;
  v_new_role_text text;
begin
  if v_actor is null then
    raise exception 'authentication required';
  end if;
  if p_new_role is null then
    raise exception 'new role required';
  end if;

  select role into v_actor_role
  from public.user_roles
  where user_id = v_actor;

  select role into v_target_role
  from public.user_roles
  where user_id = p_target_user;

  if v_actor_role is null then
    raise exception 'role not found';
  end if;
  if v_target_role is null then
    raise exception 'target_user_not_found';
  end if;
  if p_target_user = v_actor then
    raise exception 'self role change is not allowed';
  end if;

  v_actor_role_text := v_actor_role::text;
  v_new_role_text := p_new_role::text;

  -- Staff remains a legacy/reserved enum value only. No new assignment is allowed.
  if v_new_role_text = 'staff' then
    raise exception 'staff_role_inactive';
  end if;

  -- Preserve the existing role hierarchy while removing Staff from active targets.
  if v_actor_role_text = 'administrator' then
    if v_new_role_text not in ('umum','siswa','pengajar') then
      raise exception 'administrator may assign at most pengajar';
    end if;
  elsif v_actor_role_text = 'manager' then
    if v_new_role_text not in ('umum','siswa','pengajar','administrator') then
      raise exception 'manager may assign at most administrator';
    end if;
  elsif v_actor_role_text = 'co_founder' then
    if v_new_role_text not in ('umum','siswa','pengajar','administrator','manager') then
      raise exception 'co-founder may assign at most manager';
    end if;
  elsif v_actor_role_text = 'founder' then
    null;
  else
    raise exception 'insufficient permission';
  end if;

  if v_actor_role_text <> 'founder'
    and public.role_rank(v_target_role) >= public.role_rank(v_actor_role) then
    raise exception 'cannot modify equal or higher role';
  end if;

  -- Preserve Phase 2B.1 relationship integrity.
  if v_target_role::text = 'siswa'
    and v_new_role_text <> 'siswa'
    and exists (
      select 1
      from public.class_enrollments e
      where e.user_id = p_target_user
        and e.status in ('active','paused')
    ) then
    raise exception 'active_student_enrollments_exist';
  end if;

  if v_new_role_text not in ('pengajar','administrator','manager','co_founder','founder')
    and exists (
      select 1
      from public.classes c
      where c.teacher_id = p_target_user
        and c.status in ('planned','active')
    ) then
    raise exception 'active_teaching_assignments_exist';
  end if;

  update public.user_roles
  set role = p_new_role,
      updated_by = v_actor,
      updated_at = now()
  where user_id = p_target_user;

  insert into public.admin_audit_logs(actor_id,action,target_user_id,details)
  values(v_actor,'set_user_role',p_target_user,jsonb_build_object(
    'previous_role',v_target_role,
    'new_role',p_new_role
  ));
end
$$;

revoke all on function public.set_user_role(uuid, public.app_role) from public;
revoke execute on function public.set_user_role(uuid, public.app_role) from anon;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
