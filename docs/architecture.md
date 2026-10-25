# Arsitektur

Cawang adalah SPA (single-page app) React yang berbicara langsung dengan Supabase. Tidak ada server
aplikasi sendiri: aturan bisnis yang harus selalu benar dijaga di database (constraint, trigger, RLS,
RPC), sedangkan aplikasi menangani tampilan, perhitungan turunan, dan pengalaman pengguna.

```
Browser (React SPA, PWA)
  ├─ supabase-js ──► Supabase Auth  (email + password, Google OAuth, PKCE)
  └─ supabase-js ──► PostgREST ──► Postgres
                                    ├─ tabel + RLS "own rows only"
                                    ├─ view account_balances (saldo diturunkan)
                                    ├─ trigger (aturan per baris)
                                    └─ RPC (aksi multi-baris yang atomik)
```

## Stack

| Bagian | Pilihan |
| --- | --- |
| Build | Vite 8, TypeScript 6, pnpm |
| UI | React 19, Tailwind CSS 4, shadcn/ui (Radix), lucide-react untuk ikon antarmuka |
| Routing | React Router (data router, setiap halaman di-lazy-load) |
| Data | TanStack Query 5 di atas `@supabase/supabase-js` |
| Form | react-hook-form + zod |
| Tanggal | date-fns + `@date-fns/tz`; kalender dari react-day-picker |
| Chart | Recharts lewat komponen chart shadcn (hanya di halaman Laporan) |
| i18n | i18next + react-i18next, EN/ID |
| PWA | vite-plugin-pwa (Workbox) |
| Tes | Vitest untuk logika domain di `src/lib`; tidak ada tes E2E di v1 |
| Lint | oxlint |
| Deploy | Vercel (statis) |

## Struktur folder

```
app/
├─ supabase/schema.sql      Seluruh database dalam satu file (aman dijalankan ulang)
├─ public/                  Favicon, ikon PWA, foto landing page (+ credits.json)
├─ docs/                    Dokumentasi ini
└─ src/
   ├─ main.tsx              Provider: Theme → AmountVisibility → QueryClient → Tooltip → Auth → Router
   ├─ index.css             Token desain (warna, radius, font) + utilitas landing page
   ├─ router/               Definisi route dan guard (RequireAuth, RequireOnboarded, GuestOnly)
   ├─ layouts/              AppShell (sidebar, top bar HP, bottom nav), AuthLayout, daftar menu
   ├─ pages/                Satu folder per route; komposisi layar
   ├─ features/             Per area domain: hook data (queries.ts) + komponen khusus area itu
   ├─ components/           Komponen bersama (Money, AmountInput, DatePicker, PageHeader, …)
   │  └─ ui/                Komponen shadcn hasil generate, sedikit disesuaikan
   ├─ lib/                  Logika murni tanpa React, sebagian besar punya tes
   ├─ providers/            Context: auth, tema, visibilitas nominal
   └─ i18n/                 Inisialisasi i18next dan teks EN/ID
```

### Lapisan dan arah ketergantungan

```
pages  ──►  features  ──►  components  ──►  lib
  │            │                              ▲
  └────────────┴──────── providers ───────────┘
```

- **`lib/`**: fungsi murni (Cycle, tanggal, kalkulator, format IDR, budget status, penjadwalan
  recurring, CSV, skala chart). Tidak mengimpor React atau Supabase, kecuali `supabase.ts` dan
  `errors.ts`. Di sinilah tes Vitest berada.
- **`features/<area>/`**: `queries.ts` berisi hook TanStack Query untuk membaca dan mutasi data area
  itu; komponen di sebelahnya adalah form dan widget yang hanya relevan untuk area itu.
- **`pages/`**: menyusun fitur menjadi layar. Halaman tidak memanggil Supabase langsung, kecuali aksi
  satu kali yang sederhana seperti RPC `reset_data` di Pengaturan.

| Area di `features/` | Isi |
| --- | --- |
| `accounts` | Query akun dan saldo, form akun, ikon tipe akun, daftar Saldo Tersedia |
| `categories` | Query kategori, form kategori (ikon + warna), tile kategori |
| `transactions` | Query transaksi (per hari, pencarian, simpan, hapus, bulk), dialog form, kalkulator, picker akun/kategori, baris transaksi, Bulk Entry |
| `safe-pay` | Query Safe-Pay, form, dialog Settle |
| `recurring` | Query template dan occurrence, penghitung occurrence pending, form template, dialog Confirm, daftar pending |
| `budgets` | Query budget dan progres per Cycle, plan bar, ringkasan Cycle, pill status |
| `cycle` | Cycle berjalan, transaksi per rentang, navigator Cycle, pemilih tanggal, preview, pengaturan Cycle |
| `notifications` | Gabungan isi lonceng dan dismissal |
| `profile` | Query profil, sinkronisasi bahasa/tema, pengaturan nominal cepat |
| `export` | CSV (murni, dites) dan dialog export |

