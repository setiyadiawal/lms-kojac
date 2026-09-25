-- KOJAC Teacher Monthly Report V1
-- Production migration version is already applied.
-- This file is kept in source control to synchronize local migration history.

insert into private.document_number_settings(document_type,label,code,reset_period,padding)
values ('teacher_monthly_report','Laporan Bulanan Pengajar','LPG','monthly',4)
on conflict(document_type) do nothing;

create table if not exists private.teacher_monthly_reports (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft',
  report_number text null unique,
  report_document_id uuid null references private.document_numbers(id) on delete restrict,
  management_notes text null,
  snapshot jsonb not null default '{}'::jsonb,
  generated_by uuid null references auth.users(id) on delete set null,
  generated_at timestamptz not null default now(),
  finalized_by uuid null references auth.users(id) on delete set null,
  finalized_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(period_end>=period_start),
  check(status in('draft','finalized')),
  check(management_notes is null or char_length(management_notes)<=10000),
  unique(teacher_id,period_start,period_end)
);
create index if not exists teacher_monthly_reports_period_idx
  on private.teacher_monthly_reports(period_start desc,teacher_id);
alter table private.teacher_monthly_reports enable row level security;
revoke all on table private.teacher_monthly_reports from public,anon,authenticated;

-- NOTE:
-- RPC definitions are present in production migration teacher_monthly_report_v1.
-- Keep this local migration file aligned with production history.
