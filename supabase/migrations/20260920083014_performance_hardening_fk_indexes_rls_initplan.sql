-- KOJAC LMS v1.3 — Safe Performance Hardening
-- Production migration version: 20260920083014
-- Behavior-preserving indexes and RLS auth.uid() init-plan optimization.

create index if not exists admin_audit_logs_actor_id_idx
  on public.admin_audit_logs(actor_id);

create index if not exists admin_audit_logs_target_user_id_idx
  on public.admin_audit_logs(target_user_id);

create index if not exists class_teacher_assignments_assigned_by_idx
  on public.class_teacher_assignments(assigned_by);

create index if not exists courses_created_by_idx
  on public.courses(created_by);

create index if not exists lesson_progress_lesson_id_idx
  on public.lesson_progress(lesson_id);

create index if not exists profiles_approved_by_idx
  on public.profiles(approved_by);

create index if not exists review_progress_item_id_idx
  on public.review_progress(item_id);

create index if not exists user_roles_updated_by_idx
  on public.user_roles(updated_by);

alter policy profiles_update_self
  on public.profiles
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy progress_own_rows
  on public.lesson_progress
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy review_own_rows
  on public.review_progress
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy enrollments_read_self_or_staff
  on public.class_enrollments
  using (
    user_id = (select auth.uid())
    or (current_app_role())::text = any (
      array['administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
    )
    or is_class_teacher(class_id)
  );

alter policy classes_read_member_or_staff
  on public.classes
  using (
    is_class_teacher(id)
    or (current_app_role())::text = any (
      array['administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
    )
    or exists (
      select 1
      from public.class_enrollments e
      where e.class_id = classes.id
        and e.user_id = (select auth.uid())
    )
  );
