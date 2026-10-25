# Pengembangan

## Prasyarat

- Node.js 22 atau lebih baru (Vite 8 membutuhkan 20.19+).
- pnpm. Proyek ini dikembangkan dengan pnpm 8.10 yang terpasang global; `package.json` tidak mengunci
  versi pnpm.
- Project Supabase yang sudah dijalankan `schema.sql`-nya (lihat
  [`supabase/README.md`](../supabase/README.md)).
- Untuk pemeriksaan desain taste-skill: Google Chrome, Edge, atau Chromium.

## Setup lokal

```bash
cd app
cp .env.example .env.local     # isi URL project dan publishable key Supabase
pnpm install
pnpm dev                       # http://localhost:8888
```

| Variabel | Isi |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) atau anon key lama. **Jangan** secret/service_role key. |

Tanpa variabel ini, aplikasi menampilkan layar *Supabase belum dikonfigurasi*.

Port **8888** dikunci (`strictPort`) karena Redirect URLs Supabase dan origin Google OAuth menunjuk ke
sana. Kalau port dipakai program lain, dev server berhenti dengan error, bukan pindah ke port lain.

## Perintah

| Perintah | Isi |
| --- | --- |
| `pnpm dev` | Dev server dengan hot reload |
| `pnpm build` | Typecheck + build produksi ke `dist/` (termasuk service worker PWA) |
| `pnpm preview` | Menyajikan hasil build di port 8888 |
| `pnpm test` | Vitest sekali jalan |
| `pnpm test:watch` | Vitest mode watch |
| `pnpm typecheck` | TypeScript saja |
| `pnpm lint` | oxlint |

Sebelum dianggap selesai, sebuah perubahan harus lolos `pnpm typecheck`, `pnpm lint`, `pnpm test`, dan
`pnpm build`. Lint saat ini menyisakan dua warning `only-export-components` yang wajar untuk pola
provider + hook dalam satu file.

## Tes

Tes Vitest menguji logika murni di `src/lib` dan `src/features/export`:

| File | Yang diuji |
| --- | --- |
| `lib/cycle.test.ts` | Rentang Cycle, clamp tanggal 29–31, pergantian tahun, sifat retroaktif, navigasi, hitung mundur |
| `lib/dates.test.ts` | Rentang hari per zona waktu (termasuk hari DST), konversi tanggal/jam lokal |
| `lib/calculator.test.ts` | Ekspresi nominal, desimal koma, pembulatan, input yang sedang diformat ("1.8000") |
| `lib/recurring.test.ts` | Occurrence pending, clamp akhir bulan, tanggal mulai/berakhir, jeda, jatuh tempo berikutnya |
| `lib/budget.test.ts` | Ambang Budget Status (80% dan 100%) |
| `lib/amount-visibility.test.ts` | Pengaturan global vs per angka |
| `lib/amount-presets.test.ts` | Normalisasi dan default nominal cepat |
| `lib/chart-scale.test.ts` | Skala sumbu chart yang bulat |
| `lib/text.test.ts` | Kapital di awal kalimat |
| `features/export/csv.test.ts` | Escaping dan BOM CSV |

Tes ditulis lebih dulu untuk logika domain (red → green). Logika baru yang bisa dipisahkan dari React
sebaiknya ditaruh di `src/lib` bersama tesnya.

## Konvensi

### Bahasa

- **Nama file, fungsi, variabel, route, dan objek SQL dalam bahasa Inggris.** Teks di layar lewat
  i18n (EN/ID); dokumen proyek boleh berbahasa Indonesia.
- **Istilah domain mengikuti [GLOSSARY.md](../../GLOSSARY.md)** di kode dan UI: Account, Transaction
  Type, Category, Safe-Pay, Settle, Cancel, Locked Funds, Available Balance, Recurring
  Template/Occurrence, Confirm, Skip, Due Date, Archive, Cycle, Cycle Start Day, Budget, Budget Status.
  Jangan menyebut Transaction Type sebagai "kategori", dan jangan memakai "Akun" untuk login.

### Kode

- Komentar menjelaskan **alasan**, bukan mengulang apa yang dilakukan kode.
- Data server hanya lewat hook di `features/*/queries.ts`. Setelah mutasi, invalidate setiap query yang
  angkanya bisa berubah (saldo hampir selalu ikut).
- Nominal: tampilkan dengan `Money`, input dengan `AmountInput`, baca teks dengan `parseAmountInput`.
  Teks nominal di luar `Money` memakai `useMaskedFormat()` supaya ikut disembunyikan.