## Alur data

### TanStack Query

Semua data server dibaca lewat hook di `features/*/queries.ts`. Kunci query:

| Kunci | Isi |
| --- | --- |
| `['profile', userId]` | Profil (bahasa, zona waktu, tanggal mulai Cycle, tema, nominal cepat) |
| `['accounts']` | Semua akun, termasuk yang diarsipkan |
| `['account-balances']` | Isi view `account_balances`, dijadikan `Map` per akun |
| `['categories']` | Semua kategori, termasuk yang diarsipkan |
| `['transactions', …]` | Per hari, pencarian, per rentang, Biaya Admin, keterkaitan |
| `['safe-pays']` | Semua Safe-Pay; transaksi Settle di `['safe-pays', 'settlements', ids]` |
| `['recurring', …]` | Template dan occurrence yang sudah diputuskan |
| `['budgets']` | Semua budget |
| `['notification-dismissals']` | Kunci notifikasi yang sudah ditutup |

Setelah mutasi, query yang terdampak di-*invalidate*. Contohnya, menyimpan transaksi meng-invalidate
`transactions` dan `account-balances`, sedangkan Settle Safe-Pay meng-invalidate `safe-pays`,
`account-balances`, dan `transactions`.

Pengaturan default di `main.tsx`:

- query: `staleTime` 30 detik, `retry` 1, `networkMode: 'offlineFirst'` supaya permintaan tetap jalan
  saat offline dan bisa dijawab dari cache service worker;
- mutasi: `networkMode: 'always'` supaya langsung gagal saat offline, bukan masuk antrean.

### Nilai turunan dihitung, bukan disimpan

- **Saldo** dihitung oleh view `account_balances` dari Saldo Awal + semua transaksi − Safe-Pay pending
  ([ADR 0001](../../docs/adr/0001-derived-account-balance.md)).
- **Cycle** dihitung di `lib/cycle.ts` dari tanggal mulai Cycle saat ini, sehingga mengubah pengaturan
  otomatis bersifat retroaktif.
- **Occurrence pending** dihitung di `lib/recurring.ts` dari template; database hanya menyimpan yang
  sudah di-Confirm atau di-Skip
  ([ADR 0003](../../docs/adr/0003-recurring-occurrence-stored-when-resolved.md)).
- **Progres budget, total kalender, laporan** dihitung di klien dari transaksi dalam rentang Cycle.
  Volume data satu orang kecil, jadi ini murah.

### Tanggal dan zona waktu

- Tanggal kalender dibawa sebagai string ISO `IsoDate` (`"2026-10-25"`). Aritmetika memakai UTC
  midnight, jadi tidak pernah bergeser karena DST atau zona waktu browser (`lib/dates.ts`).
- Instan disimpan sebagai `timestamptz`. Konversi selalu memakai **zona waktu profil**, bukan zona
  waktu browser:
  - `todayIn(tz)`: tanggal hari ini;
  - `zonedTimestamp(date, time, tz)`: instan dari tanggal + jam lokal;
  - `zonedParts(iso, tz)`: tanggal dan jam lokal dari instan;
  - `dayBoundsUtc(date, tz)`: rentang setengah-terbuka untuk query satu hari.

### Nominal

- Rupiah selalu bilangan bulat (`bigint` di database).
- Ditampilkan oleh komponen `Money`: "Rp" lebih kecil, digit tabular, dan warna semantik (income hijau,
  expense merah, transfer biru, locked amber).
- Input lewat `AmountInput`, yang memakai `parseAmountInput`:
  - angka biasa: semua titik dianggap pemisah ribuan;
  - ekspresi: dihitung oleh `evaluateAmount`;
  - awalan "Rp" dari paste diabaikan.

## Autentikasi dan routing

- `AuthProvider` membaca sesi dari supabase-js dan mendengarkan `onAuthStateChange`. Saat
  `SIGNED_OUT`, cache TanStack Query dan cache service worker `supabase-reads` dikosongkan.
- Flow PKCE dengan `detectSessionInUrl`, sehingga tautan konfirmasi email, reset password, dan callback
  Google langsung membentuk sesi.
- Guard di `router/guards.tsx`:

  | Guard | Perilaku |
  | --- | --- |
  | `GuestOnly` | Login/daftar/lupa sandi; pengguna yang sudah masuk dialihkan ke `/dashboard` |
  | `RequireAuth` | Semua halaman app dan onboarding; tanpa sesi dialihkan ke `/login` |
  | `RequireOnboarded` | Layar app; profil tanpa `onboarding_completed_at` dialihkan ke `/onboarding`. Menampilkan error + Coba lagi bila profil gagal dimuat |

