# Dokumentasi Cawang v1

**Cawang** (dari *catat keuangan*) adalah aplikasi web pencatat keuangan pribadi untuk anak muda
Indonesia. Uang masuk, keluar, dan antar akun dicatat; dana untuk tagihan yang belum dibayar bisa
dikunci (Safe-Pay); dan budget dihitung per **Cycle**, yaitu periode yang dimulai di tanggal gajian,
bukan tanggal 1.

Aplikasinya berupa SPA React di atas Supabase (Auth + Postgres + RLS), bisa dipasang sebagai PWA, dan
tersedia dalam Bahasa Indonesia dan English.

## Isi dokumentasi

| Dokumen | Untuk siapa | Isi |
| --- | --- | --- |
| [Panduan pengguna](user-guide.md) | Pemakai aplikasi | Cara memakai setiap fitur, dari daftar sampai laporan |
| [Arsitektur](architecture.md) | Developer | Stack, struktur folder, alur data, routing, i18n, tema, PWA, privasi nominal |
| [Database](database.md) | Developer | Tabel, view saldo, aturan yang dijaga database, RPC, kode error |
| [Pengembangan](development.md) | Developer | Setup lokal, perintah, tes, konvensi kode dan desain, cara menambah fitur |

## Dokumen terkait

| Dokumen | Isi |
| --- | --- |
| [`../README.md`](../README.md) | Ringkasan proyek dan perintah |
| [`../supabase/README.md`](../supabase/README.md) | Setup Supabase langkah demi langkah |
| [`../DEPLOY.md`](../DEPLOY.md) | Deploy ke Vercel |
| [`../../docs/spec.md`](../../docs/spec.md) | Spesifikasi lengkap semua keputusan desain |
| [`../../GLOSSARY.md`](../../GLOSSARY.md) | Bahasa domain: Account, Safe-Pay, Cycle, Budget Status, dll. |
| [`../../docs/adr/`](../../docs/adr/) | Keputusan arsitektur (saldo diturunkan, Safe-Pay terpisah, Occurrence disimpan saat diputuskan) |

## Istilah singkat

Istilah ini dipakai apa adanya di aplikasi, kode, dan dokumen. Definisi lengkap ada di
[GLOSSARY.md](../../GLOSSARY.md).

| Istilah | Arti singkat |
| --- | --- |
| **Account** (Akun) | Tempat uang berada: rekening bank, e-wallet, tunai, atau lainnya |
| **Transaction** | Uang yang sudah berpindah: Income (Pemasukan), Expense (Pengeluaran), atau Transfer |
| **Category** | Label Income atau Expense, punya ikon dan warna |
| **Safe-Pay** | Pengeluaran yang belum dibayar tapi dananya sudah dikunci |
| **Locked Funds** (Dana Terkunci) | Jumlah semua Safe-Pay yang masih pending |
| **Available Balance** (Saldo Tersedia) | Saldo dikurangi Dana Terkunci |
| **Recurring Template / Occurrence** | Aturan transaksi bulanan / satu jatuh temponya |
| **Cycle** | Periode dari tanggal gajian sampai sehari sebelum gajian berikutnya |
| **Budget** | Batas pengeluaran satu kategori per Cycle |
