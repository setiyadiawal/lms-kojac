-- KOJAC LMS - Student Feedback v1 (incremental)
-- Siswa authenticated dapat mengirim feedback miliknya sendiri. Tidak ada ticketing/admin inbox pada fase ini.

begin;

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in ('kritik','saran','bug','materi','fitur','lainnya')),
  title text,
  message text not null,
  status text not null default 'baru' check (status in ('baru','dibaca','diproses','selesai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(btrim(message)) between 10 and 4000),
  check (title is null or char_length(btrim(title)) between 1 and 120)
);

-- Explicit Data API exposure: authenticated student hanya boleh INSERT.
revoke all on public.user_feedback from public, anon, authenticated;
grant insert (category, title, message) on public.user_feedback to authenticated;

alter table public.user_feedback enable row level security;

drop policy if exists user_feedback_insert_own on public.user_feedback;
create policy user_feedback_insert_own
on public.user_feedback
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and status = 'baru'
);

create index if not exists idx_user_feedback_user_created
  on public.user_feedback(user_id, created_at desc);

create index if not exists idx_user_feedback_status_created
  on public.user_feedback(status, created_at desc);

commit;
