create or replace function public.get_class_teaching_reports_v2(p_class_id uuid)
returns table (
  report_id uuid,
  class_id uuid,
  teacher_id uuid,
  teacher_name text,
  report_date date,
  starts_at time without time zone,
  ends_at time without time zone,
  material_summary text,
  assignment_summary text,
  next_plan text,
  evaluation_notes text,
  review_status text,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=pg_catalog,public,private
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.classroom_is_management() then raise exception 'management_access_required'; end if;
  if not exists(select 1 from public.classes where id=p_class_id) then
    raise exception 'class_not_found';
  end if;

  return query
  select
    r.id,r.class_id,r.teacher_id,r.teacher_name_snapshot,r.report_date,
    r.starts_at,r.ends_at,r.material_summary,r.assignment_summary,r.next_plan,
    r.evaluation_notes,r.review_status,r.review_note,r.reviewed_at,r.created_at,r.updated_at
  from public.teaching_reports r
  where r.class_id=p_class_id
  order by r.report_date desc,r.starts_at desc,r.created_at desc;
end
$$;

revoke all on function public.get_class_teaching_reports_v2(uuid) from public,anon;
grant execute on function public.get_class_teaching_reports_v2(uuid) to authenticated;
