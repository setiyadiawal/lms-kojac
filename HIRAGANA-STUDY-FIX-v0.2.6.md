# KOJAC LMS Hiragana v0.2.6 — Study Mode Repair

Audit ulang menu **Pelajari** memperbaiki akar masalah, bukan hanya CSS.

## Perbaikan
- warna stroke selesai dikembalikan ke maroon KOJAC (`var(--maroon)`), bukan abu-abu/hitam
- guide stroke yang belum digambar dibuat sangat samar agar tidak terlihat sebagai stroke final
- ukuran arrowhead SVG diperbaiki; sebelumnya marker memakai skala yang membuat segitiga panah sangat besar
- posisi angka/panah dihitung ulang agar tidak menutupi awal goresan
- stroke box konsisten dan responsif di desktop/tablet/mobile
- layout detail card dipaksa `display:block` agar tidak bentrok dengan media query lama
- chart gojūon menjadi self-contained dan tidak memaksa horizontal overflow
- aturan CSS eksperimen v0.2.2–v0.2.4 dibuang dari `src/styles.css` agar tidak saling menimpa
- Yōon tetap satu canvas, satu hitungan goresan, dan nomor berlanjut
- validasi cache stroke diperketat dan cache dinaikkan ke v3
- ukuran karakter/detail/chart dituning ulang untuk layar kecil

Tidak ada migration database baru pada patch ini.
