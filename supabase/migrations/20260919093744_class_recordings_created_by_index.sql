-- KOJAC LMS v1.2 — Class Recordings created_by index
-- Production migration version: 20260919093744
-- Already applied to production.

create index class_recordings_created_by_idx
on private.class_recordings(created_by);
