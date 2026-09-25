-- KOJAC Document Number Registry V1
-- Production migration version: 20260922152135
-- Central numbering for Slip Honor, Surat, Kwitansi, Tagihan, and future documents.

create table if not exists private.document_number_settings (
  document_type text primary key,
  label text not null,
  code text not null,
  reset_period text not null default 'monthly',
  padding integer not null default 4,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null,
  constraint document_number_settings_type_check check (document_type ~ '^[a-z][a-z0-9_]{1,50}$'),
  constraint document_number_settings_label_check check (char_length(btrim(label)) between 1 and 100),
  constraint document_number_settings_code_check check (code ~ '^[A-Z0-9]{1,12}$'),
  constraint document_number_settings_reset_check check (reset_period in ('monthly','yearly','never')),
  constraint document_number_settings_padding_check check (padding between 2 and 8)
);
alter table private.document_number_settings enable row level security;
revoke all on table private.document_number_settings from public,anon,authenticated;

insert into private.document_number_settings(document_type,label,code,reset_period,padding)
values
  ('honor_slip','Slip Honor','SH','monthly',4),
  ('letter','Surat','SRT','monthly',4),
  ('receipt','Kwitansi','KWT','monthly',4),
  ('invoice','Tagihan','INV','monthly',4)
on conflict(document_type) do nothing;

create table if not exists private.document_number_sequences (
  document_type text not null references private.document_number_settings(document_type) on delete restrict,
  period_key text not null,
  last_serial integer not null default 0 check(last_serial>=0),
  updated_at timestamptz not null default now(),
  primary key(document_type,period_key)
);
alter table private.document_number_sequences enable row level security;
revoke all on table private.document_number_sequences from public,anon,authenticated;

create table if not exists private.document_numbers (
  id uuid primary key default gen_random_uuid(),
  document_type text not null references private.document_number_settings(document_type) on delete restrict,
  document_number text not null unique,
  serial_number integer not null check(serial_number>0),
  period_key text not null,
  issue_date date not null,
  entity_key text null,
  reference_label text null check(reference_label is null or char_length(reference_label)<=240),
  description text null check(description is null or char_length(description)<=3000),
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'issued' check(status in('issued','void')),
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  voided_by uuid null references auth.users(id) on delete set null,
  voided_at timestamptz null,
  void_reason text null check(void_reason is null or char_length(void_reason)<=1000)
);
create unique index if not exists document_numbers_entity_unique_idx
  on private.document_numbers(document_type,entity_key) where entity_key is not null;
create index if not exists document_numbers_type_date_idx
  on private.document_numbers(document_type,issue_date desc,serial_number desc);
alter table private.document_numbers enable row level security;
revoke all on table private.document_numbers from public,anon,authenticated;

create or replace function private.issue_document_number(
  p_document_type text,
  p_issue_date date,
  p_entity_key text default null,
  p_reference_label text default null,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_actor uuid default null
)
returns table(document_id uuid,document_number text)
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_code text; v_reset text; v_padding integer; v_active boolean;
  v_period text; v_serial integer; v_number text;
  v_existing private.document_numbers%rowtype;
  v_date date:=coalesce(p_issue_date,(current_timestamp at time zone 'Asia/Jakarta')::date);
begin
  if p_entity_key is not null then
    select * into v_existing from private.document_numbers
    where document_type=p_document_type and entity_key=p_entity_key limit 1;
    if found then
      document_id:=v_existing.id;document_number:=v_existing.document_number;return next;return;
    end if;
  end if;

  select code,reset_period,padding,is_active into v_code,v_reset,v_padding,v_active
  from private.document_number_settings where document_type=p_document_type;
  if not found then raise exception 'document_number_setting_not_found'; end if;
  if not v_active then raise exception 'document_number_type_inactive'; end if;

  v_period:=case v_reset when 'monthly' then to_char(v_date,'YYYYMM')
    when 'yearly' then to_char(v_date,'YYYY') else 'ALL' end;

  perform pg_advisory_xact_lock(hashtextextended(p_document_type||':'||v_period,0));

  insert into private.document_number_sequences(document_type,period_key,last_serial,updated_at)
  values(p_document_type,v_period,1,now())
  on conflict(document_type,period_key)
  do update set last_serial=private.document_number_sequences.last_serial+1,updated_at=now()
  returning last_serial into v_serial;

  v_number:=case v_reset
    when 'monthly' then 'KOJAC/'||v_code||'/'||to_char(v_date,'YYYY')||'/'||to_char(v_date,'MM')||'/'||lpad(v_serial::text,v_padding,'0')
    when 'yearly' then 'KOJAC/'||v_code||'/'||to_char(v_date,'YYYY')||'/'||lpad(v_serial::text,v_padding,'0')
    else 'KOJAC/'||v_code||'/'||lpad(v_serial::text,v_padding,'0') end;

  insert into private.document_numbers(
    document_type,document_number,serial_number,period_key,issue_date,entity_key,
    reference_label,description,metadata,created_by
  ) values(
    p_document_type,v_number,v_serial,v_period,v_date,
    nullif(btrim(coalesce(p_entity_key,'')),''),
    nullif(btrim(coalesce(p_reference_label,'')),''),
    nullif(btrim(coalesce(p_description,'')),''),
    coalesce(p_metadata,'{}'::jsonb),coalesce(p_actor,auth.uid())
  ) returning id into document_id;

  document_number:=v_number;return next;
end
$$;
revoke all on function private.issue_document_number(text,date,text,text,text,jsonb,uuid) from public,anon,authenticated;