- Tanggal: gunakan `IsoDate` dan fungsi di `lib/dates.ts` dengan zona waktu profil. Jangan pakai
  `new Date()` untuk menentukan "hari ini" tanpa zona waktu.
- Pilih tanggal dengan `DatePicker` / `CalendarPopover`, bukan `<input type="date">`.
- Catatan (note) memakai `sentenceCase` saat diketik.
- Form memakai react-hook-form + zod. Pesan validasi berupa kunci i18n (`validation.*`), ditampilkan oleh
  `FormFieldError`.
- Teks baru: tambahkan ke `en.ts` dan `id.ts` (TypeScript menolak kunci yang hilang di salah satunya).

### Desain

- Gunakan token di `src/index.css` (`bg-card`, `text-muted-foreground`, `text-income`, `text-expense`,
  `text-transfer`, `text-locked`, `bg-brand-soft`, `text-caution`, …), jangan warna hex baru, kecuali
  palet kategori di `lib/palette.ts`.
- Aturan gaya pastel-consumer dan house rules taste-skill:
  - tanpa gradient, glow, atau blur;
  - kartu memakai border 1px, tanpa bayangan saat diam;
  - satu `h1` per layar;
  - angka rata kanan dengan digit tabular (`num`);
  - warna untuk data dan status, bukan dekorasi.
- Pemeriksaan dengan taste-skill (dijalankan dari folder `app/`):

  ```bash
  node .claude/skills/design-taste-frontend/scripts/lint.mjs --app src
  node .claude/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:8888/dashboard --app
  ```

  Inspector membuka layar di 1440, 768, dan 390px, mengukur aturan, dan menyimpan screenshot di
  `.taste-skill/inspect/`. Untuk landing page, jalankan dari folder `.taste-skill/landing/` supaya
  memakai sheet halaman, bukan sheet app.

## Menambah fitur

### Layar baru

1. Buat `src/pages/<nama>/<nama>-page.tsx` dengan `PageHeader` (berisi `h1`).
2. Tambahkan route lazy di `src/router/index.tsx` di dalam `AppShell`.
3. Tambahkan menu di `src/layouts/nav-items.ts` (`NAV`, `SIDEBAR_GROUPS`, dan `MORE_ITEMS` untuk HP).
4. Tambahkan teks di `nav.*` dan bagian halaman di kedua file locale.

### Data baru

1. Ubah `supabase/schema.sql` (lihat [database.md → Mengubah skema](database.md#mengubah-skema)).
2. Tambahkan tipe di `src/lib/database.ts`.
3. Buat atau perluas `src/features/<area>/queries.ts` dengan kunci query sendiri dan invalidasi yang
   tepat.
4. Kalau ada aturan bisnis yang harus selalu benar, jaga di database (trigger/RPC), bukan hanya di form.

### Pengaturan baru

Tambahkan `SettingsSection` di `src/pages/settings/settings-page.tsx`. Satu view memakai satu model
simpan: kontrol yang menyimpan sendiri dengan toast *Tersimpan*. Perubahan yang berdampak luas (seperti
Cycle) disimpan lewat tombol + dialog konfirmasi.

## Versi

Versi aplikasi ada di `version` pada `package.json` (saat ini `1.0.0`). `vite.config.ts` membacanya
saat build dan `src/lib/version.ts` menampilkannya sebagai `v1`, atau `v1.1` untuk `1.1.x`, di
Pengaturan, sidebar, menu HP, dan footer landing.

## Masalah umum saat pengembangan

| Gejala | Solusi |
| --- | --- |
| `corepack use pnpm@10` gagal "Cannot find matching keyid" | Corepack versi lama di mesin ini; pakai pnpm yang sudah terpasang |
| Dev server tidak mau jalan, port 8888 dipakai | Hentikan proses lain di port itu (`lsof -ti tcp:8888`), port sengaja dikunci |
| Simpan gagal dengan pesan "Database belum punya kolom terbaru" | Jalankan ulang `supabase/schema.sql` |
| `permission denied for function …` saat dipanggil sebagai user login | Fungsi belum di-grant ke `authenticated` di bagian akhir `schema.sql` |
| Ikon/favicon lama masih muncul | Hard refresh; PWA terpasang perlu diperbarui atau dipasang ulang |
| Komponen shadcn baru meng-overwrite `button.tsx` | Jawab *No* saat CLI menanyakan overwrite; `button.tsx`, `input.tsx`, `select.tsx`, `card.tsx`, `dialog.tsx`, `sheet.tsx` sudah disesuaikan |
