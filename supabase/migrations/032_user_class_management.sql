-- USER SYSTEM PHASE 2B — USER DETAIL + PROGRAM + CLASS + ENROLLMENT MANAGEMENT
-- Adds secure management RPCs only. Reuses existing programs/classes/class_enrollments
-- and preserves Phase 2A.1 teacher data-scope hardening.

-- ---------------------------------------------------------------------------
-- 1. Lazy admin user detail
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

-- ---------------------------------------------------------------------------
-- 2. Program management
-- ---------------------------------------------------------------------------
create or replace function public.create_program(
  p_code text,
  p_name text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_code text := btrim(coalesce(p_code, ''));
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_program_id uuid;
begin
  select role into v_actor_role from public.user_roles where user_id = v_actor;
  if v_actor is null or v_actor_role is null or v_actor_role::text not in ('administrator','manager','co_founder','founder') then
    raise exception 'insufficient_permission';
  end if;
  if v_code = '' then raise exception 'program_code_required'; end if;
  if v_name = '' then raise exception 'program_name_required'; end if;

  begin
    insert into public.programs(code,name,description,is_active,created_at,updated_at)
    values(v_code,v_name,v_description,true,now(),now())
    returning id into v_program_id;
  exception
    when unique_violation then raise exception 'program_code_exists';
  end;

  insert into public.admin_audit_logs(actor_id,action,target_user_id,details)
  values(v_actor,'create_program',null,jsonb_build_object(
    'program_id',v_program_id,
    'after',jsonb_build_object('code',v_code,'name',v_name,'description',v_description,'is_active',true)
  ));

  return v_program_id;
end
$$;

create or replace function public.update_program(
  p_program_id uuid,
  p_code text,
  p_name text,
  p_description text,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_code text := btrim(coalesce(p_code, ''));
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_before public.programs%rowtype;
  v_after public.programs%rowtype;
begin
  select role into v_actor_role from public.user_roles where user_id = v_actor;
  if v_actor is null or v_actor_role is null or v_actor_role::text not in ('administrator','manager','co_founder','founder') then
    raise exception 'insufficient_permission';
  end if;
  if v_code = '' then raise exception 'program_code_required'; end if;
  if v_name = '' then raise exception 'program_name_required'; end if;

  select * into v_before from public.programs where id = p_program_id;
  if not found then raise exception 'program_not_found'; end if;

  begin
    update public.programs
    set code=v_code,
        name=v_name,
        description=v_description,
        is_active=coalesce(p_is_active,false),
        updated_at=now()
    where id=p_program_id
    returning * into v_after;
  exception
    when unique_violation then raise exception 'program_code_exists';
  end;

  insert into public.admin_audit_logs(actor_id,action,target_user_id,details)
  values(v_actor,'update_program',null,jsonb_build_object(
    'program_id',p_program_id,
    'before',to_jsonb(v_before),
    'after',to_jsonb(v_after)
  ));
end
$$;

revoke all on function public.create_program(text,text,text) from public;
revoke execute on function public.create_program(text,text,text) from anon;
grant execute on function public.create_program(text,text,text) to authenticated;
revoke all on function public.update_program(uuid,text,text,text,boolean) from public;
revoke execute on function public.update_program(uuid,text,text,text,boolean) from anon;
grant execute on function public.update_program(uuid,text,text,text,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Class management
-- ---------------------------------------------------------------------------
create or replace function public.create_class(
  p_program_id uuid,
  p_code text,
  p_name text,
  p_description text,
  p_teacher_id uuid,
  p_starts_on date,
  p_ends_on date,
  p_status text default 'planned'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_teacher_role public.app_role;
  v_code text := nullif(btrim(coalesce(p_code, '')), '');
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_class_id uuid;
begin
  select role into v_actor_role from public.user_roles where user_id=v_actor;
  if v_actor is null or v_actor_role is null or v_actor_role::text not in ('administrator','manager','co_founder','founder') then
    raise exception 'insufficient_permission';
  end if;
  if v_name = '' then raise exception 'class_name_required'; end if;
  if v_status not in ('planned','active','completed','cancelled') then raise exception 'invalid_class_status'; end if;
  if p_starts_on is not null and p_ends_on is not null and p_ends_on < p_starts_on then raise exception 'invalid_class_dates'; end if;
  if not exists(select 1 from public.programs where id=p_program_id) then raise exception 'program_not_found'; end if;

  select role into v_teacher_role from public.user_roles where user_id=p_teacher_id;
  if v_teacher_role is null or v_teacher_role::text not in ('pengajar','administrator','manager','co_founder','founder') then
    raise exception 'teacher_not_eligible';
  end if;

  begin
    insert into public.classes(name,description,teacher_id,starts_on,ends_on,is_active,created_at,program_id,code,status)
    values(v_name,v_description,p_teacher_id,p_starts_on,p_ends_on,(v_status in ('planned','active')),now(),p_program_id,v_code,v_status)
    returning id into v_class_id;
  exception
    when unique_violation then raise exception 'class_code_exists';
  end;

  insert into public.admin_audit_logs(actor_id,action,target_user_id,details)
  values(v_actor,'create_class',null,jsonb_build_object(
    'class_id',v_class_id,
    'after',jsonb_build_object(
      'program_id',p_program_id,'code',v_code,'name',v_name,'description',v_description,
      'teacher_id',p_teacher_id,'starts_on',p_starts_on,'ends_on',p_ends_on,'status',v_status
    )
  ));

  return v_class_id;
end
$$;

create or replace function public.update_class(
  p_class_id uuid,
  p_program_id uuid,
  p_code text,
  p_name text,
  p_description text,
  p_teacher_id uuid,
  p_starts_on date,
  p_ends_on date,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_teacher_role public.app_role;
  v_code text := nullif(btrim(coalesce(p_code, '')), '');
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_before public.classes%rowtype;
  v_after public.classes%rowtype;
begin
  select role into v_actor_role from public.user_roles where user_id=v_actor;
  if v_actor is null or v_actor_role is null or v_actor_role::text not in ('administrator','manager','co_founder','founder') then
    raise exception 'insufficient_permission';
  end if;
  if v_name = '' then raise exception 'class_name_required'; end if;
  if v_status not in ('planned','active','completed','cancelled') then raise exception 'invalid_class_status'; end if;
  if p_starts_on is not null and p_ends_on is not null and p_ends_on < p_starts_on then raise exception 'invalid_class_dates'; end if;
  if not exists(select 1 from public.programs where id=p_program_id) then raise exception 'program_not_found'; end if;

  select role into v_teacher_role from public.user_roles where user_id=p_teacher_id;
  if v_teacher_role is null or v_teacher_role::text not in ('pengajar','administrator','manager','co_founder','founder') then
    raise exception 'teacher_not_eligible';
  end if;

  select * into v_before from public.classes where id=p_class_id;
  if not found then raise exception 'class_not_found'; end if;

  begin
    update public.classes
    set program_id=p_program_id,
        code=v_code,
        name=v_name,
        description=v_description,
        teacher_id=p_teacher_id,
        starts_on=p_starts_on,
        ends_on=p_ends_on,
        status=v_status,
        is_active=(v_status in ('planned','active'))
    where id=p_class_id
    returning * into v_after;
  exception
    when unique_violation then raise exception 'class_code_exists';
  end;

  insert into public.admin_audit_logs(actor_id,action,target_user_id,details)
  values(v_actor,'update_class',null,jsonb_build_object(
    'class_id',p_class_id,
    'before',to_jsonb(v_before),
    'after',to_jsonb(v_after)
  ));
end
$$;

revoke all on function public.create_class(uuid,text,text,text,uuid,date,date,text) from public;
revoke execute on function public.create_class(uuid,text,text,text,uuid,date,date,text) from anon;
grant execute on function public.create_class(uuid,text,text,text,uuid,date,date,text) to authenticated;
revoke all on function public.update_class(uuid,uuid,text,text,text,uuid,date,date,text) from public;
revoke execute on function public.update_class(uuid,uuid,text,text,text,uuid,date,date,text) from anon;
grant execute on function public.update_class(uuid,uuid,text,text,text,uuid,date,date,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Student enrollment management (upsert; never duplicates same class/user)
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
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_before public.class_enrollments%rowtype;
  v_after public.class_enrollments%rowtype;
  v_existed boolean := false;
begin
  select role into v_actor_role from public.user_roles where user_id=v_actor;
  if v_actor is null or v_actor_role is null or v_actor_role::text not in ('administrator','manager','co_founder','founder') then
    raise exception 'insufficient_permission';
  end if;
  if v_status not in ('active','paused','completed','cancelled') then raise exception 'invalid_enrollment_status'; end if;
  if not exists(select 1 from public.classes where id=p_class_id) then raise exception 'class_not_found'; end if;

  select role into v_target_role from public.user_roles where user_id=p_user_id;
  if v_target_role is null then raise exception 'target_user_not_found'; end if;
  if v_target_role::text <> 'siswa' then raise exception 'target_must_be_siswa'; end if;

  select * into v_before
  from public.class_enrollments
  where class_id=p_class_id and user_id=p_user_id;
  v_existed := found;

  insert into public.class_enrollments(class_id,user_id,status,joined_at,completed_at)
  values(
    p_class_id,
    p_user_id,
    v_status,
    now(),
    case when v_status='completed' then now() else null end
  )
  on conflict(class_id,user_id) do update
    set status=excluded.status,
        completed_at=case
          when excluded.status='completed' then coalesce(public.class_enrollments.completed_at,now())
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

revoke all on function public.set_class_enrollment(uuid,uuid,text) from public;
revoke execute on function public.set_class_enrollment(uuid,uuid,text) from anon;
grant execute on function public.set_class_enrollment(uuid,uuid,text) to authenticated;
