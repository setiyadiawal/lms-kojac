# KOJAC LMS — Hiragana v0.2.5 stability hotfix

Perbaikan yang dilakukan:

1. **Stroke tidak lagi berubah hitam**
   - Renderer SVG diperbaiki, bukan hanya CSS.
   - Siluet dasar dibuat abu-abu muda dan stroke animasi dipaksa abu-abu `#858183` melalui inline SVG style + CSS scoped.
   - Konflik style lama tidak bisa lagi mengubah stroke menjadi hitam.

2. **Panel urutan goresan responsif**
   - Desktop, tablet, mobile, dan layar sangat sempit memiliki layout berbeda.
   - Badge Loop Otomatis dan tombol Ulangi tidak overflow.
   - Canvas selalu 1:1 dan mengecil mengikuti lebar kartu.

3. **Chart Hiragana mengikuti lebar layar**
   - Mobile tidak lagi dipaksa memiliki `min-width: 410px`.
   - Sel gojūon mengecil secara proporsional tanpa membuat halaman melebar.

4. **Flashcard tidak reset setelah menyimpan progress**
   - Deck sekarang hanya di-reset jika kelompok/filter karakter berubah.
   - Update mastery dari Supabase tidak lagi mengembalikan flashcard ke kartu pertama.

5. **Quiz tidak restart setiap jawaban**
   - Sebelumnya setiap save progress mengubah `items`, lalu `useEffect([items])` memulai quiz dari awal.
   - Sekarang quiz hanya dibuat ulang ketika set/filter karakter berubah.

6. **RPC review lebih aman terhadap request bersamaan**
   - Migration `004_hiragana_review_atomic.sql` memakai `INSERT ... ON CONFLICT DO NOTHING` lalu row lock.
   - Dua review simultan tidak lagi berisiko gagal pada insert pertama.

7. **Stroke data lebih tahan gangguan CDN/cache**
   - Cache version dinaikkan agar data lama yang mungkin rusak tidak dipakai.
   - Ada fallback CDN kedua.
   - Marker/panah dibatasi tetap berada di dalam canvas.

8. **Yōon tetap satu unit**
   - Satu canvas, urutan nomor berlanjut, ukuran huruf kecil konsisten.

File utama yang berubah:
- `src/features/hiragana/HiraganaStrokeOrder.tsx`
- `src/features/hiragana/hiragana.css` (baru)
- `src/features/hiragana/useHiragana.ts`
- `src/pages/HiraganaPage.tsx`
- `supabase/migrations/004_hiragana_review_atomic.sql`
- `package.json`
