# Discord Bot Dashboard

Dashboard web untuk mengelola beberapa **Discord Bot resmi** (multi-bot) yang mengirim pesan otomatis
ke satu atau lebih channel dengan interval tertentu.

> ⚠️ Ini menggunakan **bot token resmi** dari Discord Developer Portal, bukan token akun user/selfbot.
> Selfbot melanggar Discord ToS dan berisiko akun di-terminate.

## Fitur
- Tambah, edit, hapus banyak bot dalam satu dashboard
- Tiap bot punya: nama, token, daftar channel ID tujuan, isi pesan, interval kirim (detik)
- Start/Stop tiap bot secara independen
- Log realtime aktivitas pengiriman per bot
- Konfigurasi tersimpan di `data/bots.json`

## Instalasi

1. Pastikan Node.js sudah terpasang (v18+ direkomendasikan).
2. Masuk ke folder project:
   ```bash
   cd discord-bot-dashboard
   npm install
   ```
3. Jalankan server:
   ```bash
   npm start
   ```
4. Buka browser ke `http://localhost:3000`

## Cara mendapatkan Bot Token

1. Buka https://discord.com/developers/applications
2. Klik **New Application**, beri nama
3. Masuk ke tab **Bot** → klik **Reset Token** / **Copy** untuk menyalin token
4. Aktifkan intent yang diperlukan (minimal tidak perlu privileged intent untuk kirim pesan biasa)
5. Undang bot ke server lewat tab **OAuth2 > URL Generator**:
   - Scope: `bot`
   - Permission: minimal `Send Messages`, `View Channel`
   - Buka URL yang dihasilkan, pilih server tujuan

## Cara pakai dashboard

1. Klik **Tambah Bot**
2. Isi:
   - **Nama Bot**: label bebas untuk memudahkan identifikasi
   - **Bot Token**: token dari langkah di atas
   - **Channel ID tujuan**: satu atau lebih channel ID dipisah koma, contoh:
     `1421116213760626749, 1234567890123456789`
   - **Pesan**: teks yang akan dikirim
   - **Interval (detik)**: jeda antar pengiriman, default 5 detik
3. Klik **Simpan**, lalu klik **Start** pada card bot tersebut
4. Klik **Log** untuk melihat aktivitas pengiriman secara realtime

## Catatan penting

- Bot harus sudah **diundang (invite)** ke server yang memiliki channel tujuan, dan punya permission
  `Send Messages` di channel tersebut — jika tidak, pengiriman akan gagal dan tercatat di log.
- Menjalankan banyak bot sekaligus berarti banyak koneksi WebSocket aktif; pastikan resource server
  mencukupi jika jumlah bot banyak.
- Interval pengiriman terlalu singkat + volume besar bisa kena **rate limit** dari Discord API.
  Discord.js akan otomatis menangani rate limit dasar, tapi tetap disarankan interval wajar (≥5 detik).
- Data `bots.json` menyimpan token dalam bentuk **plain text** — jangan expose folder `data/` secara publik,
  dan jangan deploy dashboard ini ke internet tanpa autentikasi/login tambahan.
