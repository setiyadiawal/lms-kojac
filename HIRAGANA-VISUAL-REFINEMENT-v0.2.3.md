# KOJAC LMS — Hiragana Visual Refinement v0.2.3

Update ini menyesuaikan modul Hiragana dengan referensi worksheet tulisan tangan yang diberikan pengguna.

## Perubahan

1. **Gaya huruf lebih seperti tulisan tangan**
   - Prioritas font Windows/Jepang: `UD Digi Kyokasho`, `Yu Kyokasho`.
   - Fallback tetap tersedia bila font tersebut tidak terpasang.
   - Dipakai konsisten pada daftar, detail, Flashcard, dan Quiz.

2. **Susunan daftar mengikuti gojūon**
   - Hiragana dasar: 5 kolom (a/i/u/e/o) dengan ruang kosong pada baris Y dan W seperti chart pembelajaran.
   - Dakuten dan Handakuten: 5 kolom per kelompok.
   - Yōon: 3 kolom (ゃ/ゅ/ょ) per kelompok.
   - Semua kartu dibuat persegi dengan ukuran konsisten.

3. **Kotak urutan goresan seragam**
   - Satu kotak 1:1 untuk Hiragana dasar, Dakuten, Handakuten, dan Yōon.
   - Jumlah goresan tetap ditampilkan.
   - Nomor goresan dan arah awal goresan ditampilkan lebih mirip worksheet.

4. **Animasi loop otomatis**
   - Setelah stroke terakhir selesai, animasi berhenti sejenak lalu mengulang dari stroke pertama.
   - Tombol `Ulangi` tetap tersedia untuk replay manual.

5. **Yōon sebagai satu kesatuan**
   - Contoh `きゃ` tidak lagi ditampilkan sebagai dua panel.
   - `き` dan `ゃ` digabung ke satu kanvas.
   - Huruf kecil ditempatkan di kanan-bawah.
   - Penomoran stroke berlanjut dari karakter pertama ke karakter kedua.
   - Stroke count adalah total rangkaian.

## Database

Tidak ada migration baru untuk v0.2.3. Jika hotfix progress belum pernah dipasang, tetap jalankan:

`supabase/migrations/003_fix_hiragana_review_rpc.sql`

## Instalasi patch

1. Stop Vite (`Ctrl + C`).
2. Copy isi ZIP patch ke root project KOJAC dan pilih Replace.
3. Tidak perlu `npm install` karena dependency tidak berubah.
4. Jalankan kembali `npm run dev`.
5. Uji minimal: `あ`, `き`, `が`, `ぱ`, `きゃ`, `ぎゅ`, `ぴょ`.