alter table private.teacher_payrolls
  add column if not exists slip_number text null,
  add column if not exists slip_document_id uuid null references private.document_numbers(id) on delete restrict;
create unique index if not exists teacher_payrolls_slip_number_uidx
  on private.teacher_payrolls(slip_number) where slip_number is not null;

-- NOTE:
-- Existing finalized/paid payrolls are backfilled by the production migration.
-- New slip numbers are issued automatically by finalize_management_teacher_payroll.

create or replace function public.get_management_document_number_overview(
  p_document_type text default null,p_limit integer default 200
)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,private
as $$
declare v_result jsonb;v_limit integer:=least(greatest(coalesce(p_limit,200),1),500);
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;
  select jsonb_build_object(
    'settings',coalesce((select jsonb_agg(jsonb_build_object(
      'document_type',s.document_type,'label',s.label,'code',s.code,'reset_period',s.reset_period,
      'padding',s.padding,'is_active',s.is_active) order by s.label)
      from private.document_number_settings s),'[]'::jsonb),
    'rows',coalesce((select jsonb_agg(jsonb_build_object(
      'document_id',x.id,'document_type',x.document_type,'document_label',s.label,
      'document_number',x.document_number,'serial_number',x.serial_number,'period_key',x.period_key,
      'issue_date',x.issue_date,'entity_key',x.entity_key,'reference_label',x.reference_label,
      'description',x.description,'metadata',x.metadata,'status',x.status,'created_at',x.created_at,
      'voided_at',x.voided_at,'void_reason',x.void_reason) order by x.issue_date desc,x.created_at desc)
      from (select d.* from private.document_numbers d
        where p_document_type is null or d.document_type=p_document_type
        order by d.issue_date desc,d.created_at desc limit v_limit) x
      join private.document_number_settings s on s.document_type=x.document_type),'[]'::jsonb)
  ) into v_result;
  return v_result;
end
$$;
revoke all on function public.get_management_document_number_overview(text,integer) from public,anon;
grant execute on function public.get_management_document_number_overview(text,integer) to authenticated;

create or replace function public.issue_management_document_number(
  p_document_type text,p_issue_date date,p_reference_label text,p_description text default null
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare v_actor uuid:=auth.uid();v_doc uuid;v_number text;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;
  if p_document_type='honor_slip' then raise exception 'honor_slip_number_is_automatic'; end if;
  if nullif(btrim(coalesce(p_reference_label,'')),'') is null then raise exception 'reference_label_required'; end if;
  select x.document_id,x.document_number into v_doc,v_number
  from private.issue_document_number(
    p_document_type,coalesce(p_issue_date,(current_timestamp at time zone 'Asia/Jakarta')::date),
    null,p_reference_label,p_description,'{}'::jsonb,v_actor
  ) x;
  insert into public.admin_audit_logs(actor_id,action,details)
  values(v_actor,'issue_document_number',jsonb_build_object(
    'document_id',v_doc,'document_type',p_document_type,'document_number',v_number
  ));
  return jsonb_build_object('document_id',v_doc,'document_number',v_number);
end
$$;
revoke all on function public.issue_management_document_number(text,date,text,text) from public,anon;
grant execute on function public.issue_management_document_number(text,date,text,text) to authenticated;

create or replace function public.save_management_document_number_setting(
  p_document_type text,p_label text,p_code text,p_reset_period text,p_padding integer,p_is_active boolean
)
returns void language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare v_actor uuid:=auth.uid();v_reset text:=lower(btrim(coalesce(p_reset_period,'')));v_code text:=upper(btrim(coalesce(p_code,'')));
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;
  if p_document_type is null or p_document_type !~ '^[a-z][a-z0-9_]{1,50}$' then raise exception 'invalid_document_type'; end if;
  if nullif(btrim(coalesce(p_label,'')),'') is null then raise exception 'document_label_required'; end if;
  if v_code !~ '^[A-Z0-9]{1,12}$' then raise exception 'invalid_document_code'; end if;
  if v_reset not in('monthly','yearly','never') then raise exception 'invalid_reset_period'; end if;
  if p_padding is null or p_padding not between 2 and 8 then raise exception 'invalid_padding'; end if;
  insert into private.document_number_settings(document_type,label,code,reset_period,padding,is_active,updated_by,updated_at)
  values(p_document_type,btrim(p_label),v_code,v_reset,p_padding,coalesce(p_is_active,true),v_actor,now())
  on conflict(document_type) do update set
    label=excluded.label,code=excluded.code,reset_period=excluded.reset_period,padding=excluded.padding,
    is_active=excluded.is_active,updated_by=v_actor,updated_at=now();
end
$$;
revoke all on function public.save_management_document_number_setting(text,text,text,text,integer,boolean) from public,anon;
grant execute on function public.save_management_document_number_setting(text,text,text,text,integer,boolean) to authenticated;

create or replace function public.void_management_document_number(p_document_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare v_actor uuid:=auth.uid();v_type text;v_number text;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;
  if nullif(btrim(coalesce(p_reason,'')),'') is null then raise exception 'void_reason_required'; end if;
  select document_type,document_number into v_type,v_number
  from private.document_numbers where id=p_document_id for update;
  if v_type is null then raise exception 'document_number_not_found'; end if;
  if v_type='honor_slip' then raise exception 'honor_slip_number_cannot_be_voided_here'; end if;
  update private.document_numbers
  set status='void',voided_by=v_actor,voided_at=now(),void_reason=btrim(p_reason)
  where id=p_document_id and status<>'void';
end
$$;
revoke all on function public.void_management_document_number(uuid,text) from public,anon;
grant execute on function public.void_management_document_number(uuid,text) to authenticated;
