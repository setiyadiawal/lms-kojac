-- KOJAC LMS — Teacher Reporting & Honor System V1
-- Additive only. Historical migrations are not modified or replayed.

alter table public.teaching_reports
  add column if not exists review_status text not null default 'submitted',
  add column if not exists review_note text null,
  add column if not exists reviewed_by uuid null references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='teaching_reports_review_status_check') then
    alter table public.teaching_reports add constraint teaching_reports_review_status_check
      check (review_status in ('submitted','approved','revision'));
  end if;
end $$;

create index if not exists teaching_reports_review_status_idx
  on public.teaching_reports(review_status, report_date desc);

create table if not exists private.teacher_payroll_profiles (
  teacher_id uuid primary key references auth.users(id) on delete cascade,
  team_name text not null default 'Pengajar (Eduforce)',
  domicile text null,
  phone text null,
  bank_name text null,
  bank_account_name text null,
  bank_account_number text null,
  payment_method text not null default 'Transfer',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(btrim(team_name)) between 1 and 120),
  check (domicile is null or char_length(domicile)<=200),
  check (phone is null or char_length(phone)<=80),
  check (bank_name is null or char_length(bank_name)<=120),
  check (bank_account_name is null or char_length(bank_account_name)<=200),
  check (bank_account_number is null or char_length(bank_account_number)<=100),
  check (char_length(btrim(payment_method)) between 1 and 80),
  check (notes is null or char_length(notes)<=3000)
);
alter table private.teacher_payroll_profiles enable row level security;
revoke all on table private.teacher_payroll_profiles from public,anon,authenticated;

create table if not exists private.teacher_honor_rates (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid null references public.classes(id) on delete restrict,
  activity_label text not null,
  hourly_rate bigint not null,
  valid_from date not null,
  valid_to date null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(btrim(activity_label)) between 1 and 120),
  check (hourly_rate>0 and hourly_rate<=100000000),
  check (valid_to is null or valid_to>=valid_from)
);
create index if not exists teacher_honor_rates_lookup_idx on private.teacher_honor_rates(teacher_id,class_id,valid_from desc);
alter table private.teacher_honor_rates enable row level security;
revoke all on table private.teacher_honor_rates from public,anon,authenticated;

create table if not exists private.teacher_payrolls (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft',
  base_amount bigint not null default 0,
  additions_amount bigint not null default 0,
  deductions_amount bigint not null default 0,
  net_amount bigint not null default 0,
  total_sessions integer not null default 0,
  total_minutes integer not null default 0,
  profile_snapshot jsonb not null default '{}'::jsonb,
  finalized_by uuid null references auth.users(id) on delete set null,
  finalized_at timestamptz null,
  paid_by uuid null references auth.users(id) on delete set null,
  paid_at timestamptz null,
  paid_on date null,
  payment_note text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end>=period_start),
  check (status in ('draft','finalized','paid')),
  unique(teacher_id,period_start,period_end)
);
create index if not exists teacher_payrolls_period_idx on private.teacher_payrolls(period_start desc,teacher_id);
alter table private.teacher_payrolls enable row level security;
revoke all on table private.teacher_payrolls from public,anon,authenticated;

