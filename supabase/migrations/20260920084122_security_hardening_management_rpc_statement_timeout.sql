-- KOJAC LMS v1.3 — Security Hardening Phase 3
-- Production migration version: 20260920084122
-- Protect expensive management/report RPCs from runaway requests.
-- Normal requests are expected to finish far below this 15-second ceiling.

alter function public.get_management_class_recap(text, uuid, uuid, uuid, text, text)
  set statement_timeout to '15s';

alter function public.get_management_dashboard_overview()
  set statement_timeout to '15s';

alter function public.get_management_feedback(text, text, text, integer, integer)
  set statement_timeout to '15s';

alter function public.get_management_student_detail(uuid)
  set statement_timeout to '15s';

alter function public.get_management_students(text, uuid, uuid, uuid, text, text, integer, integer)
  set statement_timeout to '15s';

alter function public.get_management_teacher_detail(uuid)
  set statement_timeout to '15s';

alter function public.get_management_teachers(text, text, text, uuid, uuid, text, text, integer, integer)
  set statement_timeout to '15s';

alter function public.get_management_teaching_report_detail(uuid)
  set statement_timeout to '15s';

alter function public.get_management_teaching_reports(text, uuid, uuid, uuid, text, text, integer, integer)
  set statement_timeout to '15s';
