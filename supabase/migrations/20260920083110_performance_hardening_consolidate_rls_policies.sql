-- KOJAC LMS v1.3 — Safe Performance Hardening
-- Production migration version: 20260920083110
-- Remove duplicate permissive SELECT policy evaluation while preserving
-- the same read/write authorization semantics.

-- class_enrollments
drop policy if exists enrollments_manage_staff on public.class_enrollments;

create policy enrollments_manage_staff_insert
on public.class_enrollments
for insert to authenticated
with check (
  (current_app_role())::text = any (
    array['administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

create policy enrollments_manage_staff_update
on public.class_enrollments
for update to authenticated
using (
  (current_app_role())::text = any (
    array['administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
)
with check (
  (current_app_role())::text = any (
    array['administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

create policy enrollments_manage_staff_delete
on public.class_enrollments
for delete to authenticated
using (
  (current_app_role())::text = any (
    array['administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

-- classes
drop policy if exists classes_manage_admin on public.classes;

create policy classes_manage_admin_insert
on public.classes
for insert to authenticated
with check (
  (current_app_role())::text = any (
    array['administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

create policy classes_manage_admin_update
on public.classes
for update to authenticated
using (
  (current_app_role())::text = any (
    array['administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
)
with check (
  (current_app_role())::text = any (
    array['administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

create policy classes_manage_admin_delete
on public.classes
for delete to authenticated
using (
  (current_app_role())::text = any (
    array['administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

-- course_modules
drop policy if exists modules_manage_staff on public.course_modules;

create policy modules_manage_staff_insert
on public.course_modules
for insert to authenticated
with check (
  (current_app_role())::text = any (
    array['pengajar'::text,'administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

create policy modules_manage_staff_update
on public.course_modules
for update to authenticated
using (
  (current_app_role())::text = any (
    array['pengajar'::text,'administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
)
with check (
  (current_app_role())::text = any (
    array['pengajar'::text,'administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

create policy modules_manage_staff_delete
on public.course_modules
for delete to authenticated
using (
  (current_app_role())::text = any (
    array['pengajar'::text,'administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

-- courses
drop policy if exists courses_manage_staff on public.courses;

create policy courses_manage_staff_insert
on public.courses
for insert to authenticated
with check (
  (current_app_role())::text = any (
    array['pengajar'::text,'administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

create policy courses_manage_staff_update
on public.courses
for update to authenticated
using (
  (current_app_role())::text = any (
    array['pengajar'::text,'administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
)
with check (
  (current_app_role())::text = any (
    array['pengajar'::text,'administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

create policy courses_manage_staff_delete
on public.courses
for delete to authenticated
using (
  (current_app_role())::text = any (
    array['pengajar'::text,'administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

-- learning_items
drop policy if exists items_manage_staff on public.learning_items;

create policy items_manage_staff_insert
on public.learning_items
for insert to authenticated
with check (
  (current_app_role())::text = any (
    array['pengajar'::text,'administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

create policy items_manage_staff_update
on public.learning_items
for update to authenticated
using (
  (current_app_role())::text = any (
    array['pengajar'::text,'administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
)
with check (
  (current_app_role())::text = any (
    array['pengajar'::text,'administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

create policy items_manage_staff_delete
on public.learning_items
for delete to authenticated
using (
  (current_app_role())::text = any (
    array['pengajar'::text,'administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

-- lessons
drop policy if exists lessons_manage_staff on public.lessons;

create policy lessons_manage_staff_insert
on public.lessons
for insert to authenticated
with check (
  (current_app_role())::text = any (
    array['pengajar'::text,'administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

create policy lessons_manage_staff_update
on public.lessons
for update to authenticated
using (
  (current_app_role())::text = any (
    array['pengajar'::text,'administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
)
with check (
  (current_app_role())::text = any (
    array['pengajar'::text,'administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

create policy lessons_manage_staff_delete
on public.lessons
for delete to authenticated
using (
  (current_app_role())::text = any (
    array['pengajar'::text,'administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

-- programs
drop policy if exists programs_manage on public.programs;

alter policy programs_read_active
on public.programs
using (
  is_active
  or (current_app_role())::text = any (
    array['administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

create policy programs_manage_insert
on public.programs
for insert to authenticated
with check (
  (current_app_role())::text = any (
    array['administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

create policy programs_manage_update
on public.programs
for update to authenticated
using (
  (current_app_role())::text = any (
    array['administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
)
with check (
  (current_app_role())::text = any (
    array['administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

create policy programs_manage_delete
on public.programs
for delete to authenticated
using (
  (current_app_role())::text = any (
    array['administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
);

-- lesson_progress
drop policy if exists progress_own_rows on public.lesson_progress;

alter policy progress_staff_read
on public.lesson_progress
using (
  user_id = (select auth.uid())
  or (current_app_role())::text = any (
    array['administrator'::text,'manager'::text,'co_founder'::text,'founder'::text]
  )
  or private.teacher_can_view_user(user_id)
);

create policy progress_own_insert
on public.lesson_progress
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy progress_own_update
on public.lesson_progress
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy progress_own_delete
on public.lesson_progress
for delete to authenticated
using (user_id = (select auth.uid()));
