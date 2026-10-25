# Deploy Cawang ke Vercel

Panduan dari repo di laptop sampai aplikasi online di `https://<nama>.vercel.app`, termasuk login
Google dan PWA. Pastikan setup Supabase di [`supabase/README.md`](supabase/README.md) sudah jalan di
lokal lebih dulu.

## 1. Siapkan repo

1. Inisialisasi git di folder root proyek (yang berisi `app/`, `docs/`, `GLOSSARY.md`) bila belum.
2. Pastikan `.env` / `.env.local` **tidak** ikut ter-commit (sudah ada di `app/.gitignore`).
3. Push ke GitHub (repo privat juga bisa).

## 2. Buat project di Vercel

1. <https://vercel.com/new> → **Import** repo tadi.
2. **Root Directory**: pilih `app`.
3. **Framework Preset**: Vite (terdeteksi otomatis).
   - Build Command: `pnpm build`
   - Output Directory: `dist`
   - Install Command: `pnpm install`
4. **Environment Variables** (untuk Production dan Preview):

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable key (atau anon key lama) |

5. **Deploy**. `app/vercel.json` sudah mengarahkan semua route ke `index.html`, jadi membuka
   `/dashboard` langsung atau me-refresh halaman tidak menghasilkan 404.

## 3. Daftarkan domain di Supabase

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://<nama>.vercel.app` (domain produksi; tautan di email konfirmasi memakai ini).
- **Redirect URLs**, tambahkan:
  - `https://<nama>.vercel.app/**`
  - `https://*-<akun-vercel>.vercel.app/**` bila ingin login juga jalan di preview deployment
  - tetap simpan `http://localhost:8888/**` untuk development

## 4. Daftarkan domain di Google Cloud (login Google)

Google Cloud Console → **APIs & Services → Credentials** → OAuth client yang dipakai Supabase:

- **Authorized JavaScript origins**: tambahkan `https://<nama>.vercel.app`.
- **Authorized redirect URIs**: tetap `https://<project-ref>.supabase.co/auth/v1/callback`
  (tidak berubah, karena Google mengembalikan user ke Supabase, lalu Supabase ke aplikasi).
- Saat siap dipakai orang lain, ubah **OAuth consent screen** dari *Testing* ke *In production*.

## 5. Email produksi

Email bawaan Supabase hanya untuk uji coba (dibatasi beberapa email per jam). Sebelum dibuka untuk
umum, isi **Authentication → Emails → SMTP Settings** dengan penyedia SMTP sendiri (mis. Resend,
Brevo, Postmark), dan sesuaikan template email konfirmasi/reset di **Emails → Templates**.

## 6. Cek setelah deploy

- [ ] Buka domain → landing page tampil, ganti bahasa dan tema berfungsi.
- [ ] Daftar akun baru → email konfirmasi datang → tautan membuka `/dashboard` → onboarding muncul.
- [ ] Login Google kembali ke `/dashboard`.
- [ ] Lupa kata sandi → tautan membuka `/reset-password` dan bisa menyimpan kata sandi baru.
- [ ] Refresh di `/transactions` tidak 404.
- [ ] Di HP (Chrome/Safari): menu **Add to Home Screen / Install app** muncul; aplikasi terpasang
      membuka `/dashboard`.
- [ ] Mode pesawat: data terakhir tetap tampil dengan banner offline; menyimpan perubahan ditolak.

## Pembaruan berikutnya

- Push ke branch utama → Vercel otomatis build dan deploy.
- Bila `supabase/schema.sql` berubah, jalankan ulang seluruh file di SQL Editor **sebelum** atau
  bersamaan dengan deploy kode yang membutuhkannya. File ini aman dijalankan berulang.
- Service worker memakai `autoUpdate`: pengguna mendapat versi baru saat membuka aplikasi lagi.
