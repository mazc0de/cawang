# Panduan pengguna

Panduan memakai Cawang v1. Nama menu mengikuti tampilan Bahasa Indonesia; di English namanya
Dashboard, Transactions, Safe-Pay, Recurring, Budgets, Calendar, Reports, Accounts, Categories,
Settings.

## Daftar isi

1. [Daftar dan masuk](#1-daftar-dan-masuk)
2. [Setup awal (onboarding)](#2-setup-awal-onboarding)
3. [Tampilan dan navigasi](#3-tampilan-dan-navigasi)
4. [Akun](#4-akun)
5. [Kategori](#5-kategori)
6. [Transaksi](#6-transaksi)
7. [Safe-Pay](#7-safe-pay)
8. [Transaksi berulang](#8-transaksi-berulang)
9. [Budget](#9-budget)
10. [Kalender](#10-kalender)
11. [Dasbor](#11-dasbor)
12. [Laporan dan Export CSV](#12-laporan-dan-export-csv)
13. [Notifikasi](#13-notifikasi)
14. [Sembunyikan nominal](#14-sembunyikan-nominal)
15. [Pengaturan](#15-pengaturan)
16. [Pasang sebagai aplikasi (PWA) dan offline](#16-pasang-sebagai-aplikasi-pwa-dan-offline)
17. [Pertanyaan umum](#17-pertanyaan-umum)

---

## 1. Daftar dan masuk

- **Daftar** dengan email dan kata sandi (minimal 8 karakter). Cawang mengirim email konfirmasi; buka
  tautannya di perangkat yang sama untuk mulai.
- **Masuk dengan Google** juga tersedia (bila sudah diaktifkan di Supabase).
- **Lupa kata sandi**: di halaman Masuk, klik *Lupa kata sandi?*, masukkan email, lalu buka tautan di
  email untuk membuat kata sandi baru.

Bahasa awal mengikuti bahasa browser dan bisa diganti kapan saja lewat tombol bahasa di pojok kanan
atas.

## 2. Setup awal (onboarding)

Setelah daftar, ada tiga langkah singkat:

1. **Bahasa**: pilih Bahasa Indonesia atau English. Contoh format tanggal dan nominal langsung terlihat.
   Kategori default ikut dibuat dalam bahasa ini.
2. **Tanggal gajian**: pilih tanggal 1–31. Ini menjadi **tanggal mulai Cycle**. Preview Cycle berjalan
   langsung tampil (misalnya *25 Okt – 24 Nov 2026*). Tanggal 29–31 otomatis jatuh di hari terakhir
   bulan yang lebih pendek. Langkah ini boleh dilewati (default tanggal 1).
3. **Akun**: tambahkan minimal satu akun (rekening, e-wallet, tunai) beserta saldonya hari ini. Langkah
   ini wajib.

Klik **Selesai** untuk masuk ke Dasbor.

## 3. Tampilan dan navigasi

- **Desktop**: menu di sidebar kiri dengan tiga kelompok: *Uang* (Dasbor, Transaksi, Safe-Pay,
  Berulang), *Perencanaan* (Budget, Kalender, Laporan), *Atur* (Akun, Kategori). Pengaturan dan tombol
  keluar ada di bawah.
- **HP**: bar bawah berisi Dasbor, Transaksi, tombol **+** (tambah transaksi), Kalender, dan
  **Lainnya** (menu sisanya).
- **Kanan atas**: tombol mata (sembunyikan nominal), lonceng notifikasi, bahasa, dan tema
  (Ikuti sistem / Terang / Gelap).

## 4. Akun

Menu **Akun** menampilkan:

- **Ringkasan**: Total Saldo, Saldo Tersedia, dan Dana Terkunci dari semua akun aktif.
- **Kartu per akun**: Saldo Akun, Saldo Tersedia, dan Dana Terkunci (bila ada Safe-Pay).

Aksi lewat menu titik tiga di kartu:

| Aksi | Aturan |
| --- | --- |
| **Ubah** | Nama, tipe, dan Saldo Awal. Mengubah Saldo Awal menggeser semua saldo akun itu dengan selisih yang sama. |
| **Arsipkan** | Hanya bila saldo akun **0** dan tidak ada Safe-Pay pending. Kalau masih ada saldo, transfer dulu ke akun lain. Akun terarsip tidak muncul di pilihan transaksi baru, tapi riwayatnya tetap. |
| **Hapus** | Hanya untuk akun yang belum pernah punya transaksi. |
| **Pulihkan** | Akun terarsip bisa dipulihkan dari bagian *Diarsipkan*. |

Saldo boleh minus; kartunya akan menampilkan peringatan *Saldo di bawah nol*.

## 5. Kategori

Menu **Kategori** menampilkan kategori Pengeluaran dan Pemasukan (berdampingan di desktop, pakai tab
di HP).

- **Tambah / ubah**: nama, tipe, warna (10 pilihan), dan ikon (60 pilihan), dengan preview langsung.
- **Kategori yang sudah dipakai** tidak bisa diganti tipenya (Pemasukan ↔ Pengeluaran) dan tidak bisa
  dihapus; arsipkan saja.
- **Biaya Admin** adalah kategori khusus untuk biaya transfer. Bisa di-rename, tapi tidak bisa
  diarsipkan atau dihapus.

## 6. Transaksi

### Halaman Transaksi

- **Navigasi hari**: panah kiri/kanan, klik tanggal untuk membuka kalender, dan tombol **Hari ini**.
  Tanggal masa depan tidak bisa dipilih.
- **Total hari ini**: Pemasukan dan Pengeluaran hari yang dipilih. Transfer tidak dihitung karena hanya
  memindahkan uang antar akunmu sendiri.
- **Filter**: Semua / Pemasukan / Pengeluaran / Transfer, lengkap dengan jumlahnya.
- **Cari**: mencari di catatan, nama kategori, dan nama akun pada hari yang dipilih. Nyalakan
  **Cari di semua tanggal** untuk mencari di seluruh riwayat.
- Klik sebuah transaksi untuk mengubah atau menghapusnya.

### Menambah transaksi

Klik **Tambah transaksi** (desktop) atau tombol **+** (HP).

1. **Jenis**: Pengeluaran, Pemasukan, atau Transfer.
2. **Nominal**, ada beberapa cara mengisi:
   - Ketik angka biasa; titik ribuan muncul otomatis (18000 → 18.000).
   - Ketik penjumlahan, misalnya `25000+12500`. Hasilnya (= Rp 37.500) tampil di sebelah kanan dan
     dipakai saat kolom ditinggalkan. Operator: `+ − × ÷` dan tanda kurung.
   - **Nominal cepat**: klik chip seperti *+5 rb, +10 rb, +20 rb*. Setiap klik menambahkan, jadi
     +50rb +20rb +5rb = 75.000. Chip **Ulangi** mengosongkan nominal.
   - **Kalkulator** di samping form (di HP, buka lewat tombol *Kalkulator*), lalu **Pakai hasil**.
3. **Tanggal dan jam**: default sekarang. Tidak bisa di masa depan.
4. **Kategori** (Pemasukan/Pengeluaran) atau **Dari akun / Ke akun** (Transfer).
5. **Biaya Admin** (Transfer saja, opsional): dicatat sebagai pengeluaran terpisah dari akun asal.
6. **Catatan** (opsional): huruf pertama setiap kalimat otomatis kapital.
7. Pilihan tambahan (hanya saat menambah, saling eksklusif):
   - **Safe-Pay: kunci dananya, bayar nanti**: lihat [Safe-Pay](#7-safe-pay).
   - **Ulangi setiap bulan**: mencatat transaksi ini sekarang dan membuat transaksi berulang setiap
     tanggal yang sama mulai bulan depan, dengan tanggal berakhir opsional.

Kalau pengeluaran membuat saldo akun minus, form menampilkan peringatan, tapi tetap bisa disimpan.

### Mengubah dan menghapus

- Semua isian bisa diubah, termasuk jenis transaksi (misalnya Pengeluaran menjadi Transfer).
- Mengklik baris **Biaya Admin** membuka transfer induknya.
- Saat menghapus, dialog menjelaskan dampaknya:
  - Transaksi dari **Settle Safe-Pay** → Safe-Pay kembali Pending dan dananya terkunci lagi.
  - Transaksi dari **konfirmasi transaksi berulang** → jadwal bulan itu kembali menunggu konfirmasi.
  - Transfer dengan Biaya Admin → biaya adminnya ikut terhapus.

### Bulk Entry (banyak transaksi sekaligus)

Klik **Bulk Entry** di halaman Transaksi.

- Isi tabel: jenis, tanggal, nominal, kategori (atau akun tujuan untuk Transfer), akun, catatan.
  **+ Tambah baris** untuk baris baru.
- **Paste dari Excel/Sheets**: salin baris dengan urutan kolom *jenis, tanggal, nominal, kategori/akun
  tujuan, akun, catatan*, lalu paste ke tabel. Jenis dikenali dalam dua bahasa (pengeluaran/expense,
  pemasukan/income, transfer); tanggal boleh `2026-10-25` atau `25/10/2026`; nama kategori dan akun
  dicocokkan otomatis.
- Baris yang salah ditandai merah. Semua baris disimpan sekaligus; kalau satu gagal, tidak ada yang
  tersimpan.

## 7. Safe-Pay

Safe-Pay mengunci uang untuk tagihan yang belum dibayar (kos, tiket, cicilan). Uangnya tetap di akun,
tapi **tidak dihitung di Saldo Tersedia** dan **belum menjadi transaksi**.

- **Membuat**: lewat menu **Safe-Pay → Tambah Safe-Pay**, atau centang *Safe-Pay* di form transaksi.
  Isi nominal, akun, kategori pengeluaran, Due Date (opsional), dan catatan. Nominal tidak boleh
  melebihi Saldo Tersedia akun itu.
- **Halaman Safe-Pay**: total Dana Terkunci dan tab **Pending / Selesai / Batal**. Safe-Pay yang lewat
  Due Date ditandai merah.
- **Settle**: saat tagihan dibayar, klik **Settle**. Nominal dan tanggal bayar boleh disesuaikan;
  selisihnya kembali ke Saldo Tersedia. Hasilnya menjadi transaksi Pengeluaran.
- **Ubah**: nominal, akun, kategori, catatan, dan Due Date selama masih Pending.
- **Batalkan**: tidak mencatat transaksi; dana kembali ke Saldo Tersedia.

## 8. Transaksi berulang

Untuk transaksi bulanan seperti gaji, kos, atau langganan. Cawang **tidak mencatat otomatis**; ia
mengingatkan dan kamu yang memutuskan.

- **Membuat**: menu **Berulang → Tambah transaksi berulang**, atau centang *Ulangi setiap bulan* di form
  transaksi. Isi jenis, nominal, kategori/akun, catatan, tanggal setiap bulan (29–31 jatuh di akhir
  bulan pendek), tanggal mulai, dan tanggal berakhir (opsional).
- **Menunggu konfirmasi**: setiap bulan yang sudah jatuh tempo muncul terpisah. Bulan yang terlewat
  menumpuk satu per satu.
  - **Konfirmasi**: nominal dan tanggal (default tanggal jatuh tempo) boleh diubah, lalu dicatat
    sebagai transaksi.
  - **Lewati**: bulan itu tidak terjadi; tidak ada yang dicatat.
- **Template**: aktif/jeda dengan sakelar, ubah, atau hapus. Mengubah template berlaku untuk semua
  jadwal yang belum dikonfirmasi; transaksi yang sudah dicatat tidak berubah. Menghapus template tidak
  menghapus transaksi yang sudah dikonfirmasi.

## 9. Budget

Budget adalah batas pengeluaran per kategori yang **berlaku di setiap Cycle** (diatur sekali).

- **Tambah budget**: pilih kategori pengeluaran dan nominal batasnya.
- **Ringkasan Cycle**: total terpakai dibanding total semua budget.
- **Kartu per kategori**: sisa (atau *Lewat*) dan bar pemakaian. Status:

  | Status | Terpakai |
  | --- | --- |
  | **Aman** | kurang dari 80% |
  | **Hampir habis** | 80–100% |
  | **Lewat** | lebih dari 100% |

- **Safe-Pay pending** di kategori itu tampil sebagai **segmen arsir kuning** di bar. Belum dihitung
  terpakai, tapi terlihat bahwa uangnya sudah dialokasikan.
- Panah di atas mengganti Cycle yang dilihat; **Cycle ini** kembali ke Cycle berjalan.

## 10. Kalender

- Grid Senin–Minggu untuk satu Cycle, misalnya 25 Okt – 24 Nov.
- Setiap tanggal menampilkan total pemasukan (hijau) dan pengeluaran (merah); Transfer tidak dihitung.
- Di atasnya ada total Pemasukan, Pengeluaran, dan Selisih untuk Cycle itu.
- Klik tanggal untuk membuka transaksi hari itu. Panah mengganti Cycle.

## 11. Dasbor

Ringkasan dalam satu layar:

- **Total Saldo, Saldo Tersedia, Dana Terkunci**: tombol mata di sebelah *Total Saldo* menyembunyikan
  ketiganya.
- **Hari ini**: pemasukan, pengeluaran, dan transaksi hari ini.
- **Cycle ini**: pemasukan dan pengeluaran Cycle berjalan, hari ke berapa, hitung mundur ke Cycle
  berikutnya, dan selisihnya.
- **Budget**: ringkasan Cycle dan kategori yang *Hampir habis* atau *Lewat*.
- **Menunggu konfirmasi**: transaksi berulang yang jatuh tempo, bisa langsung dikonfirmasi atau
  dilewati.

## 12. Laporan dan Export CSV

Menu **Laporan**, per Cycle (ganti lewat panah):

- **Pengeluaran per kategori**: donut empat kategori terbesar plus *Lainnya*, dengan nominal dan porsi.
- **Pemasukan vs pengeluaran**: bar enam Cycle terakhir.
- **Pengeluaran sepanjang Cycle**: garis kumulatif harian dibanding total budget (garis putus-putus).

**Export CSV** (tombol di kanan atas Laporan):

- Rentang: **Cycle ini** (yang sedang dilihat) atau **Tanggal sendiri**.
- Kolom: tanggal, jam, jenis, kategori, akun, akun tujuan, nominal, catatan.
- File memakai koma sebagai pemisah dan UTF-8 BOM, jadi bisa dibuka di Excel dan Google Sheets.

## 13. Notifikasi

Lonceng di kanan atas menampilkan jumlah hal yang perlu diurus:

- Transaksi berulang yang jatuh tempo.
- Safe-Pay yang sampai atau lewat Due Date.
- Budget yang *Hampir habis* atau *Lewat*. Muncul sekali per kategori per status per Cycle, dan bisa
  ditutup dengan tombol ×.

Tidak ada email atau push notification; semua pengingat ada di dalam aplikasi.

## 14. Sembunyikan nominal

Berguna saat membuka Cawang di tempat umum.

- **Semua nominal**: tombol mata di kanan atas, atau *Pengaturan → Tampilan → Sembunyikan semua
  nominal*. Nominal tampil sebagai `Rp ••••••`.
- **Satu angka saja**: tombol mata di sebelah *Total Saldo* (Dasbor dan Akun) dan di setiap kartu akun.
  Pilihan ini berlaku di atas pengaturan global, jadi bisa "semua tersembunyi kecuali Total Saldo" atau
  "semua tampil kecuali GoPay".
- Kolom isian nominal dan kalkulator tetap terlihat supaya kamu bisa melihat yang sedang diketik.
- Pilihan disimpan di perangkat ini saja.

## 15. Pengaturan

| Bagian | Isi |
| --- | --- |
| **Cycle** | Tanggal mulai Cycle (1–31). Memilih tanggal baru hanya menampilkan preview; perubahan disimpan setelah klik **Ganti Cycle** dan konfirmasi, karena semua Cycle sebelumnya ikut dihitung ulang. Tidak ada data yang dihapus. |
| **Nominal cepat** | Tambah/hapus chip nominal (maksimal 8) atau **Kembalikan default** (5rb, 10rb, 20rb, 50rb, 100rb). |
| **Wilayah** | Zona waktu (menentukan kapan "hari ini" dimulai) dan bahasa. |
| **Tampilan** | Sembunyikan semua nominal, dan tema Ikuti sistem / Terang / Gelap. |
| **Kata sandi** | Ganti kata sandi (untuk yang masuk dengan email). |
| **Reset dan hapus** | **Reset data**: menghapus semua transaksi, akun, kategori, Safe-Pay, template berulang, dan budget; login tetap ada dan onboarding diulang. **Hapus login dan semua data**: menghapus akun Cawang sepenuhnya. Keduanya meminta kamu mengetik kata konfirmasi (RESET / HAPUS). |

Versi aplikasi tertera di bagian paling bawah halaman Pengaturan.

## 16. Pasang sebagai aplikasi (PWA) dan offline

- **Pasang**: di Chrome/Edge pilih *Install app*; di Safari iPhone pilih *Bagikan → Tambah ke Layar
  Utama*. Aplikasi terpasang langsung membuka Dasbor.
- **Offline**: data yang terakhir dimuat tetap bisa dilihat, dengan banner *Kamu sedang offline*.
  Menyimpan perubahan butuh koneksi; tidak ada antrean penulisan offline.
- Saat keluar (logout), salinan data offline di perangkat dihapus.

## 17. Pertanyaan umum

**Kenapa Transfer tidak dihitung di pemasukan/pengeluaran?**
Transfer hanya memindahkan uang antar akunmu sendiri, jadi total uangmu tidak berubah. Biaya admin
transfer tetap dihitung sebagai pengeluaran.

**Apa beda Saldo Akun dan Saldo Tersedia?**
Saldo Akun adalah uang yang benar-benar ada di akun. Saldo Tersedia adalah Saldo Akun dikurangi dana
yang dikunci Safe-Pay, yaitu uang yang benar-benar bebas dipakai.

**Kenapa saya tidak bisa mengarsipkan akun?**
Akun hanya bisa diarsipkan bila saldonya 0 dan tidak ada Safe-Pay pending. Transfer dulu sisa saldonya
ke akun lain, lalu selesaikan atau batalkan Safe-Pay-nya.

**Kalau tanggal gajian berubah, data lama bagaimana?**
Ganti tanggal mulai Cycle di Pengaturan. Semua transaksi tetap ada; hanya pengelompokan per Cycle
(budget, kalender, laporan) yang dihitung ulang.

**Apakah Cawang terhubung ke rekening bank?**
Tidak. Semua transaksi dicatat sendiri; Cawang yang menghitung saldo, budget, dan laporannya.

**Apakah data saya bisa dilihat orang lain?**
Tidak. Setiap baris data dilindungi Row Level Security di database, sehingga hanya bisa dibaca dan
diubah oleh pemiliknya.
