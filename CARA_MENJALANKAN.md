# Cara Menjalankan Recording App

## Development Mode

### 1. Jalankan Backend
```bash
cd backend
npm start
```

### 2. Jalankan Frontend + Electron
```bash
cd frontend
npm run dev
```

## Production Build

### Build untuk Windows
```bash
cd frontend
npm run build:win
```

### Build untuk macOS
```bash
cd frontend
npm run build:mac
```

### Build untuk Linux
```bash
cd frontend
npm run build:linux
```

## Deployment

Untuk deployment, Anda hanya perlu:
1. Deploy backend ke server
2. Build frontend dengan electron untuk distribusi desktop

Backend akan berjalan di server, frontend akan berjalan sebagai aplikasi desktop yang terhubung ke backend.