- Setiap halaman adalah chunk terpisah (`lazy` di `router/index.tsx`); Recharts hanya termuat di
  Laporan. Route akar punya `hydrateFallbackElement` untuk muatan pertama.

| Route | Halaman |
| --- | --- |
| `/` | Landing page |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Autentikasi |
| `/onboarding` | Setup awal |
| `/dashboard`, `/transactions`, `/safe-pay`, `/recurring`, `/budgets`, `/calendar`, `/reports`, `/accounts`, `/categories`, `/settings` | Layar app |
| `/transactions?date=YYYY-MM-DD` | Hari tertentu (dipakai Kalender) |
| `/transactions?new=1` | Langsung membuka form tambah (tombol + di HP) |

## i18n

- Teks ada di `i18n/locales/en.ts` (sumber kunci) dan `id.ts` (bertipe `Messages`, jadi kunci yang
  hilang langsung jadi error TypeScript). `i18next.d.ts` membuat `t('…')` bertipe ketat.
- Bahasa awal: localStorage `cawang-language`, lalu bahasa browser. Setelah onboarding selesai, bahasa
  profil yang dipakai (`PreferencesSync`). Selama onboarding, bahasa browser yang menang dan kategori
  default di-reseed mengikutinya.
- Format tanggal mengikuti bahasa lewat locale date-fns; nominal selalu `Rp 1.250.000`.
- Error dari database berupa kode stabil (`SAFE_PAY_EXCEEDS_AVAILABLE`), diterjemahkan oleh
  `lib/errors.ts`. Lihat [database.md](database.md#kode-error).

## Tema dan desain

- Token warna, radius, dan font ada di `src/index.css` sebagai CSS variable untuk `:root` (terang) dan
  `.dark` (gelap), dipetakan ke Tailwind lewat `@theme inline`.
- Layar app mengikuti gaya taste-skill **pastel-consumer**: Manrope, kartu putih di atas latar
  off-white, radius kartu 20px, tile kategori pastel, dan warna dipakai untuk data, bukan dekorasi.
  Arsipnya di `.taste-skill/direction.json`.
- Landing page mengikuti arah taste-skill **type-only-statement** (`.taste-skill/landing/`).
- Warna semantik tetap: Income hijau, Expense merah, Transfer biru, Locked Funds/Safe-Pay amber, dan
  status "Hampir habis" pada budget memakai oranye (`caution`).
- Tema: `ThemeProvider` menyimpan pilihan di localStorage `cawang-theme` dan di profil. Skrip kecil di
  `index.html` memasang kelas `dark` sebelum render pertama supaya tidak berkedip.
- Logo (`components/brand-mark.tsx`) digambar khusus: huruf C dengan dua candlestick naik. Bukan ikon
  library.

## Visibilitas nominal (privasi)

- `providers/amount-visibility.tsx` menyimpan `{ global, items }` di localStorage
  `cawang-amount-visibility`. Logikanya murni dan dites di `lib/amount-visibility.ts`.
- `Money` menerima `privacyKey` opsional (`"summary"`, `"account:<id>"`); tanpa kunci, ia mengikuti
  pengaturan global.
- Teks di luar `Money` (tooltip chart, petunjuk saldo, kalender) memakai `useMaskedFormat()`.
- `AlwaysShowAmounts` membungkus landing page, contoh di halaman login, dan onboarding supaya tidak
  ikut disamarkan.

## PWA dan offline

- Manifest: nama *Cawang — Catat Keuangan*, `start_url` `/dashboard`, ikon 192/512/maskable. Mode
  `autoUpdate`.
- Precache: aset app; font subset non-Latin dikecualikan.
- Runtime cache `supabase-reads`: hanya **GET** ke `/rest/v1/` dengan strategi `NetworkFirst`
  (timeout 5 detik). Penulisan selalu butuh jaringan.
- `OfflineBanner` di AppShell memberi tahu saat offline.

## Keputusan penting

| Keputusan | Alasan | Rujukan |
| --- | --- | --- |
| Saldo diturunkan, tidak disimpan | Transaksi boleh diedit/dihapus kapan saja tanpa saldo jadi tidak sinkron | ADR 0001 |
| Safe-Pay tabel terpisah | Query saldo/budget/kalender tidak perlu mengecualikan flag pending; tanggal Expense = tanggal Settle | ADR 0002 |
| Occurrence disimpan hanya saat diputuskan | Edit template langsung berlaku untuk yang pending, tanpa cron | ADR 0003 |
| Aturan per baris di trigger, aksi multi-baris di RPC | Tidak bisa dilewati oleh klien mana pun, dan selalu atomik | [database.md](database.md) |
| Foreign key komposit `(user_id, id)` | Baris tidak mungkin menunjuk akun/kategori milik user lain | [database.md](database.md) |
| Cycle retroaktif tanpa riwayat | Satu pengaturan global yang sederhana; dikonfirmasi dulu di UI | spec §11 |
