# KOJAC LMS v0.2.2 — Hiragana Stroke Order

Update ini menambahkan ke halaman **Belajar → Hiragana → Pelajari**:

- animasi urutan goresan untuk karakter yang dipilih;
- nomor urutan pada titik awal tiap goresan;
- jumlah goresan otomatis;
- tombol **Ulangi** untuk memutar ulang animasi;
- dukungan dakuten dan handakuten melalui karakter Unicode precomposed;
- dukungan yōon sebagai dua diagram komponen (contoh: き + ゃ) dengan total jumlah goresan;
- cache browser agar data goresan yang pernah dibuka tidak perlu diunduh ulang;
- atribusi sumber/lisensi data.

## Instalasi patch

1. Hentikan Vite (`Ctrl + C`).
2. Salin folder `src` dan file `THIRD_PARTY_NOTICES.md` dari patch ke root project KOJAC, lalu Replace.
3. Tidak ada migration Supabase baru untuk fitur ini.
4. Jalankan kembali `npm run dev`.
5. Buka **Belajar → Hiragana → Pelajari** dan klik karakter.

Catatan: pada pembukaan pertama suatu karakter, diagram diambil dari jsDelivr (`kana-svg-data@0.0.2`) lalu disimpan di cache browser. Karena itu koneksi internet dibutuhkan pada pembukaan pertama karakter yang belum pernah dicache.
