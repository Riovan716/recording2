# YouTube Simulcast Integration

Panduan ini menjelaskan cara mengintegrasikan simulcast ke YouTube Live untuk aplikasi live streaming.

## Konsep Simulcast

Simulcast memungkinkan streaming ke dua platform sekaligus:
- **Browser/Electron** - Streaming ke aplikasi sendiri
- **YouTube Live** - Streaming ke YouTube secara bersamaan

```
[Browser/Electron] 
       ↓ (WebRTC)
[MediaSoup Server] ←→ [YouTube Live via RTMP]
       ↓ (WebRTC)
[Viewer Browser]
```

## Fitur yang Tersedia

### 1. Simulcast ke YouTube Live
- Stream langsung ke YouTube Live menggunakan RTMP
- Menggunakan YouTube Live Streaming API
- Mendapatkan RTMP URL dan stream key
- Broadcast URL untuk sharing

### 2. Real-time Monitoring
- Status simulcast real-time
- Link langsung ke YouTube broadcast
- Kontrol start/stop simulcast

## Setup YouTube API

### 1. Buat Google Cloud Project
1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang ada
3. Aktifkan YouTube Data API v3 dan YouTube Live Streaming API

### 2. Buat OAuth 2.0 Credentials
1. Pergi ke "Credentials" di Google Cloud Console
2. Klik "Create Credentials" > "OAuth 2.0 Client IDs"
3. Pilih "Web application"
4. Tambahkan redirect URI: `http://localhost:3000/auth/youtube/callback`
5. Simpan Client ID dan Client Secret

### 3. Konfigurasi Environment Variables
Buat file `.env` di folder `backend/` dengan konfigurasi berikut:

```env
# YouTube API Configuration
YOUTUBE_CLIENT_ID=your_youtube_client_id_here
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret_here
YOUTUBE_REDIRECT_URI=http://localhost:3000/auth/youtube/callback
```

## Instalasi Dependencies

```bash
cd backend
npm install googleapis
```

## Database Migration

Jalankan migrasi untuk menambahkan kolom YouTube:

```bash
npm run migrate:add-youtube-simulcast
```

## Cara Penggunaan

### 1. Start Simulcast
1. Mulai live streaming di aplikasi
2. Klik tombol "Start Simulcast" di komponen YouTube Simulcast
3. Autentikasi dengan YouTube jika belum pernah dilakukan
4. Stream akan otomatis dikirim ke YouTube Live

### 2. Monitor Simulcast
- Status simulcast ditampilkan real-time
- Link YouTube broadcast tersedia untuk sharing
- Kontrol start/stop simulcast

### 3. Stop Simulcast
1. Klik tombol "Stop Simulcast"
2. Stream ke YouTube akan dihentikan
3. Stream ke aplikasi sendiri tetap berjalan

## API Endpoints

### YouTube Simulcast
- `GET /api/youtube/status` - Cek status integrasi YouTube
- `GET /api/youtube/auth/url` - Dapatkan URL autentikasi
- `GET /api/youtube/auth/callback` - Handle callback autentikasi
- `POST /api/youtube/simulcast/start` - Start simulcast ke YouTube
- `POST /api/youtube/simulcast/stop` - Stop simulcast
- `GET /api/youtube/simulcast/status/:roomId` - Status simulcast untuk room
- `GET /api/youtube/simulcast/all` - Semua simulcast aktif

### Contoh Request Start Simulcast
```javascript
const response = await fetch('/api/youtube/simulcast/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN',
  },
  body: JSON.stringify({
    roomId: 'room_123',
    title: 'Live Stream Title',
    description: 'Live stream description'
  })
});
```

### Contoh Request Stop Simulcast
```javascript
const response = await fetch('/api/youtube/simulcast/stop', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN',
  },
  body: JSON.stringify({
    roomId: 'room_123'
  })
});
```

## Arsitektur Teknis

### 1. MediaSoup Server
- Menangani WebRTC streaming
- Relay stream ke YouTube via RTMP
- Menggunakan FFmpeg untuk konversi format

### 2. YouTube Live Streaming API
- Membuat live stream dan broadcast
- Mendapatkan RTMP URL dan stream key
- Mengelola lifecycle broadcast

### 3. FFmpeg Process
- Menangkap stream dari MediaSoup
- Mengkonversi ke format RTMP
- Mengirim ke YouTube Live

## Troubleshooting

### 1. YouTube API Not Configured
- Pastikan environment variables sudah di-set
- Cek apakah Client ID dan Client Secret valid
- Pastikan YouTube APIs sudah diaktifkan

### 2. Authentication Failed
- Pastikan redirect URI sesuai
- Cek OAuth consent screen
- Pastikan aplikasi sudah di-verifikasi

### 3. Simulcast Failed
- Pastikan FFmpeg terinstall
- Cek koneksi internet
- Pastikan RTMP URL valid

### 4. FFmpeg Process Error
- Cek log FFmpeg untuk detail error
- Pastikan format video didukung
- Cek resource system (CPU, memory)

## Keamanan

1. **Jangan commit credentials** ke repository
2. **Gunakan environment variables** untuk API keys
3. **Implementasi rate limiting** untuk mencegah abuse
4. **Validasi input** sebelum mengirim ke YouTube API
5. **Gunakan HTTPS** untuk production

## Batasan YouTube API

1. **Quota**: YouTube API memiliki batas quota harian
2. **Rate Limiting**: Maksimal 100 requests per 100 detik per user
3. **Duration**: Maksimal 12 jam untuk live streaming
4. **Format**: Hanya format video tertentu yang didukung
5. **Quality**: Kualitas video bergantung pada bandwidth

## Monitoring dan Logging

Aplikasi menyediakan logging untuk:
- Status autentikasi YouTube
- Proses simulcast
- FFmpeg process status
- Error handling dan debugging

Cek console log untuk informasi detail tentang proses simulcast.

## Performance Considerations

### 1. Resource Usage
- FFmpeg process menggunakan CPU dan memory
- Monitor resource usage secara berkala
- Restart process jika diperlukan

### 2. Network Bandwidth
- Simulcast memerlukan bandwidth tambahan
- Pastikan koneksi internet stabil
- Monitor bandwidth usage

### 3. Latency
- RTMP memiliki latency lebih tinggi dari WebRTC
- YouTube Live memiliki delay 10-30 detik
- Pertimbangkan untuk penggunaan real-time

## Best Practices

### 1. Error Handling
- Implementasi retry mechanism
- Fallback ke streaming lokal jika simulcast gagal
- Monitor dan alert untuk error

### 2. User Experience
- Berikan feedback yang jelas
- Progress indicator untuk operasi panjang
- Graceful degradation jika fitur tidak tersedia

### 3. Maintenance
- Regular cleanup FFmpeg processes
- Monitor disk space untuk logs
- Update dependencies secara berkala

## Testing

### 1. Unit Tests
- Test YouTube API integration
- Test simulcast start/stop
- Test error handling

### 2. Integration Tests
- Test end-to-end simulcast flow
- Test dengan berbagai format video
- Test dengan berbagai kualitas internet

### 3. Load Tests
- Test dengan multiple simulcast
- Test resource usage
- Test stability jangka panjang

## Deployment

### 1. Production Environment
- Gunakan HTTPS untuk semua komunikasi
- Set environment variables dengan aman
- Monitor resource usage

### 2. Scaling Considerations
- Multiple FFmpeg processes
- Load balancing untuk simulcast
- Database optimization

### 3. Backup and Recovery
- Backup configuration
- Recovery procedures
- Disaster recovery plan
