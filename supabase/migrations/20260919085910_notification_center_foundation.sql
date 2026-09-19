-- KOJAC LMS v1.1 — Notification Center Foundation
-- Production migration version: 20260919085910
-- Already applied to production through Supabase migration mechanism.
-- No historical notification backfill.

create table private.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null default '',
  href text,
  source_key text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_type_check check (
    notification_type in ('account_approved','assignment_published','assignment_submitted','assignment_reviewed')
  ),
  constraint notifications_title_check check (char_length(btrim(title)) between 1 and 160),
  constraint notifications_message_check check (char_length(message) <= 1000),
  constraint notifications_href_check check (href is null or (char_length(href) <= 300 and href like '/%')),
  constraint notifications_source_key_check check (char_length(source_key) between 1 and 300),
  constraint notifications_user_source_unique unique (user_id, source_key)
);

create index notifications_user_created_idx
on private.notifications(user_id, created_at desc);

create index notifications_user_unread_idx
on private.notifications(user_id, created_at desc)
where read_at is null;

alter table private.notifications enable row level security;
revoke all on private.notifications from public, anon, authenticated;

create or replace function private.insert_notification(
  p_user_id uuid,
  p_notification_type text,
  p_title text,
  p_message text,
  p_href text,
  p_source_key text
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare v_id uuid;
begin
  if p_user_id is null then return null; end if;

  insert into private.notifications(
    user_id,notification_type,title,message,href,source_key
  )
  values(
    p_user_id,
    p_notification_type,
    btrim(p_title),
    coalesce(p_message,''),
    p_href,
    p_source_key
  )
  on conflict(user_id,source_key) do nothing
  returning id into v_id;

  return v_id;
end
$$;

revoke all on function private.insert_notification(uuid,text,text,text,text,text) from public,anon,authenticated;

create or replace function private.get_my_notifications(p_limit integer default 30)
returns table(
  notification_id uuid,
  notification_type text,
  title text,
  message text,
  href text,
  created_at timestamptz,
  read_at timestamptz
)
language plpgsql
stable
security definer
set search_path=pg_catalog,public,private
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  return query
  select n.id,n.notification_type,n.title,n.message,n.href,n.created_at,n.read_at
  from private.notifications n
  where n.user_id=auth.uid()
  order by n.created_at desc
  limit greatest(1,least(coalesce(p_limit,30),100));
end
$$;

create or replace function private.get_my_unread_notification_count()
returns integer
language plpgsql
stable
security definer
set search_path=pg_catalog,public,private
as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select count(*)::integer into v_count
  from private.notifications n
  where n.user_id=auth.uid() and n.read_at is null;

  return v_count;
end
$$;

create or replace function private.mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  update private.notifications
  set read_at=coalesce(read_at,now())
  where id=p_notification_id and user_id=auth.uid();

  if not found then raise exception 'notification_not_found_or_access_denied'; end if;
end
$$;

create or replace function private.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  update private.notifications
  set read_at=now()
  where user_id=auth.uid() and read_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end
$$;

create or replace function public.get_my_notifications(p_limit integer default 30)
returns table(
  notification_id uuid,
  notification_type text,
  title text,
  message text,
  href text,
  created_at timestamptz,
  read_at timestamptz
)
language sql
stable
security invoker
set search_path=pg_catalog,public,private
as $$ select * from private.get_my_notifications(p_limit) $$;

create or replace function public.get_my_unread_notification_count()
returns integer
language sql
stable
security invoker
set search_path=pg_catalog,public,private
as $$ select private.get_my_unread_notification_count() $$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language sql
security invoker
set search_path=pg_catalog,public,private
as $$ select private.mark_notification_read(p_notification_id) $$;

create or replace function public.mark_all_notifications_read()
returns integer
language sql
security invoker
set search_path=pg_catalog,public,private
as $$ select private.mark_all_notifications_read() $$;

revoke all on function private.get_my_notifications(integer) from public,anon;
revoke all on function private.get_my_unread_notification_count() from public,anon;
revoke all on function private.mark_notification_read(uuid) from public,anon;
revoke all on function private.mark_all_notifications_read() from public,anon;
grant execute on function private.get_my_notifications(integer) to authenticated;
grant execute on function private.get_my_unread_notification_count() to authenticated;
grant execute on function private.mark_notification_read(uuid) to authenticated;
grant execute on function private.mark_all_notifications_read() to authenticated;

revoke all on function public.get_my_notifications(integer) from public,anon;
revoke all on function public.get_my_unread_notification_count() from public,anon;
revoke all on function public.mark_notification_read(uuid) from public,anon;
revoke all on function public.mark_all_notifications_read() from public,anon;
grant execute on function public.get_my_notifications(integer) to authenticated;
grant execute on function public.get_my_unread_notification_count() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

create or replace function private.notify_account_approved()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
begin
  if new.is_approved and not coalesce(old.is_approved,false) then
    perform private.insert_notification(
      new.user_id,
      'account_approved',
      'Akun KOJAC disetujui',
      'Akun Anda sudah disetujui. Selamat belajar di KOJAC LMS.',
      '/',
      'account_approved:' || new.user_id::text || ':' || coalesce(new.approved_at::text,'approved')
    );
  end if;
  return new;
end
$$;

create or replace function private.notify_assignment_published()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_class_name text;
  v_student uuid;
begin
  if new.status='published'
     and (tg_op='INSERT' or old.status is distinct from 'published') then

    select c.name into v_class_name from public.classes c where c.id=new.class_id;

    for v_student in
      select e.user_id
      from public.class_enrollments e
      where e.class_id=new.class_id and e.status<>'cancelled'
    loop
      perform private.insert_notification(
        v_student,
        'assignment_published',
        'Tugas baru: ' || new.title,
        'Tugas baru telah dipublikasikan untuk kelas ' || coalesce(v_class_name,'KOJAC') || '.',
        '/tugas-saya',
        'assignment_published:' || new.id::text
      );
    end loop;
  end if;
  return new;
end
$$;

create or replace function private.notify_assignment_submission()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_class_id uuid;
  v_assignment_title text;
  v_student_name text;
  v_teacher uuid;
  v_source text;
begin
  if tg_op='INSERT' or new.submitted_at is distinct from old.submitted_at then
    select a.class_id,a.title into v_class_id,v_assignment_title
    from private.class_assignments a
    where a.id=new.assignment_id;

    select coalesce(p.full_name,p.nickname,'Siswa KOJAC') into v_student_name
    from public.profiles p where p.user_id=new.student_id;

    v_source :=
      'assignment_submitted:' || new.assignment_id::text || ':' ||
      new.student_id::text || ':' ||
      extract(epoch from new.submitted_at)::numeric(20,6)::text;

    for v_teacher in
      select distinct teacher_id
      from (
        select c.teacher_id
        from public.classes c
        where c.id=v_class_id and c.teacher_id is not null

        union

        select cta.teacher_id
        from public.class_teacher_assignments cta
        where cta.class_id=v_class_id
          and cta.teacher_id is not null
          and cta.is_active
          and current_date between cta.starts_on and cta.ends_on
      ) teachers
      where teacher_id is not null
    loop
      perform private.insert_notification(
        v_teacher,
        'assignment_submitted',
        'Tugas dikumpulkan',
        coalesce(v_student_name,'Siswa KOJAC') || ' mengumpulkan tugas ' || coalesce(v_assignment_title,'KOJAC') || '.',
        '/pengajar/tugas',
        v_source
      );
    end loop;
  end if;
  return new;
end
$$;

create or replace function private.notify_assignment_reviewed()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_assignment_title text;
begin
  if new.reviewed_at is not null
     and new.reviewed_at is distinct from old.reviewed_at then

    select a.title into v_assignment_title
    from private.class_assignments a
    where a.id=new.assignment_id;

    perform private.insert_notification(
      new.student_id,
      'assignment_reviewed',
      'Tugas sudah dinilai',
      'Tugas ' || coalesce(v_assignment_title,'KOJAC') || ' sudah dinilai oleh pengajar.',
      '/tugas-saya',
      'assignment_reviewed:' || new.assignment_id::text || ':' ||
      new.student_id::text || ':' ||
      extract(epoch from new.reviewed_at)::numeric(20,6)::text
    );
  end if;
  return new;
end
$$;

revoke all on function private.notify_account_approved() from public,anon,authenticated;
revoke all on function private.notify_assignment_published() from public,anon,authenticated;
revoke all on function private.notify_assignment_submission() from public,anon,authenticated;
revoke all on function private.notify_assignment_reviewed() from public,anon,authenticated;

create trigger profiles_notify_account_approved
after update of is_approved on public.profiles
for each row execute function private.notify_account_approved();

create trigger class_assignments_notify_published
after insert or update of status on private.class_assignments
for each row execute function private.notify_assignment_published();

create trigger assignment_submissions_notify_submission
after insert or update of submitted_at on private.assignment_submissions
for each row execute function private.notify_assignment_submission();

create trigger assignment_submissions_notify_reviewed
after update of reviewed_at on private.assignment_submissions
for each row execute function private.notify_assignment_reviewed();
