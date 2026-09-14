-- AUTH-ADMIN-DELETE-1
-- Preserve nullable historical references when an Auth user is hard-deleted.
-- User-owned rows keep their existing ON DELETE CASCADE behavior.

alter table public.admin_audit_logs
  drop constraint admin_audit_logs_actor_id_fkey,
  add constraint admin_audit_logs_actor_id_fkey
    foreign key (actor_id) references auth.users(id) on delete set null;

alter table public.admin_audit_logs
  drop constraint admin_audit_logs_target_user_id_fkey,
  add constraint admin_audit_logs_target_user_id_fkey
    foreign key (target_user_id) references auth.users(id) on delete set null;

alter table public.profiles
  drop constraint profiles_approved_by_fkey,
  add constraint profiles_approved_by_fkey
    foreign key (approved_by) references auth.users(id) on delete set null;

alter table public.user_roles
  drop constraint user_roles_updated_by_fkey,
  add constraint user_roles_updated_by_fkey
    foreign key (updated_by) references auth.users(id) on delete set null;

alter table public.classes
  drop constraint classes_teacher_id_fkey,
  add constraint classes_teacher_id_fkey
    foreign key (teacher_id) references auth.users(id) on delete set null;

alter table public.courses
  drop constraint courses_created_by_fkey,
  add constraint courses_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;
