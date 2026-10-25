# Database

Seluruh database ada di satu file: [`supabase/schema.sql`](../supabase/schema.sql). Tempel ke Supabase
SQL Editor lalu Run. File ini **aman dijalankan berulang**:

- tabel dibuat hanya bila belum ada;
- kolom baru ditambahkan dengan `add column if not exists`;
- fungsi, view, policy, dan trigger diganti versi terbaru.

Panduan setup: [`supabase/README.md`](../supabase/README.md).

## Prinsip

1. **Setiap baris milik satu user.** Semua tabel punya `user_id` (default `auth.uid()`, cascade saat
   user dihapus) dan policy RLS *own rows only*.
2. **Referensi antar tabel memakai foreign key komposit `(user_id, id)`**, jadi transaksi tidak mungkin
   menunjuk akun atau kategori milik user lain walau ID-nya diketahui.
3. **Saldo tidak disimpan**: dihitung oleh view `account_balances`.
4. **Aturan satu baris dijaga trigger; aksi multi-baris adalah RPC.** Klien tidak bisa melewati aturan,
   dan setiap aksi selalu atomik.
5. **Error untuk aplikasi berupa kode `UPPER_SNAKE`** yang diterjemahkan di klien.

## Tabel

### `profiles`

Satu baris per user, dibuat otomatis oleh trigger `on_auth_user_created`.

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | uuid PK | = `auth.users.id` |
| `language` | text | `en` / `id`, default dari metadata signup, lalu locale Google, lalu `id` |
| `timezone` | text | Default `Asia/Jakarta`; divalidasi trigger (`INVALID_TIMEZONE`) |
| `cycle_start_day` | smallint | 1–31, default 1 |
| `theme` | text | `system` / `light` / `dark` |
| `onboarding_completed_at` | timestamptz | null = onboarding belum selesai |
| `amount_presets` | bigint[] | Nominal cepat; default `{5000,10000,20000,50000,100000}`, maksimal 8, semua > 0 |

### `accounts`

| Kolom | Keterangan |
| --- | --- |
| `name` | 1–60 karakter |
| `type` | `bank` / `cash` / `ewallet` / `other` |
| `initial_balance` | bigint, boleh minus |
| `archived_at` | null = aktif |

### `categories`

| Kolom | Keterangan |
| --- | --- |
| `name` | 1–40 karakter |
| `type` | `income` / `expense` |
| `icon` | nama ikon (lihat `src/lib/category-icons.ts`) |
| `color` | kunci palet (`blue`, `sky`, `teal`, `green`, `lime`, `orange`, `rose`, `pink`, `brown`, `slate`) |
| `system_key` | `admin_fee` untuk kategori Biaya Admin; unik per user |
| `sort_order`, `archived_at` | urutan dan arsip |

### `transactions`

| Kolom | Keterangan |
| --- | --- |
| `type` | `income` / `expense` / `transfer` |
| `amount` | bigint > 0 |
| `occurred_at` | timestamptz; tidak boleh lewat hari ini di zona waktu profil |
| `account_id` | akun (asal untuk transfer) |
| `to_account_id` | wajib dan ≠ `account_id` untuk transfer; null selain transfer |
| `category_id` | wajib selain transfer; tipenya harus sama dengan `type` |
| `note` | maksimal 500 karakter |
| `parent_transaction_id` | Biaya Admin → transfer induknya (cascade saat transfer dihapus) |

### `safe_pays`

| Kolom | Keterangan |
| --- | --- |
| `account_id`, `category_id` | kategori harus expense |
| `amount` | nominal yang dikunci |
| `note`, `due_date` | opsional |
| `status` | `pending` / `settled` / `cancelled` |
| `transaction_id` | transaksi hasil Settle; wajib bila `settled` |
| `settled_at`, `cancelled_at` | waktu perubahan status |

### `recurring_templates`

`type`, `amount`, `account_id`, `to_account_id`, `category_id`, `note`, `day_of_month` (1–31),
`start_date`, `end_date` (≥ `start_date`), dan `is_active`. Aturan transfer dan kategori sama dengan
transaksi.

### `recurring_occurrences`

Hanya occurrence yang **sudah diputuskan**. Yang pending dihitung di aplikasi
([ADR 0003](../../docs/adr/0003-recurring-occurrence-stored-when-resolved.md)).

