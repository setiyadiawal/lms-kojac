-- KOJAC Official Documents Reactivation V1.0.1
-- NEW migration. Do not replay older migrations.
-- Reactivates receipt + teacher_monthly_report as official numbered documents.
-- Preserves legacy rows and existing numbering formats.

update private.document_number_settings
set is_active = true
where document_type in ('receipt','teacher_monthly_report');

create or replace function private.create_teacher_payroll_payment_record(
  p_payroll_id uuid,
  p_payment_date date,
  p_payment_method text,
  p_payment_reference text default null,
  p_notes text default null,
  p_actor uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid:=coalesce(p_actor,auth.uid());
  v_teacher uuid;
  v_teacher_name text;
  v_status text;
  v_amount bigint;
  v_profile jsonb;
  v_period_start date;
  v_period_end date;
  v_existing private.teacher_payroll_payment_records%rowtype;
  v_payment_method text:=coalesce(nullif(btrim(coalesce(p_payment_method,'')),''),'Transfer');
  v_date date:=coalesce(p_payment_date,(current_timestamp at time zone 'Asia/Jakarta')::date);
  v_bank_name text;
  v_bank_account_name text;
  v_bank_account_number text;
  v_id uuid;
  v_doc uuid;
  v_receipt text;
begin
  select py.teacher_id,py.status,py.net_amount,py.profile_snapshot,py.period_start,py.period_end,
         coalesce(nullif(btrim(pr.full_name),''),nullif(btrim(pr.nickname),''),'Pengajar KOJAC')
  into v_teacher,v_status,v_amount,v_profile,v_period_start,v_period_end,v_teacher_name
  from private.teacher_payrolls py
  left join public.profiles pr on pr.user_id=py.teacher_id
  where py.id=p_payroll_id
  for update of py;

  if v_teacher is null then raise exception 'payroll_not_found'; end if;

  select * into v_existing
  from private.teacher_payroll_payment_records
  where payroll_id=p_payroll_id;

  if found then
    if v_existing.receipt_number is null then
      select x.document_id,x.document_number into v_doc,v_receipt
      from private.issue_document_number(
        'receipt',
        v_existing.payment_date,
        'teacher_payroll:' || p_payroll_id::text,
        'Kwitansi Honor ' || v_teacher_name,
        'Honor periode ' || v_period_start::text || ' s.d. ' || v_period_end::text,
        jsonb_build_object(
          'payroll_id',p_payroll_id,
          'teacher_id',v_teacher,
          'payment_id',v_existing.id,
          'payment_date',v_existing.payment_date,
          'amount',v_existing.amount
        ),
        v_actor
      ) x;

      update private.teacher_payroll_payment_records
      set receipt_number=v_receipt,receipt_document_id=v_doc
      where id=v_existing.id;
    else
      v_receipt:=v_existing.receipt_number;
    end if;

    return jsonb_build_object(
      'payment_id',v_existing.id,
      'receipt_number',v_receipt,
      'already_recorded',true
    );
  end if;

  if v_status not in('finalized','paid') then raise exception 'payroll_not_finalized'; end if;
  if v_amount<=0 then raise exception 'invalid_payment_amount'; end if;

  v_bank_name:=nullif(btrim(coalesce(v_profile->>'bank_name','')),'');
  v_bank_account_name:=nullif(btrim(coalesce(v_profile->>'bank_account_name','')),'');
  v_bank_account_number:=nullif(btrim(coalesce(v_profile->>'bank_account_number','')),'');

  insert into private.teacher_payroll_payment_records(
    payroll_id,teacher_id,payment_date,amount,payment_method,
    bank_name,bank_account_name,bank_account_number,
    payment_reference,notes,receipt_number,receipt_document_id,created_by
  ) values(
    p_payroll_id,v_teacher,v_date,v_amount,v_payment_method,
    v_bank_name,v_bank_account_name,v_bank_account_number,
    nullif(btrim(coalesce(p_payment_reference,'')),''),
    nullif(btrim(coalesce(p_notes,'')),''),
    null,null,v_actor
  ) returning id into v_id;

  select x.document_id,x.document_number into v_doc,v_receipt
  from private.issue_document_number(
    'receipt',
    v_date,
    'teacher_payroll:' || p_payroll_id::text,
    'Kwitansi Honor ' || v_teacher_name,
    'Honor periode ' || v_period_start::text || ' s.d. ' || v_period_end::text,
    jsonb_build_object(
      'payroll_id',p_payroll_id,
      'teacher_id',v_teacher,
      'payment_id',v_id,
      'payment_date',v_date,
      'amount',v_amount
    ),
    v_actor
  ) x;

  update private.teacher_payroll_payment_records
  set receipt_number=v_receipt,receipt_document_id=v_doc
  where id=v_id;

  update private.teacher_payrolls
  set status='paid',
      paid_by=coalesce(v_actor,paid_by),
      paid_at=coalesce(paid_at,now()),
      paid_on=v_date,
      payment_note=coalesce(
        nullif(btrim(coalesce(p_payment_reference,'')),''),
        nullif(btrim(coalesce(p_notes,'')),''),
        payment_note
      ),
      updated_at=now()
  where id=p_payroll_id;

  return jsonb_build_object(
    'payment_id',v_id,
    'receipt_number',v_receipt,
    'already_recorded',false
  );
end
$function$;

create or replace function public.finalize_management_teacher_monthly_report(p_monthly_report_id uuid)
returns text
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid:=auth.uid();
  v_teacher uuid;
  v_teacher_name text;
  v_month date;
  v_end date;
  v_status text;
  v_existing_number text;
  v_existing_doc uuid;
  v_finalized_at timestamptz;
  v_snapshot jsonb;
  v_doc uuid;
  v_number text;
  v_issue_date date;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;

  select mr.teacher_id,mr.period_start,mr.period_end,mr.status,mr.report_number,mr.report_document_id,mr.finalized_at,
         coalesce(nullif(btrim(pr.full_name),''),nullif(btrim(pr.nickname),''),'Pengajar KOJAC')
  into v_teacher,v_month,v_end,v_status,v_existing_number,v_existing_doc,v_finalized_at,v_teacher_name
  from private.teacher_monthly_reports mr
  left join public.profiles pr on pr.user_id=mr.teacher_id
  where mr.id=p_monthly_report_id
  for update of mr;

  if v_teacher is null then raise exception 'monthly_report_not_found'; end if;
  if v_status='finalized' and v_existing_number is not null then return v_existing_number; end if;

  if v_status<>'finalized' then
    v_snapshot:=public.get_management_teacher_monthly_report(v_teacher,v_month);
  end if;

  v_issue_date:=coalesce((v_finalized_at at time zone 'Asia/Jakarta')::date,(current_timestamp at time zone 'Asia/Jakarta')::date);

  select x.document_id,x.document_number into v_doc,v_number
  from private.issue_document_number(
    'teacher_monthly_report',
    v_issue_date,
    p_monthly_report_id::text,
    'Laporan Bulanan Pengajar ' || v_teacher_name,
    'Periode ' || v_month::text || ' s.d. ' || v_end::text,
    jsonb_build_object(
      'monthly_report_id',p_monthly_report_id,
      'teacher_id',v_teacher,
      'period_start',v_month,
      'period_end',v_end
    ),
    v_actor
  ) x;

  update private.teacher_monthly_reports
  set status='finalized',
      snapshot=case when v_status='finalized' then snapshot else v_snapshot end,
      report_number=v_number,
      report_document_id=v_doc,
      finalized_by=coalesce(finalized_by,v_actor),
      finalized_at=coalesce(finalized_at,now()),
      updated_at=now()
  where id=p_monthly_report_id;

  insert into public.admin_audit_logs(actor_id,action,target_user_id,details)
  values(v_actor,'finalize_teacher_monthly_report',v_teacher,jsonb_build_object(
    'monthly_report_id',p_monthly_report_id,
    'official_document_number',true,
    'report_number',v_number
  ));

  return v_number;
end
$function$;

-- Safe repair for any records created while these document types were inactive.
do $block$
declare r record; v_doc uuid; v_number text; v_name text;
begin
  for r in
    select pr.id payment_id,pr.payroll_id,pr.teacher_id,pr.payment_date,pr.amount,
           py.period_start,py.period_end
    from private.teacher_payroll_payment_records pr
    join private.teacher_payrolls py on py.id=pr.payroll_id
    where pr.receipt_number is null
  loop
    select coalesce(nullif(btrim(p.full_name),''),nullif(btrim(p.nickname),''),'Pengajar KOJAC')
      into v_name from public.profiles p where p.user_id=r.teacher_id;
    v_name:=coalesce(v_name,'Pengajar KOJAC');

    select x.document_id,x.document_number into v_doc,v_number
    from private.issue_document_number(
      'receipt',r.payment_date,'teacher_payroll:'||r.payroll_id::text,
      'Kwitansi Honor '||v_name,
      'Honor periode '||r.period_start::text||' s.d. '||r.period_end::text,
      jsonb_build_object('payroll_id',r.payroll_id,'teacher_id',r.teacher_id,'payment_id',r.payment_id,'payment_date',r.payment_date,'amount',r.amount),
      null
    ) x;

    update private.teacher_payroll_payment_records
    set receipt_number=v_number,receipt_document_id=v_doc
    where id=r.payment_id and receipt_number is null;
  end loop;
end
$block$;

do $block$
declare r record; v_doc uuid; v_number text; v_name text; v_issue_date date;
begin
  for r in
    select id,teacher_id,period_start,period_end,finalized_at
    from private.teacher_monthly_reports
    where status='finalized' and report_number is null
  loop
    select coalesce(nullif(btrim(p.full_name),''),nullif(btrim(p.nickname),''),'Pengajar KOJAC')
      into v_name from public.profiles p where p.user_id=r.teacher_id;
    v_name:=coalesce(v_name,'Pengajar KOJAC');
    v_issue_date:=coalesce((r.finalized_at at time zone 'Asia/Jakarta')::date,(current_timestamp at time zone 'Asia/Jakarta')::date);

    select x.document_id,x.document_number into v_doc,v_number
    from private.issue_document_number(
      'teacher_monthly_report',v_issue_date,r.id::text,
      'Laporan Bulanan Pengajar '||v_name,
      'Periode '||r.period_start::text||' s.d. '||r.period_end::text,
      jsonb_build_object('monthly_report_id',r.id,'teacher_id',r.teacher_id,'period_start',r.period_start,'period_end',r.period_end),
      null
    ) x;

    update private.teacher_monthly_reports
    set report_number=v_number,report_document_id=v_doc,updated_at=now()
    where id=r.id and report_number is null;
  end loop;
end
$block$;
