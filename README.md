# 🍵 MatchaKu — Web Pemesanan Matcha dengan Asisten AI

Project full-stack untuk katalog dan pemesanan produk MatchaKu. Frontend React/Vite/Tailwind; backend Express; database MongoDB (Atlas disarankan).

## Fitur

- Katalog dan detail produk (Hinoka, Mori, Kinko, Corn Milk Matcha, Ubee Matcha)
- Keranjang per akun dan pilihan Hot Whisked / Cold Whisked, No Sweet / Less Sweet / Normal
- Checkout Pickup atau Delivery, review, unggah bukti QRIS (JPG/PNG/WebP, maks. 5 MB)
- Verifikasi pembayaran manual oleh admin. **Order hanya dibuat setelah pembayaran disetujui.**
- Riwayat Pembayaran pelanggan (termasuk alasan penolakan), Pesanan Saya, dan panel admin order/produk/stok
- Asisten MatchaKu dengan integrasi AI opsional; tanpa API key tetap bisa menjawab FAQ katalog dan pemesanan
- Harga dan stok checkout diverifikasi lagi di backend, bukan dipercaya dari browser

## 1. Persiapan

Gunakan Node.js versi 22.12+ atau versi 24, dan akun/database MongoDB Atlas.

```powershell
cd matcha-umkm\backend
npm install
Copy-Item .env.example .env
```

Buka `backend/.env` lalu isi **MONGODB_URI** MongoDB Atlas yang benar dan **JWT_SECRET** yang kuat dan acak. Kalau sudah mempunyai `.env` dari project MatchaKu yang sebelumnya, boleh gunakan konfigurasi lama tersebut (jangan dimasukkan ke GitHub). `FRONTEND_URL` default `http://localhost:5173`.

Untuk fitur AI, isi `OPENAI_API_KEY` di `.env` backend, **bukan** frontend. `OPENAI_MODEL` boleh dibiarkan `gpt-4.1-mini` sesuai contoh; sesuaikan jika model tersebut tidak tersedia di akun API. Penggunaan API AI dapat menimbulkan biaya dan memerlukan akses ke layanan model. Bila key kosong atau AI gagal, chatbot otomatis menjawab menggunakan FAQ dari katalog database.

## 2. Jalankan backend

Di jendela PowerShell pertama:

```powershell
cd matcha-umkm\backend
npm run seed
npm run dev
```

`npm run seed` cukup dijalankan bila perlu membuat / memperbarui data katalog awal. Script ini menggunakan **upsert**: tidak menghapus produk lama atau mereset stok yang sudah ada. Backend dapat diakses di `http://localhost:5000`.

## 3. Jalankan frontend

Di jendela PowerShell kedua:

```powershell
cd matcha-umkm\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Buka `http://localhost:5173`. Bila menyimpan ZIP langsung ke folder dengan nama `matcha-umkm`, sesuaikan lokasi `cd` dengan folder tersebut.

## 4. QRIS merchant

**Belum ada kode QRIS merchant asli dalam source.** Halaman pembayaran akan menampilkan peringatan mode demo. Jangan gunakan untuk menerima pembayaran riil sebelum konfigurasi merchant.

Saat sudah punya QRIS yang sah dari pengelola UMKM:

1. Simpan gambar QRIS ke `frontend/public/qris-matchaku.png`.
2. Edit `frontend/.env`: `VITE_QRIS_IMAGE_URL=/qris-matchaku.png`.
3. Mulai ulang frontend (`npm run dev`).

Pembayaran ini bukan gateway otomatis: admin harus mengecek dana masuk dan bukti secara manual sebelum menekan Terima Pembayaran.

## 5. Mengatur akun admin

Pendaftaran publik selalu membuat akun `CUSTOMER` untuk mencegah pengguna bebas membuat akun admin. Daftarkan dulu pengguna di halaman Registrasi, kemudian set role pada database MongoDB milik sendiri (misalnya menggunakan MongoDB Atlas Data Explorer atau mongosh):

```javascript
db.users.updateOne(
  { email: "alamat-admin@example.com" },
  { $set: { role: "ADMIN" } }
)
```

Gunakan email akun admin Anda sendiri. Logout dan login ulang setelah mengubah role agar token JWT mendapatkan role terbaru.

## 6. Alur uji aplikasi

1. Sebagai customer, daftar/login, pilih produk, tambah ke keranjang, pilih gaya dan kemanisan.
2. Checkout Pickup/Delivery, review, lalu upload bukti pembayaran gambar **khusus untuk simulasi** bila belum ada QRIS riil.
3. Buka Riwayat Pembayaran: status awal harus `PAYMENT_REVIEW`. Order **belum** muncul di Pesanan Saya.
4. Login sebagai admin, buka `/admin/payments` dan periksa bukti pembayaran. Jika sesuai, pilih **Terima Pembayaran**; jika tidak, pilih **Tolak** dan isi alasan.
5. Untuk pembayaran disetujui, order otomatis dibuat, stok produk dikurangi, dan status awal `CONFIRMED`. Admin bisa mengubah progres di `/admin/orders` dan katalog/stok di `/admin/products`.
6. Login kembali sebagai customer. Status pembayaran bisa dilihat di `/payments`, dan proses pesanan di `/orders`.
7. Klik **Tanya MatchaKu** di kanan bawah untuk menanyakan harga produk, pilihan minuman, cara pesan, atau QRIS.

## 7. Pengujian

```powershell
cd backend
npm test
```

Pengujian mencakup autentikasi endpoint admin, penolakan manipulasi harga, alur persetujuan transaksi dengan mock database, dan respons FAQ. Pengujian ini **bukan** pengganti pengujian end-to-end pada MongoDB Atlas sebenarnya. Setelah `npm install` di frontend, cek juga `npm run build`.

## Catatan keamanan dan batasan

- `backend/.env`, `frontend/.env`, `node_modules`, dan `backend/uploads` **tidak disertakan** dalam ZIP hasil revisi. File `.env` dan upload lama tidak boleh dipublikasikan.
- Server menggunakan transaksi MongoDB saat admin menyetujui pembayaran agar order, status PAID, dan pengurangan stok konsisten. Untuk pengujian alur ini gunakan MongoDB Atlas/replica set yang mendukung transaksi.
- Stok dikurangi saat **persetujuan pembayaran**, bukan saat bukti pertama kali dikirim. Admin akan menerima penolakan `409` jika stok sudah tidak cukup. Perlukan koordinasi sebelum melanjutkan kasus pembayaran yang terlanjur ditransfer.
- Belum ada payment gateway otomatis, ongkos kirim otomatis, sistem refund, notifikasi realtime, atau integrasi pengiriman nyata. Fitur ini perlu pengembangan tambahan untuk penggunaan operasional penuh.
- Pembayaran tetap harus diperiksa secara manual; pengunggahan bukti tidak membuktikan uang benar-benar masuk.
- `OPENAI_API_KEY` hanya boleh tersimpan di backend; batasi penggunaan publik chatbot dan rotasi key bila pernah terekspos.