create table if not exists private.teacher_payroll_lines (
  id uuid primary key default gen_random_uuid(),
  payroll_id uuid not null references private.teacher_payrolls(id) on delete cascade,
  report_id uuid not null references public.teaching_reports(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  activity_label_snapshot text not null,
  class_name_snapshot text not null,
  report_date date not null,
  starts_at time without time zone not null,
  ends_at time without time zone not null,
  duration_minutes integer not null,
  hourly_rate_snapshot bigint not null,
  amount bigint not null,
  teacher_name_snapshot text not null,
  created_at timestamptz not null default now(),
  check(duration_minutes>0 and duration_minutes<=1440),
  check(hourly_rate_snapshot>0),
  check(amount>=0),
  unique(payroll_id,report_id)
);
create index if not exists teacher_payroll_lines_payroll_idx on private.teacher_payroll_lines(payroll_id,report_date,starts_at);
alter table private.teacher_payroll_lines enable row level security;
revoke all on table private.teacher_payroll_lines from public,anon,authenticated;

create table if not exists private.teacher_payroll_adjustments (
  id uuid primary key default gen_random_uuid(),
  payroll_id uuid not null references private.teacher_payrolls(id) on delete cascade,
  adjustment_type text not null check(adjustment_type in ('addition','deduction')),
  description text not null check(char_length(btrim(description)) between 1 and 240),
  amount bigint not null check(amount>0),
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table private.teacher_payroll_adjustments enable row level security;
revoke all on table private.teacher_payroll_adjustments from public,anon,authenticated;

create or replace function private.teacher_payroll_is_management()
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select exists(select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role::text in ('administrator','manager','co_founder','founder'))
$$;

create or replace function private.recalculate_teacher_payroll(p_payroll_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,private as $$
declare v_base bigint;v_add bigint;v_deduct bigint;v_sessions integer;v_minutes integer;
begin
  select coalesce(sum(amount),0)::bigint,count(*)::integer,coalesce(sum(duration_minutes),0)::integer
    into v_base,v_sessions,v_minutes from private.teacher_payroll_lines where payroll_id=p_payroll_id;
  select coalesce(sum(amount) filter(where adjustment_type='addition'),0)::bigint,
         coalesce(sum(amount) filter(where adjustment_type='deduction'),0)::bigint
    into v_add,v_deduct from private.teacher_payroll_adjustments where payroll_id=p_payroll_id;
  update private.teacher_payrolls set base_amount=v_base,additions_amount=v_add,deductions_amount=v_deduct,
    net_amount=greatest(v_base+v_add-v_deduct,0),total_sessions=v_sessions,total_minutes=v_minutes,updated_at=now()
  where id=p_payroll_id;
end $$;

create or replace function public.get_management_honor_overview(p_month date default null)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,private as $$
declare v_month date:=date_trunc('month',coalesce(p_month,(current_timestamp at time zone 'Asia/Jakarta')::date))::date;
        v_next date:=(v_month+interval '1 month')::date;v_result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;
  with teacher_ids as(
    select user_id teacher_id from public.user_roles where role::text='pengajar'
    union select teacher_id from public.classes where teacher_id is not null
    union select teacher_id from public.class_teacher_assignments where teacher_id is not null
  ), stats as(
    select teacher_id,
      count(*) filter(where review_status='submitted')::int submitted_count,
      count(*) filter(where review_status='revision')::int revision_count,
      count(*) filter(where review_status='approved')::int approved_count,
      coalesce(sum(case when review_status='approved' then floor(extract(epoch from (ends_at-starts_at))/60)::int else 0 end),0)::int approved_minutes
    from public.teaching_reports where report_date>=v_month and report_date<v_next group by teacher_id
  ), rows as(
    select t.teacher_id,coalesce(nullif(btrim(p.full_name),''),nullif(btrim(p.nickname),''),'Pengajar KOJAC') teacher_name,
      pp.team_name,pp.domicile,pp.phone,pp.bank_name,pp.bank_account_name,pp.bank_account_number,pp.payment_method,
      coalesce(s.submitted_count,0) submitted_count,coalesce(s.revision_count,0) revision_count,
      coalesce(s.approved_count,0) approved_count,coalesce(s.approved_minutes,0) approved_minutes,
      py.id payroll_id,py.status payroll_status,py.base_amount,py.additions_amount,py.deductions_amount,py.net_amount,
      py.total_sessions,py.total_minutes,py.paid_on
    from teacher_ids t join public.profiles p on p.user_id=t.teacher_id
    left join private.teacher_payroll_profiles pp on pp.teacher_id=t.teacher_id
    left join stats s on s.teacher_id=t.teacher_id
    left join private.teacher_payrolls py on py.teacher_id=t.teacher_id and py.period_start=v_month and py.period_end=(v_next-1)
  )
  select jsonb_build_object('month',v_month,'period_end',v_next-1,
    'summary',jsonb_build_object('teacher_count',count(*)::int,'submitted_reports',coalesce(sum(submitted_count),0)::int,
      'approved_reports',coalesce(sum(approved_count),0)::int,'revision_reports',coalesce(sum(revision_count),0)::int,
      'approved_minutes',coalesce(sum(approved_minutes),0)::int,'generated_payrolls',count(payroll_id)::int,
      'total_net_amount',coalesce(sum(net_amount),0)::bigint),
    'rows',coalesce(jsonb_agg(jsonb_build_object(
      'teacher_id',teacher_id,'teacher_name',teacher_name,'team_name',team_name,'domicile',domicile,'phone',phone,
      'bank_name',bank_name,'bank_account_name',bank_account_name,'bank_account_number',bank_account_number,'payment_method',payment_method,
      'submitted_count',submitted_count,'revision_count',revision_count,'approved_count',approved_count,'approved_minutes',approved_minutes,
      'payroll_id',payroll_id,'payroll_status',payroll_status,'base_amount',base_amount,'additions_amount',additions_amount,
      'deductions_amount',deductions_amount,'net_amount',net_amount,'total_sessions',total_sessions,'total_minutes',total_minutes,'paid_on',paid_on
    ) order by lower(teacher_name)),'[]'::jsonb)) into v_result from rows;
  return v_result;
end $$;
revoke all on function public.get_management_honor_overview(date) from public,anon;grant execute on function public.get_management_honor_overview(date) to authenticated;

create or replace function public.get_management_teacher_honor_config(p_teacher_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,private as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;
  select jsonb_build_object(
    'teacher',jsonb_build_object('teacher_id',p.user_id,'full_name',p.full_name,'nickname',p.nickname,'team_name',pp.team_name,
      'domicile',pp.domicile,'phone',pp.phone,'bank_name',pp.bank_name,'bank_account_name',pp.bank_account_name,
      'bank_account_number',pp.bank_account_number,'payment_method',pp.payment_method,'notes',pp.notes),
    'classes',coalesce((select jsonb_agg(jsonb_build_object('class_id',c.id,'class_code',c.code,'class_name',c.name,'class_status',c.status,'program_name',pr.name) order by c.name)
      from public.classes c left join public.programs pr on pr.id=c.program_id where c.teacher_id=p_teacher_id or exists(select 1 from public.class_teacher_assignments a where a.class_id=c.id and a.teacher_id=p_teacher_id)),'[]'::jsonb),
    'rates',coalesce((select jsonb_agg(jsonb_build_object('rate_id',r.id,'class_id',r.class_id,'class_name',c.name,'activity_label',r.activity_label,'hourly_rate',r.hourly_rate,'valid_from',r.valid_from,'valid_to',r.valid_to) order by r.valid_from desc,r.created_at desc)
      from private.teacher_honor_rates r left join public.classes c on c.id=r.class_id where r.teacher_id=p_teacher_id),'[]'::jsonb)
  ) into v_result from public.profiles p left join private.teacher_payroll_profiles pp on pp.teacher_id=p.user_id where p.user_id=p_teacher_id;
  if v_result is null then raise exception 'teacher_not_found'; end if;return v_result;
end $$;
revoke all on function public.get_management_teacher_honor_config(uuid) from public,anon;grant execute on function public.get_management_teacher_honor_config(uuid) to authenticated;

create or replace function public.save_management_teacher_payroll_profile(p_teacher_id uuid,p_team_name text,p_domicile text,p_phone text,p_bank_name text,p_bank_account_name text,p_bank_account_number text,p_payment_method text,p_notes text default null)
returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_actor uuid:=auth.uid();begin
  if v_actor is null then raise exception 'authentication_required'; end if;if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;
  insert into private.teacher_payroll_profiles(teacher_id,team_name,domicile,phone,bank_name,bank_account_name,bank_account_number,payment_method,notes,updated_at)
  values(p_teacher_id,coalesce(nullif(btrim(p_team_name),''),'Pengajar (Eduforce)'),nullif(btrim(coalesce(p_domicile,'')),''),nullif(btrim(coalesce(p_phone,'')),''),
    nullif(btrim(coalesce(p_bank_name,'')),''),nullif(btrim(coalesce(p_bank_account_name,'')),''),nullif(btrim(coalesce(p_bank_account_number,'')),''),coalesce(nullif(btrim(p_payment_method),''),'Transfer'),nullif(btrim(coalesce(p_notes,'')),''),now())
  on conflict(teacher_id) do update set team_name=excluded.team_name,domicile=excluded.domicile,phone=excluded.phone,bank_name=excluded.bank_name,
    bank_account_name=excluded.bank_account_name,bank_account_number=excluded.bank_account_number,payment_method=excluded.payment_method,notes=excluded.notes,updated_at=now();
  insert into public.admin_audit_logs(actor_id,action,target_user_id,details) values(v_actor,'save_teacher_payroll_profile',p_teacher_id,'{}');
end $$;
revoke all on function public.save_management_teacher_payroll_profile(uuid,text,text,text,text,text,text,text,text) from public,anon;grant execute on function public.save_management_teacher_payroll_profile(uuid,text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.save_management_teacher_honor_rate(p_teacher_id uuid,p_rate_id uuid,p_class_id uuid,p_activity_label text,p_hourly_rate bigint,p_valid_from date,p_valid_to date default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_actor uuid:=auth.uid();v_id uuid;begin
  if v_actor is null then raise exception 'authentication_required'; end if;if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;
  if p_hourly_rate is null or p_hourly_rate<=0 then raise exception 'invalid_hourly_rate'; end if;if p_valid_from is null then raise exception 'valid_from_required'; end if;if p_valid_to is not null and p_valid_to<p_valid_from then raise exception 'invalid_rate_period'; end if;
  if p_rate_id is null then insert into private.teacher_honor_rates(teacher_id,class_id,activity_label,hourly_rate,valid_from,valid_to,created_by)
    values(p_teacher_id,p_class_id,btrim(p_activity_label),p_hourly_rate,p_valid_from,p_valid_to,v_actor) returning id into v_id;
  else update private.teacher_honor_rates set class_id=p_class_id,activity_label=btrim(p_activity_label),hourly_rate=p_hourly_rate,valid_from=p_valid_from,valid_to=p_valid_to,updated_at=now()
    where id=p_rate_id and teacher_id=p_teacher_id returning id into v_id;if v_id is null then raise exception 'honor_rate_not_found'; end if;end if;
  insert into public.admin_audit_logs(actor_id,action,target_user_id,details) values(v_actor,'save_teacher_honor_rate',p_teacher_id,jsonb_build_object('rate_id',v_id,'hourly_rate',p_hourly_rate));return v_id;
end $$;
revoke all on function public.save_management_teacher_honor_rate(uuid,uuid,uuid,text,bigint,date,date) from public,anon;grant execute on function public.save_management_teacher_honor_rate(uuid,uuid,uuid,text,bigint,date,date) to authenticated;

create or replace function public.delete_management_teacher_honor_rate(p_rate_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_actor uuid:=auth.uid();v_teacher uuid;begin
 if v_actor is null then raise exception 'authentication_required'; end if;if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;
 select teacher_id into v_teacher from private.teacher_honor_rates where id=p_rate_id;if v_teacher is null then raise exception 'honor_rate_not_found'; end if;delete from private.teacher_honor_rates where id=p_rate_id;
 insert into public.admin_audit_logs(actor_id,action,target_user_id,details) values(v_actor,'delete_teacher_honor_rate',v_teacher,jsonb_build_object('rate_id',p_rate_id));end $$;
revoke all on function public.delete_management_teacher_honor_rate(uuid) from public,anon;grant execute on function public.delete_management_teacher_honor_rate(uuid) to authenticated;

create or replace function public.review_management_teaching_report(p_report_id uuid,p_decision text,p_note text default null)
returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_actor uuid:=auth.uid();v_decision text:=lower(btrim(coalesce(p_decision,'')));v_teacher uuid;begin
 if v_actor is null then raise exception 'authentication_required'; end if;if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;if v_decision not in('approved','revision') then raise exception 'invalid_review_decision'; end if;
 update public.teaching_reports set review_status=v_decision,review_note=nullif(btrim(coalesce(p_note,'')),''),reviewed_by=v_actor,reviewed_at=now(),updated_at=now() where id=p_report_id returning teacher_id into v_teacher;
 if not found then raise exception 'teaching_report_not_found'; end if;insert into public.admin_audit_logs(actor_id,action,target_user_id,details) values(v_actor,'review_teaching_report',v_teacher,jsonb_build_object('report_id',p_report_id,'decision',v_decision));end $$;
revoke all on function public.review_management_teaching_report(uuid,text,text) from public,anon;grant execute on function public.review_management_teaching_report(uuid,text,text) to authenticated;

create or replace function public.get_management_teacher_month_reports(p_teacher_id uuid,p_month date)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,private as $$
declare v_month date:=date_trunc('month',p_month)::date;v_next date:=(v_month+interval '1 month')::date;v_result jsonb;begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;
 select jsonb_build_object('teacher_id',p_teacher_id,'month',v_month,'rows',coalesce(jsonb_agg(jsonb_build_object('report_id',r.id,'class_id',r.class_id,'class_name',c.name,'class_code',c.code,'teacher_name',r.teacher_name_snapshot,'report_date',r.report_date,'starts_at',r.starts_at,'ends_at',r.ends_at,'duration_minutes',floor(extract(epoch from (r.ends_at-r.starts_at))/60)::int,'material_summary',r.material_summary,'assignment_summary',r.assignment_summary,'next_plan',r.next_plan,'evaluation_notes',r.evaluation_notes,'review_status',r.review_status,'review_note',r.review_note,'reviewed_at',r.reviewed_at) order by r.report_date,r.starts_at),'[]'::jsonb)) into v_result
 from public.teaching_reports r join public.classes c on c.id=r.class_id where r.teacher_id=p_teacher_id and r.report_date>=v_month and r.report_date<v_next;return v_result;end $$;
revoke all on function public.get_management_teacher_month_reports(uuid,date) from public,anon;grant execute on function public.get_management_teacher_month_reports(uuid,date) to authenticated;

create or replace function public.generate_management_teacher_payroll(p_teacher_id uuid,p_month date)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_actor uuid:=auth.uid();v_month date:=date_trunc('month',p_month)::date;v_next date:=(v_month+interval '1 month')::date;v_end date:=v_next-1;v_payroll uuid;v_status text;v_missing int;v_profile jsonb;begin
 if v_actor is null then raise exception 'authentication_required'; end if;if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;
 select status,id into v_status,v_payroll from private.teacher_payrolls where teacher_id=p_teacher_id and period_start=v_month and period_end=v_end for update;if v_status in('finalized','paid') then raise exception 'payroll_locked'; end if;
 select jsonb_build_object('teacher_id',p.user_id,'full_name',coalesce(nullif(btrim(p.full_name),''),nullif(btrim(p.nickname),''),'Pengajar KOJAC'),'team_name',coalesce(pp.team_name,'Pengajar (Eduforce)'),'domicile',pp.domicile,'phone',pp.phone,'bank_name',pp.bank_name,'bank_account_name',pp.bank_account_name,'bank_account_number',pp.bank_account_number,'payment_method',coalesce(pp.payment_method,'Transfer')) into v_profile
 from public.profiles p left join private.teacher_payroll_profiles pp on pp.teacher_id=p.user_id where p.user_id=p_teacher_id;if v_profile is null then raise exception 'teacher_not_found'; end if;
 if v_payroll is null then insert into private.teacher_payrolls(teacher_id,period_start,period_end,status,profile_snapshot,created_by) values(p_teacher_id,v_month,v_end,'draft',v_profile,v_actor) returning id into v_payroll;else update private.teacher_payrolls set profile_snapshot=v_profile,updated_at=now() where id=v_payroll;delete from private.teacher_payroll_lines where payroll_id=v_payroll;end if;
 with approved as(select r.* from public.teaching_reports r where r.teacher_id=p_teacher_id and r.review_status='approved' and r.report_date>=v_month and r.report_date<v_next),resolved as(select a.id,hr.id rate_id from approved a left join lateral(select x.* from private.teacher_honor_rates x where x.teacher_id=p_teacher_id and (x.class_id=a.class_id or x.class_id is null) and x.valid_from<=a.report_date and (x.valid_to is null or x.valid_to>=a.report_date) order by case when x.class_id=a.class_id then 0 else 1 end,x.valid_from desc,x.created_at desc limit 1) hr on true)
 select count(*)::int into v_missing from resolved where rate_id is null;if v_missing>0 then raise exception 'missing_honor_rate:%',v_missing;end if;
 insert into private.teacher_payroll_lines(payroll_id,report_id,class_id,activity_label_snapshot,class_name_snapshot,report_date,starts_at,ends_at,duration_minutes,hourly_rate_snapshot,amount,teacher_name_snapshot)
 select v_payroll,r.id,r.class_id,hr.activity_label,c.name,r.report_date,r.starts_at,r.ends_at,floor(extract(epoch from (r.ends_at-r.starts_at))/60)::int,hr.hourly_rate,round(floor(extract(epoch from (r.ends_at-r.starts_at))/60)::numeric*hr.hourly_rate::numeric/60)::bigint,r.teacher_name_snapshot
 from public.teaching_reports r join public.classes c on c.id=r.class_id join lateral(select x.* from private.teacher_honor_rates x where x.teacher_id=p_teacher_id and (x.class_id=r.class_id or x.class_id is null) and x.valid_from<=r.report_date and (x.valid_to is null or x.valid_to>=r.report_date) order by case when x.class_id=r.class_id then 0 else 1 end,x.valid_from desc,x.created_at desc limit 1) hr on true
 where r.teacher_id=p_teacher_id and r.review_status='approved' and r.report_date>=v_month and r.report_date<v_next order by r.report_date,r.starts_at;
 perform private.recalculate_teacher_payroll(v_payroll);insert into public.admin_audit_logs(actor_id,action,target_user_id,details) values(v_actor,'generate_teacher_payroll',p_teacher_id,jsonb_build_object('payroll_id',v_payroll,'period_start',v_month));return v_payroll;end $$;
revoke all on function public.generate_management_teacher_payroll(uuid,date) from public,anon;grant execute on function public.generate_management_teacher_payroll(uuid,date) to authenticated;

create or replace function public.add_management_payroll_adjustment(p_payroll_id uuid,p_type text,p_description text,p_amount bigint)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_actor uuid:=auth.uid();v_status text;v_teacher uuid;v_id uuid;begin
 if v_actor is null then raise exception 'authentication_required'; end if;if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;
 select status,teacher_id into v_status,v_teacher from private.teacher_payrolls where id=p_payroll_id;if v_status is null then raise exception 'payroll_not_found'; end if;if v_status<>'draft' then raise exception 'payroll_locked'; end if;
 insert into private.teacher_payroll_adjustments(payroll_id,adjustment_type,description,amount,created_by) values(p_payroll_id,lower(btrim(p_type)),btrim(p_description),p_amount,v_actor) returning id into v_id;perform private.recalculate_teacher_payroll(p_payroll_id);return v_id;end $$;
revoke all on function public.add_management_payroll_adjustment(uuid,text,text,bigint) from public,anon;grant execute on function public.add_management_payroll_adjustment(uuid,text,text,bigint) to authenticated;

create or replace function public.delete_management_payroll_adjustment(p_adjustment_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_actor uuid:=auth.uid();v_payroll uuid;v_status text;begin
 if v_actor is null then raise exception 'authentication_required'; end if;if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;
 select a.payroll_id,p.status into v_payroll,v_status from private.teacher_payroll_adjustments a join private.teacher_payrolls p on p.id=a.payroll_id where a.id=p_adjustment_id;if v_payroll is null then raise exception 'adjustment_not_found'; end if;if v_status<>'draft' then raise exception 'payroll_locked'; end if;delete from private.teacher_payroll_adjustments where id=p_adjustment_id;perform private.recalculate_teacher_payroll(v_payroll);end $$;
revoke all on function public.delete_management_payroll_adjustment(uuid) from public,anon;grant execute on function public.delete_management_payroll_adjustment(uuid) to authenticated;

create or replace function public.get_teacher_payroll_detail(p_payroll_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,private as $$
declare v_actor uuid:=auth.uid();v_owner uuid;v_result jsonb;begin
 if v_actor is null then raise exception 'authentication_required'; end if;select teacher_id into v_owner from private.teacher_payrolls where id=p_payroll_id;if v_owner is null then raise exception 'payroll_not_found'; end if;if v_owner<>v_actor and not private.teacher_payroll_is_management() then raise exception 'payroll_access_denied'; end if;
 select jsonb_build_object('payroll',jsonb_build_object('payroll_id',p.id,'teacher_id',p.teacher_id,'period_start',p.period_start,'period_end',p.period_end,'status',p.status,'base_amount',p.base_amount,'additions_amount',p.additions_amount,'deductions_amount',p.deductions_amount,'net_amount',p.net_amount,'total_sessions',p.total_sessions,'total_minutes',p.total_minutes,'profile_snapshot',p.profile_snapshot,'finalized_at',p.finalized_at,'paid_at',p.paid_at,'paid_on',p.paid_on,'payment_note',p.payment_note),
 'lines',coalesce((select jsonb_agg(jsonb_build_object('line_id',l.id,'report_id',l.report_id,'class_id',l.class_id,'activity_label',l.activity_label_snapshot,'class_name',l.class_name_snapshot,'report_date',l.report_date,'starts_at',l.starts_at,'ends_at',l.ends_at,'duration_minutes',l.duration_minutes,'hourly_rate',l.hourly_rate_snapshot,'amount',l.amount,'teacher_name',l.teacher_name_snapshot) order by l.report_date,l.starts_at,l.id) from private.teacher_payroll_lines l where l.payroll_id=p.id),'[]'::jsonb),
 'adjustments',coalesce((select jsonb_agg(jsonb_build_object('adjustment_id',a.id,'type',a.adjustment_type,'description',a.description,'amount',a.amount,'created_at',a.created_at) order by a.created_at,a.id) from private.teacher_payroll_adjustments a where a.payroll_id=p.id),'[]'::jsonb)) into v_result from private.teacher_payrolls p where p.id=p_payroll_id;return v_result;end $$;
revoke all on function public.get_teacher_payroll_detail(uuid) from public,anon;grant execute on function public.get_teacher_payroll_detail(uuid) to authenticated;

create or replace function public.finalize_management_teacher_payroll(p_payroll_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_actor uuid:=auth.uid();v_teacher uuid;v_status text;v_sessions int;begin
 if v_actor is null then raise exception 'authentication_required'; end if;if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;select teacher_id,status,total_sessions into v_teacher,v_status,v_sessions from private.teacher_payrolls where id=p_payroll_id for update;if v_teacher is null then raise exception 'payroll_not_found'; end if;if v_status<>'draft' then raise exception 'payroll_locked'; end if;if v_sessions<=0 then raise exception 'payroll_has_no_sessions'; end if;update private.teacher_payrolls set status='finalized',finalized_by=v_actor,finalized_at=now(),updated_at=now() where id=p_payroll_id;end $$;
revoke all on function public.finalize_management_teacher_payroll(uuid) from public,anon;grant execute on function public.finalize_management_teacher_payroll(uuid) to authenticated;

create or replace function public.mark_management_teacher_payroll_paid(p_payroll_id uuid,p_paid_on date,p_payment_note text default null)
returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_actor uuid:=auth.uid();v_teacher uuid;v_status text;begin
 if v_actor is null then raise exception 'authentication_required'; end if;if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;select teacher_id,status into v_teacher,v_status from private.teacher_payrolls where id=p_payroll_id for update;if v_teacher is null then raise exception 'payroll_not_found'; end if;if v_status<>'finalized' then raise exception 'payroll_not_finalized'; end if;update private.teacher_payrolls set status='paid',paid_by=v_actor,paid_at=now(),paid_on=p_paid_on,payment_note=nullif(btrim(coalesce(p_payment_note,'')),''),updated_at=now() where id=p_payroll_id;end $$;
revoke all on function public.mark_management_teacher_payroll_paid(uuid,date,text) from public,anon;grant execute on function public.mark_management_teacher_payroll_paid(uuid,date,text) to authenticated;

create or replace function public.get_my_teacher_payrolls()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,private as $$
declare v_actor uuid:=auth.uid();v_result jsonb;begin if v_actor is null then raise exception 'authentication_required';end if;select coalesce(jsonb_agg(jsonb_build_object('payroll_id',id,'period_start',period_start,'period_end',period_end,'status',status,'base_amount',base_amount,'additions_amount',additions_amount,'deductions_amount',deductions_amount,'net_amount',net_amount,'total_sessions',total_sessions,'total_minutes',total_minutes,'paid_on',paid_on) order by period_start desc),'[]'::jsonb) into v_result from private.teacher_payrolls where teacher_id=v_actor and status in('finalized','paid');return v_result;end $$;
revoke all on function public.get_my_teacher_payrolls() from public,anon;grant execute on function public.get_my_teacher_payrolls() to authenticated;

-- Lock approved report content for non-management actors.
create or replace function private.guard_approved_teaching_report()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_role public.app_role;
begin
  if old.review_status='approved' and (
    new.class_id is distinct from old.class_id or new.teacher_id is distinct from old.teacher_id or
    new.report_date is distinct from old.report_date or new.starts_at is distinct from old.starts_at or
    new.ends_at is distinct from old.ends_at or new.material_summary is distinct from old.material_summary or
    new.assignment_summary is distinct from old.assignment_summary or new.next_plan is distinct from old.next_plan or
    new.evaluation_notes is distinct from old.evaluation_notes
  ) then
    select role into v_role from public.user_roles where user_id=auth.uid();
    if v_role is null or v_role::text not in('administrator','manager','co_founder','founder') then
      raise exception 'approved_report_locked';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists teaching_reports_guard_approved on public.teaching_reports;
create trigger teaching_reports_guard_approved before update on public.teaching_reports
for each row execute function private.guard_approved_teaching_report();

revoke all on all tables in schema private from public,anon;