| Kolom | Keterangan |
| --- | --- |
| `template_id` | cascade saat template dihapus |
| `period` | tanggal 1 bulan jatuh tempo; unik per template |
| `due_date` | tanggal jatuh tempo (dijepit ke akhir bulan) |
| `status` | `confirmed` / `skipped` |
| `transaction_id` | wajib bila `confirmed`; **cascade**, jadi menghapus transaksinya membuat occurrence kembali pending |

### `budgets`

`category_id` (unik per user, harus expense, cascade saat kategori dihapus) dan `amount` > 0.

### `notification_dismissals`

PK `(user_id, key)`. Kunci notifikasi budget berbentuk
`budget:<category_id>:<running_low|over>:<awal Cycle>`.

## View `account_balances`

`security_invoker = true`, sehingga RLS tabel dasar tetap berlaku. Per akun:

| Kolom | Rumus |
| --- | --- |
| `balance` | `initial_balance` + income − expense − transfer keluar + transfer masuk |
| `locked_funds` | jumlah Safe-Pay `pending` di akun itu |
| `available_balance` | `balance` − `locked_funds` |

## Aturan yang dijaga database

| Aturan | Mekanisme | Kode error |
| --- | --- | --- |
| Kategori transaksi/template harus sesuai jenis | trigger `check_transaction`, `check_recurring_template` | `CATEGORY_TYPE_MISMATCH` |
| Safe-Pay dan budget hanya untuk kategori expense | trigger `check_safe_pay`, `check_budget` | `CATEGORY_TYPE_MISMATCH` |
| Transaksi tidak boleh di masa depan | trigger `check_transaction` | `TRANSACTION_IN_FUTURE` |
| Safe-Pay ≤ Saldo Tersedia (buat dan edit) | trigger `check_safe_pay` | `SAFE_PAY_EXCEEDS_AVAILABLE` |
| Arsip akun hanya bila saldo 0 | trigger `check_account_archive` | `ACCOUNT_BALANCE_NOT_ZERO` |
| Arsip akun hanya bila tidak ada Safe-Pay pending | trigger `check_account_archive` | `ACCOUNT_HAS_PENDING_SAFE_PAY` |
| Tipe kategori yang sudah dipakai tidak bisa diubah | trigger `check_category_type_change` | `CATEGORY_TYPE_LOCKED` |
| Menghapus transaksi Settle mengembalikan Safe-Pay ke pending | trigger `revert_settled_safe_pay` (BEFORE DELETE) | — |
| Menghapus transaksi Confirm mengembalikan occurrence ke pending | FK cascade | — |
| Akun/kategori yang punya transaksi tidak bisa dihapus | FK (Postgres `23503`) | `errors.inUse` di klien |
| Zona waktu harus valid | trigger `check_profile` | `INVALID_TIMEZONE` |
| `updated_at` otomatis | trigger `<tabel>_updated_at` | — |

## RPC (fungsi yang dipanggil aplikasi)

Semua RPC berjalan sebagai user pemanggil (RLS tetap berlaku), kecuali yang ditandai *definer*.

| Fungsi | Kegunaan |
| --- | --- |
| `save_transaction(p_id, p_type, p_amount, p_occurred_at, p_account, p_to_account, p_category, p_note, p_admin_fee)` | Buat (`p_id` null) atau ubah transaksi apa pun, termasuk ganti jenis. Biaya Admin ikut dibuat, diubah, atau dihapus. Catatan kosong disimpan null. |
| `save_transfer(...)` | Pintasan `save_transaction` khusus transfer |
| `create_transaction_with_recurring(p_type, p_amount, p_occurred_at, p_account, p_to_account, p_category, p_note, p_admin_fee, p_end_date)` | Catat transaksi sekarang + buat template mulai bulan depan di tanggal yang sama |
| `bulk_insert_transactions(p_rows jsonb)` | Bulk Entry: semua baris atau tidak sama sekali |
| `settle_safe_pay(p_id, p_amount, p_occurred_at)` | Safe-Pay pending → transaksi expense + status settled |
| `confirm_recurring_occurrence(p_template_id, p_period, p_amount, p_occurred_at)` | Catat satu bulan template sebagai transaksi |
| `skip_recurring_occurrence(p_template_id, p_period)` | Tandai satu bulan dilewati |
| `reseed_default_categories(p_lang)` *(definer)* | Selama onboarding saja: buat ulang kategori default dalam bahasa lain |
| `reset_data()` *(definer)* | Hapus semua data uang user, seed ulang kategori, ulangi onboarding |
| `delete_account()` *(definer)* | Hapus `auth.users` user ini; semua data ikut terhapus lewat cascade |
| `user_today(p_user)` | Tanggal hari ini di zona waktu profil |

