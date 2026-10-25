# Setup Supabase untuk Cawang

Panduan langkah demi langkah dari nol sampai aplikasi jalan di laptop, lalu deploy ke Vercel.
Semua isi database ada di satu file: [`schema.sql`](schema.sql).

## 1. Buat project Supabase

1. Masuk ke <https://supabase.com/dashboard> → **New project**.
2. Isi nama (mis. `cawang`), buat **database password** yang kuat (simpan di password manager).
3. **Region**: pilih **Southeast Asia (Singapore)**, paling dekat ke Indonesia.
4. Tunggu sampai project selesai dibuat (± 1–2 menit).

## 2. Jalankan `schema.sql`

1. Di dashboard project: menu **SQL Editor** → **New query**.
2. Salin seluruh isi [`schema.sql`](schema.sql), tempel, lalu klik **Run**.
3. Harus muncul `Success. No rows returned`.
4. Cek di **Table Editor**: ada tabel `profiles`, `accounts`, `categories`, `transactions`,
   `safe_pays`, `recurring_templates`, `recurring_occurrences`, `budgets`,
   `notification_dismissals`, dan view `account_balances`. Semua tabel bertanda **RLS enabled**.

File ini aman dijalankan ulang. Kalau nanti `schema.sql` diperbarui (fase berikutnya), cukup
ulangi langkah ini: tabel yang sudah ada tidak disentuh, fungsi/policy/trigger diganti versi baru.

## 3. Atur Auth (email + password)

1. **Authentication → Sign In / Providers → Email**: pastikan aktif, dan **Confirm email** menyala.
2. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:8888` (ganti ke domain Vercel saat deploy).
   - **Redirect URLs**, tambahkan:
     - `http://localhost:8888/**`
     - nanti juga `https://<domain-vercel-kamu>/**`
3. Email bawaan Supabase dibatasi beberapa email per jam dan hanya untuk uji coba. Untuk produksi,
   isi **Authentication → Emails → SMTP Settings** dengan SMTP sendiri (mis. Resend, Brevo).

## 4. Aktifkan login Google

1. Buka <https://console.cloud.google.com> → buat/pilih project.
2. **APIs & Services → OAuth consent screen**: pilih *External*, isi nama aplikasi (Cawang),
   email support, lalu simpan. Selama status *Testing*, tambahkan email kamu di **Test users**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**: `http://localhost:8888` (dan domain Vercel nanti)
   - **Authorized redirect URIs**: `https://<project-ref>.supabase.co/auth/v1/callback`
     (salin persis dari halaman provider Google di Supabase, langkah berikut)
4. Salin **Client ID** dan **Client secret**.
5. Di Supabase: **Authentication → Sign In / Providers → Google** → aktifkan, tempel Client ID dan
   Client secret → **Save**.

## 5. Isi `.env.local`

1. Di Supabase: **Project Settings → API Keys** (atau tombol **Connect** di atas).
2. Di folder `app/`, salin `.env.example` menjadi `.env.local`, lalu isi:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # anon key versi lama juga bisa
```

Jangan pernah memakai **secret key / service_role** di sini: nilai `VITE_*` ikut terkirim ke
browser. Keamanan data dijaga oleh RLS di database.

## 6. Jalankan aplikasi

```bash
cd app
pnpm install
pnpm dev
```

Buka <http://localhost:8888> → **Daftar** → konfirmasi email → isi onboarding (bahasa, tanggal
gajian, minimal satu akun) → masuk ke Dasbor.

Kalau env belum diisi, aplikasi menampilkan layar "Supabase belum dikonfigurasi".

## 7. Deploy ke Vercel

Panduan lengkapnya ada di [`../DEPLOY.md`](../DEPLOY.md): Root Directory `app`, environment variables,
domain di Supabase dan Google, SMTP produksi, dan daftar cek setelah deploy.

## Masalah umum

| Gejala | Penyebab & solusi |
| --- | --- |
| "Konfirmasi email kamu dulu" saat masuk | Buka tautan di email konfirmasi. Untuk uji cepat, matikan **Confirm email** sementara. |
| Email konfirmasi tidak datang | Batas email bawaan Supabase tercapai; tunggu, atau pasang SMTP sendiri. |
| Login Google kembali ke halaman error | Redirect URI di Google Cloud harus persis `https://<project-ref>.supabase.co/auth/v1/callback`, dan URL aplikasi ada di **Redirect URLs** Supabase. |
| `permission denied for table ...` | `schema.sql` belum dijalankan penuh; jalankan ulang seluruh file. |
| Kategori default tidak muncul untuk user lama | Trigger hanya berjalan untuk user baru setelah `schema.sql` dijalankan. Hapus user uji di **Authentication → Users** lalu daftar ulang. |
