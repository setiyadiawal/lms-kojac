-- KOJAC LMS — Management Utility
-- Feedback Inbox: management-only read + status workflow.
-- Candidate only. DO NOT APPLY before review.
-- No new feedback table. No delete path. Existing user submission INSERT remains unchanged.

create or replace function public.get_management_feedback(
  p_status text default null,
  p_category text default null,
  p_search text default null,
  p_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := case when p_page_size in (25, 50, 100) then p_page_size else 25 end;
  v_offset integer;
  v_status text := nullif(lower(btrim(coalesce(p_status, ''))), '');
  v_category text := nullif(lower(btrim(coalesce(p_category, ''))), '');
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if not private.classroom_is_management() then
    raise exception 'management_access_required';
  end if;

  if v_status is not null and v_status not in ('baru', 'diproses', 'selesai') then
    raise exception 'invalid_feedback_status';
  end if;

  if v_category is not null and v_category not in ('kritik', 'saran', 'bug', 'materi', 'fitur', 'lainnya') then
    raise exception 'invalid_feedback_category';
  end if;

  v_offset := (v_page - 1) * v_page_size;

  with feedback_base as (
    select
      f.id,
      f.user_id,
      f.category,
      f.title,
      f.message,
      case when f.status = 'dibaca' then 'diproses' else f.status end as status,
      f.created_at,
      f.updated_at,
      coalesce(
        nullif(btrim(p.full_name), ''),
        nullif(btrim(p.nickname), ''),
        'Pengguna KOJAC'
      ) as sender_name
    from public.user_feedback f
    left join public.profiles p on p.user_id = f.user_id
  ),
  filtered_feedback as (
    select fb.*
    from feedback_base fb
    where (v_status is null or fb.status = v_status)
      and (v_category is null or fb.category = v_category)
      and (
        v_search is null
        or fb.sender_name ilike '%' || v_search || '%'
        or coalesce(fb.title, '') ilike '%' || v_search || '%'
        or fb.message ilike '%' || v_search || '%'
      )
  ),
  paged_feedback as (
    select ff.*
    from filtered_feedback ff
    order by ff.created_at desc, ff.id desc
    offset v_offset
    limit v_page_size
  ),
  row_payload as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'feedback_id', pf.id,
          'sender_name', pf.sender_name,
          'category', pf.category,
          'title', pf.title,
          'message', pf.message,
          'status', pf.status,
          'created_at', pf.created_at,
          'updated_at', pf.updated_at
        )
        order by pf.created_at desc, pf.id desc
      ),
      '[]'::jsonb
    ) as rows
    from paged_feedback pf
  ),
  summary_payload as (
    select jsonb_build_object(
      'total_feedback', count(*)::integer,
      'new_feedback', count(*) filter (where status = 'baru')::integer,
      'processing_feedback', count(*) filter (where status = 'diproses')::integer,
      'completed_feedback', count(*) filter (where status = 'selesai')::integer
    ) as summary
    from feedback_base
  ),
  pagination_payload as (
    select
      count(*)::integer as total_rows,
      case
        when count(*) = 0 then 0
        else ceil(count(*)::numeric / v_page_size)::integer
      end as total_pages
    from filtered_feedback
  )
  select jsonb_build_object(
    'summary', sp.summary,
    'rows', rp.rows,
    'pagination', jsonb_build_object(
      'page', v_page,
      'page_size', v_page_size,
      'total_rows', pp.total_rows,
      'total_pages', pp.total_pages
    )
  )
  into v_result
  from summary_payload sp
  cross join row_payload rp
  cross join pagination_payload pp;

  return v_result;
end
$$;

revoke all on function public.get_management_feedback(text, text, text, integer, integer) from public;
revoke all on function public.get_management_feedback(text, text, text, integer, integer) from anon;
grant execute on function public.get_management_feedback(text, text, text, integer, integer) to authenticated;

create or replace function public.update_feedback_status(
  p_feedback_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_old_status text;
  v_feedback_user_id uuid;
  v_updated_at timestamptz;
begin
  if v_actor is null then
    raise exception 'authentication_required';
  end if;

  if not private.classroom_is_management() then
    raise exception 'management_access_required';
  end if;

  if v_status not in ('baru', 'diproses', 'selesai') then
    raise exception 'invalid_feedback_status';
  end if;

  select f.status, f.user_id
  into v_old_status, v_feedback_user_id
  from public.user_feedback f
  where f.id = p_feedback_id
  for update;

  if not found then
    raise exception 'feedback_not_found';
  end if;

  if v_old_status is distinct from v_status then
    update public.user_feedback
    set status = v_status,
        updated_at = now()
    where id = p_feedback_id
    returning updated_at into v_updated_at;

    insert into public.admin_audit_logs(actor_id, action, target_user_id, details)
    values (
      v_actor,
      'update_feedback_status',
      v_feedback_user_id,
      jsonb_build_object(
        'feedback_id', p_feedback_id,
        'old_status', v_old_status,
        'new_status', v_status
      )
    );
  else
    select f.updated_at into v_updated_at
    from public.user_feedback f
    where f.id = p_feedback_id;
  end if;

  return jsonb_build_object(
    'feedback_id', p_feedback_id,
    'status', v_status,
    'updated_at', v_updated_at
  );
end
$$;

revoke all on function public.update_feedback_status(uuid, text) from public;
revoke all on function public.update_feedback_status(uuid, text) from anon;
grant execute on function public.update_feedback_status(uuid, text) to authenticated;
