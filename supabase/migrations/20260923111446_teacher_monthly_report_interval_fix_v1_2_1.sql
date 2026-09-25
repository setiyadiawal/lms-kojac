-- KOJAC Teacher Monthly Report V1.2.1
-- Production migration already applied:
-- teacher_monthly_report_interval_fix_v1_2_1
-- This local migration file keeps repository history synchronized.

create or replace function public.save_management_teacher_monthly_report(
  p_teacher_id uuid,
  p_month date,
  p_management_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_actor uuid:=auth.uid();
  v_month date:=date_trunc('month',p_month)::date;
  v_end date:=(v_month + interval '1 month' - interval '1 day')::date;
  v_snapshot jsonb;
  v_id uuid;
  v_status text;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if not private.teacher_payroll_is_management() then raise exception 'management_access_required'; end if;

  select status,id into v_status,v_id
  from private.teacher_monthly_reports
  where teacher_id=p_teacher_id and period_start=v_month and period_end=v_end
  for update;

  if v_status='finalized' then raise exception 'monthly_report_locked'; end if;

  v_snapshot:=public.get_management_teacher_monthly_report(p_teacher_id,v_month);

  if v_id is null then
    insert into private.teacher_monthly_reports(
      teacher_id,period_start,period_end,status,management_notes,snapshot,generated_by,generated_at
    ) values(
      p_teacher_id,v_month,v_end,'draft',
      nullif(btrim(coalesce(p_management_notes,'')),''),
      v_snapshot,v_actor,now()
    )
    returning id into v_id;
  else
    update private.teacher_monthly_reports
    set management_notes=nullif(btrim(coalesce(p_management_notes,'')),''),
        snapshot=v_snapshot,generated_by=v_actor,generated_at=now(),updated_at=now()
    where id=v_id;
  end if;

  insert into public.admin_audit_logs(actor_id,action,target_user_id,details)
  values(v_actor,'save_teacher_monthly_report',p_teacher_id,jsonb_build_object(
    'monthly_report_id',v_id,'period_start',v_month,'period_end',v_end
  ));

  return v_id;
end
$$;

revoke all on function public.save_management_teacher_monthly_report(uuid,date,text) from public,anon;
grant execute on function public.save_management_teacher_monthly_report(uuid,date,text) to authenticated;
