-- USER SYSTEM PHASE 2B.1 — ROLE / CLASS / ENROLLMENT RELATIONSHIP INTEGRITY HARDENING
-- REVIEW-ONLY MIGRATION. DO NOT APPLY until explicitly approved.
-- Preserves Phase 2A/2A.1/2B schema and data; replaces only three RPCs.

-- ---------------------------------------------------------------------------
-- 1. Role changes must preserve active student and teacher relationships.
-- ---------------------------------------------------------------------------
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

  -- Preserve the existing role-assignment hierarchy.
  if v_actor_role_text = 'administrator' then
    if v_new_role_text not in ('umum','siswa','pengajar','staff') then
      raise exception 'administrator may assign at most staff';
    end if;
  elsif v_actor_role_text = 'manager' then
    if v_new_role_text not in ('umum','siswa','pengajar','staff','administrator') then
      raise exception 'manager may assign at most administrator';
    end if;
  elsif v_actor_role_text = 'co_founder' then
    if v_new_role_text not in ('umum','siswa','pengajar','staff','administrator','manager') then
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

  -- A student with an active/paused enrollment must remain a student until the
  -- active relationship is completed/cancelled.
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

  -- A user teaching a planned/active class must remain teacher-eligible.
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

-- ---------------------------------------------------------------------------
-- 2. Enrollment activation/reactivation must point to an open class and an
--    active student account. Historical completed/cancelled rows are preserved.
-- ---------------------------------------------------------------------------
create or replace function public.set_class_enrollment(
  p_class_id uuid,
  p_user_id uuid,
  p_status text default 'active'
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
  v_target_approved boolean;
  v_target_blocked boolean;
  v_class_status text;
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_before public.class_enrollments%rowtype;
  v_after public.class_enrollments%rowtype;
  v_existed boolean := false;
begin
  select role into v_actor_role
  from public.user_roles
  where user_id = v_actor;

  if v_actor is null
    or v_actor_role is null
    or v_actor_role::text not in ('administrator','manager','co_founder','founder') then
    raise exception 'insufficient_permission';
  end if;

  if v_status not in ('active','paused','completed','cancelled') then
    raise exception 'invalid_enrollment_status';
  end if;

  select status into v_class_status
  from public.classes
  where id = p_class_id;
  if not found then
    raise exception 'class_not_found';
  end if;

  select ur.role, p.is_approved, p.is_blocked
  into v_target_role, v_target_approved, v_target_blocked
  from public.user_roles ur
  join public.profiles p on p.user_id = ur.user_id
  where ur.user_id = p_user_id;

  if v_target_role is null then
    raise exception 'target_user_not_found';
  end if;

  select * into v_before
  from public.class_enrollments
  where class_id = p_class_id
    and user_id = p_user_id;
  v_existed := found;

  if v_status in ('active','paused') then
    if v_class_status not in ('planned','active') then
      raise exception 'class_not_open_for_enrollment';
    end if;
    if v_target_role::text <> 'siswa' then
      raise exception 'target_must_be_siswa';
    end if;
    if not coalesce(v_target_approved,false) then
      raise exception 'student_not_active';
    end if;
    if coalesce(v_target_blocked,false) then
      raise exception 'student_blocked';
    end if;
  elsif not v_existed then
    -- completed/cancelled are historical states, not a way to fabricate a new
    -- historical relationship that never existed.
    raise exception 'enrollment_not_found';
  end if;

  insert into public.class_enrollments(class_id,user_id,status,joined_at,completed_at)
  values(
    p_class_id,
    p_user_id,
    v_status,
    now(),
    case when v_status = 'completed' then now() else null end
  )
  on conflict(class_id,user_id) do update
  set status = excluded.status,
      completed_at = case
        when excluded.status = 'completed' then coalesce(public.class_enrollments.completed_at, now())
        else null
      end
  returning * into v_after;

  insert into public.admin_audit_logs(actor_id,action,target_user_id,details)
  values(
    v_actor,
    case when v_existed then 'update_enrollment' else 'enroll_student' end,
    p_user_id,
    jsonb_build_object(
      'class_id',p_class_id,
      'before',case when v_existed then to_jsonb(v_before) else null end,
      'after',to_jsonb(v_after)
    )
  );
end
$$;

revoke all on function public.set_class_enrollment(uuid, uuid, text) from public;
revoke execute on function public.set_class_enrollment(uuid, uuid, text) from anon;
grant execute on function public.set_class_enrollment(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Sensitive management detail follows the same role hierarchy as mutation.
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_user_detail(p_target_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_target_role public.app_role;
  v_result jsonb;
begin
  select role into v_actor_role
  from public.user_roles
  where user_id = v_actor;

  if v_actor is null
    or v_actor_role is null
    or v_actor_role::text not in ('administrator','manager','co_founder','founder') then
    raise exception 'insufficient_permission';
  end if;

  select role into v_target_role
  from public.user_roles
  where user_id = p_target_user;

  if v_target_role is null then
    raise exception 'target_user_not_found';
  end if;

  if p_target_user = v_actor then
    raise exception 'target_detail_not_allowed';
  end if;

  if v_actor_role::text <> 'founder'
    and public.role_rank(v_target_role) >= public.role_rank(v_actor_role) then
    raise exception 'target_detail_not_allowed';
  end if;

  select jsonb_build_object(
    'profile', jsonb_build_object(
      'user_id', p.user_id,
      'full_name', p.full_name,
      'nickname', p.nickname,
      'email', au.email,
      'birth_date', p.birth_date
    ),
    'account', jsonb_build_object(
      'email_verified', (au.email_confirmed_at is not null),
      'is_approved', p.is_approved,
      'is_blocked', p.is_blocked
    ),
    'role', ur.role::text,
    'enrollments', case
      when ur.role::text = 'siswa' then coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'class_id', c.id,
            'class_code', c.code,
            'class_name', c.name,
            'class_status', c.status,
            'program_id', pr.id,
            'program_code', pr.code,
            'program_name', pr.name,
            'teacher_id', c.teacher_id,
            'teacher_name', tp.full_name,
            'starts_on', c.starts_on,
            'ends_on', c.ends_on,
            'joined_at', e.joined_at,
            'completed_at', e.completed_at,
            'enrollment_status', e.status
          ) order by e.joined_at desc
        )
        from public.class_enrollments e
        join public.classes c on c.id = e.class_id
        left join public.programs pr on pr.id = c.program_id
        left join public.profiles tp on tp.user_id = c.teacher_id
        where e.user_id = p_target_user
      ), '[]'::jsonb)
      else '[]'::jsonb
    end,
    'teaching_classes', case
      when ur.role::text in ('pengajar','administrator','manager','co_founder','founder') then coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'class_id', c.id,
            'class_code', c.code,
            'class_name', c.name,
            'class_status', c.status,
            'program_id', pr.id,
            'program_code', pr.code,
            'program_name', pr.name,
            'starts_on', c.starts_on,
            'ends_on', c.ends_on,
            'student_count', (
              select count(*)::integer
              from public.class_enrollments ce
              where ce.class_id = c.id
                and ce.status <> 'cancelled'
            )
          ) order by c.created_at desc
        )
        from public.classes c
        left join public.programs pr on pr.id = c.program_id
        where c.teacher_id = p_target_user
      ), '[]'::jsonb)
      else '[]'::jsonb
    end
  ) into v_result
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.user_id
  join auth.users au on au.id = p.user_id
  where p.user_id = p_target_user;

  if v_result is null then
    raise exception 'target_user_not_found';
  end if;

  return v_result;
end
$$;

revoke all on function public.get_admin_user_detail(uuid) from public;
revoke execute on function public.get_admin_user_detail(uuid) from anon;
grant execute on function public.get_admin_user_detail(uuid) to authenticated;
