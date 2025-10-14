# Panduan Setup Google OAuth untuk YouTube API

## Masalah yang Dihadapi
Error 403: access_denied - "The developer hasn't given you access to this app"

## Solusi 1: Tambahkan Test Users (Recommended untuk Development)

### Langkah-langkah:

1. **Buka Google Cloud Console**
   - Kunjungi: https://console.cloud.google.com
   - Login dengan akun Google yang memiliki akses ke project

2. **Pilih Project yang Benar**
   - Pastikan project "snap-room-474604" dipilih
   - Jika tidak muncul, cek apakah Anda memiliki akses ke project tersebut

3. **Navigasi ke OAuth Consent Screen**
   - Di menu kiri, klik "APIs & Services"
   - Pilih "OAuth consent screen"

4. **Tambahkan Test Users**
   - Scroll ke bawah ke bagian "Test users"
   - Klik tombol "ADD USERS"
   - Masukkan email Google yang akan digunakan untuk login:
     - Email yang Anda gunakan untuk login ke aplikasi
     - Bisa lebih dari satu email (pisahkan dengan koma)
   - Klik "SAVE"

5. **Verifikasi Status**
   - Pastikan status aplikasi adalah "Testing"
   - Test users yang ditambahkan akan muncul di list

## Solusi 2: Publish Aplikasi (Untuk Production)

### Jika ingin menggunakan aplikasi secara public:

1. **Siapkan Informasi Aplikasi**
   - Lengkapi semua informasi di OAuth consent screen
   - Upload logo aplikasi
   - Tambahkan domain aplikasi
   - Lengkapi privacy policy dan terms of service

2. **Submit untuk Review**
   - Ubah status dari "Testing" ke "In production"
   - Submit aplikasi untuk review Google
   - Proses review bisa memakan waktu beberapa hari

## Informasi Project Saat Ini

- **Project ID**: snap-room-474604
- **Client ID**: YOUR_YOUTUBE_CLIENT_ID
- **Client Secret**: YOUR_YOUTUBE_CLIENT_SECRET
- **Redirect URI**: urn:ietf:wg:oauth:2.0:oob (Desktop OAuth flow)

## Testing Setelah Setup

1. **Restart Server Backend**
   ```bash
   cd backend
   npm start
   ```

2. **Test di Frontend**
   - Buka aplikasi di browser
   - Klik "Authenticate with YouTube"
   - Login dengan email yang sudah ditambahkan sebagai test user

3. **Verifikasi Token**
   - Setelah login berhasil, token akan tersimpan
   - Status YouTube API akan berubah menjadi "Ready"

## Troubleshooting

### Jika masih error 403:
- Pastikan email yang digunakan sudah ditambahkan sebagai test user
- Cek apakah project yang dipilih sudah benar
- Pastikan OAuth consent screen sudah dikonfigurasi dengan benar

### Jika error "redirect_uri_mismatch":
- Pastikan redirect URI di Google Cloud Console sama dengan yang di aplikasi
- Saat ini menggunakan: `urn:ietf:wg:oauth:2.0:oob` (Desktop OAuth flow)

### Jika error "invalid_client":
- Pastikan Client ID dan Client Secret sudah benar
- Cek apakah credentials sudah di-copy dengan benar

## Catatan Penting

- Untuk development, gunakan Solusi 1 (Test Users)
- Untuk production, gunakan Solusi 2 (Publish App)
- Test users hanya bisa login jika aplikasi dalam status "Testing"
- Setelah aplikasi dipublish, semua user Google bisa login
