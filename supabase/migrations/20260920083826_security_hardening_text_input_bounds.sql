-- KOJAC LMS v1.3 — Security Hardening Phase 3
-- Production migration version: 20260920083826
-- Behavior-preserving upper bounds for text identifiers/content.

alter table public.programs
  add constraint programs_code_length_check
    check (length(code) between 1 and 64),
  add constraint programs_name_length_check
    check (length(name) between 1 and 160),
  add constraint programs_description_length_check
    check (description is null or length(description) <= 4000);

alter table public.classes
  add constraint classes_code_length_check
    check (length(code) between 1 and 64),
  add constraint classes_name_length_check
    check (length(name) between 1 and 160),
  add constraint classes_description_length_check
    check (description is null or length(description) <= 4000);

alter table public.reading_progress
  add constraint reading_progress_reading_id_length_check
    check (length(reading_id) <= 128),
  add constraint reading_progress_title_length_check
    check (reading_title is null or length(reading_title) <= 500),
  add constraint reading_progress_session_id_length_check
    check (length(last_session_id) <= 128);

alter table public.listening_progress
  add constraint listening_progress_listening_id_length_check
    check (length(listening_id) <= 128),
  add constraint listening_progress_session_id_length_check
    check (length(last_session_id) <= 128);
