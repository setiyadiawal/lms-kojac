# Cara update Foundation v1.1 → Hiragana v0.2.0

1. Biarkan file `.env` milikmu tetap ada dan jangan dibagikan.
2. Hentikan Vite dengan `Ctrl + C`.
3. Salin/replace file update ke folder project KOJAC LMS.
4. Tidak perlu menjalankan migration 001 lagi.
5. Buka Supabase SQL Editor → **New query**.
6. Jalankan seluruh isi `supabase/migrations/002_hiragana_learning.sql`.
7. Verifikasi jumlah data:
   ```sql
   select count(*) from public.learning_items
   where item_type='hiragana' and is_published=true;
   ```
   Hasil yang diharapkan: **104**.
8. Jalankan kembali:
   ```bash
   npm run dev
   ```
9. Login sebagai siswa → **Belajar → Hiragana**.
10. Uji Pelajari, Flashcard, dan Quiz.

Tidak perlu membuat ulang akun Founder, approval, atau project Supabase.