Fungsi internal (`seed_default_categories`, `handle_new_user`) tidak bisa dipanggil dari API.
Semua akses tabel dan fungsi untuk role `anon` dicabut.

## Kategori default

Dibuat saat signup dalam bahasa user. Setelah itu menjadi teks biasa milik user dan tidak
diterjemahkan ulang.

| Tipe | Kategori (ID / EN) |
| --- | --- |
| Pengeluaran | Makan & Minum / Food & Drinks · Belanja Bulanan / Groceries · Transportasi / Transport · Tagihan / Bills & Utilities · Belanja / Shopping · Hiburan / Entertainment · Kesehatan / Health · Pendidikan / Education · Keluarga & Sedekah / Family & Giving · **Biaya Admin / Admin Fee** (`system_key = admin_fee`) · Lainnya / Other |
| Pemasukan | Gaji / Salary · Bonus · Freelance · Investasi / Investment · Lainnya / Other |

Kalau kategori Biaya Admin terhapus selagi belum dipakai, `admin_fee_category_id()` membuatnya lagi saat
transfer berikutnya memakai biaya admin.

## Kode error

Diterjemahkan oleh `src/lib/errors.ts` ke teks di `errors.codes.*` (EN/ID).

| Kode | Arti |
| --- | --- |
| `SAFE_PAY_EXCEEDS_AVAILABLE` | Nominal Safe-Pay melebihi Saldo Tersedia akun |
| `ACCOUNT_HAS_PENDING_SAFE_PAY` | Akun masih punya Safe-Pay pending |
| `ACCOUNT_BALANCE_NOT_ZERO` | Akun yang diarsipkan saldonya belum 0 |
| `CATEGORY_TYPE_LOCKED` | Tipe kategori yang sudah dipakai tidak bisa diubah |
| `CATEGORY_TYPE_MISMATCH` | Kategori tidak cocok dengan jenis |
| `TRANSACTION_IN_FUTURE` | Tanggal transaksi di masa depan |
| `TRANSACTION_NOT_FOUND` | Transaksi yang diubah tidak ada |
| `ADMIN_FEE_PART_OF_TRANSFER` | Biaya Admin hanya diubah lewat transfernya |
| `SAFE_PAY_NOT_FOUND` / `SAFE_PAY_NOT_PENDING` | Safe-Pay tidak ada / sudah tidak pending |
| `RECURRING_TEMPLATE_NOT_FOUND` | Template tidak ada |
| `OCCURRENCE_NOT_DUE` | Bulan itu belum jatuh tempo atau di luar rentang template |
| `OCCURRENCE_ALREADY_RESOLVED` | Bulan itu sudah dikonfirmasi atau dilewati |
| `INVALID_TIMEZONE` / `INVALID_LANGUAGE` | Nilai profil tidak dikenal |
| `NOT_AUTHENTICATED` | Sesi berakhir |

Kode non-domain yang juga ditangani klien:

- Auth Supabase: `invalid_credentials`, `email_not_confirmed`, `user_already_exists`, `weak_password`,
  `same_password`, dan batas rate.
- Postgres `23503`: data masih dipakai.
- PostgREST `PGRST204`: kolom baru belum ada, artinya `schema.sql` belum dijalankan ulang.

## Mengubah skema

1. Edit `supabase/schema.sql`, dan pastikan tetap aman dijalankan ulang:
   - kolom baru: `alter table … add column if not exists`;
   - constraint baru: blok `do $$ … exception when duplicate_object then null; end $$`;
   - fungsi, view, dan policy: `create or replace` / `drop … if exists`.
2. Fungsi baru yang dipanggil aplikasi: tambahkan ke blok `grant execute … to authenticated` di bagian
   akhir file.
3. Fungsi bantu yang dipanggil dari trigger atau RPC juga perlu di-grant ke `authenticated`. Trigger
   sendiri tidak perlu.
4. Tambahkan kode error baru ke `errors.codes` di `src/i18n/locales/en.ts` dan `id.ts`.
5. Perbarui tipe di `src/lib/database.ts` dan dokumen ini.
6. Jalankan ulang file di Supabase SQL Editor (dan di production saat deploy).

Selama pengembangan v1, `schema.sql` diuji dengan harness PGlite (Postgres WASM + stub skema `auth`):
schema dijalankan dua kali, lalu skenario saldo, Safe-Pay, transfer + Biaya Admin, recurring, bulk,
isolasi antar user, reset, dan hapus akun diperiksa. Harness itu belum masuk ke repo.
