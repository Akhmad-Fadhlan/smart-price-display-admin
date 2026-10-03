# PRD — Smart Price Display Management Dashboard

**Versi:** 1.1
**Status:** Development Ready
**Dokumen pendamping:** `BE.md` v1.1 (spesifikasi backend, skema DB, API)
**Stack:** Next.js + TypeScript (frontend + backend), Supabase (PostgreSQL, Auth, Realtime), Vercel
**Perangkat:** LilyGO T-Display-S3, ESP32-C6 LCD 1.47"

---

# 0. Ringkasan Perubahan dari v1.0

Bagian ini merangkum bagian PRD v1.0 yang ambigu atau saling bertentangan, beserta keputusan yang diambil di v1.1. Semua keputusan sudah tercermin di `BE.md` v1.1.

| # | Topik | Masalah di v1.0 | Keputusan v1.1 |
| - | ----- | --------------- | -------------- |
| 1 | Cara device menerima update | §22 menggambarkan Realtime langsung ke device, padahal firmware tidak seharusnya memegang kunci Supabase | Device memakai **heartbeat + polling** ke API Next.js. Supabase Realtime hanya untuk **dashboard** |
| 2 | Registrasi device | Hanya ada daftar kolom | Admin mendaftarkan device di dashboard, lalu mendapat **device token** (tampil sekali) untuk ditanam di firmware |
| 3 | Format harga | Contoh `Rp5.000` tanpa tipe data | Disimpan sebagai **integer rupiah**. Format `Rp5.000` dibuat saat render |
| 4 | Font & layout | §15 (font_size, alignment) dan §16 (fontSize, align di JSON) tumpang tindih; ukuran font tidak terdefinisi | Font memakai **preset** (small–xlarge). Layout JSON memakai **persen** (0–100) agar satu profile cocok di dua ukuran layar. Ada mode `auto` dan `custom` |
| 5 | Assignment ke group | §21 hanya punya `device_id`, jadi device yang masuk group belakangan tidak otomatis ikut profile | Assignment bisa menargetkan **group** atau **device**. Profile efektif sebuah device ditentukan dari group-nya |
| 6 | Custom profile LilyGO | Disebut di §11, tetapi tidak ada modelnya | Profile bertanda `is_custom` dan dimiliki satu device |
| 7 | Status online/offline | `status` disimpan di tabel device | Status **dihitung** dari `last_seen` (tanpa cron) |
| 8 | Status sync | Empat status tanpa aturan transisi | Ada **state machine** yang jelas (§11) |
| 9 | Versioning | "Setiap perubahan profile menaikkan version" | Versi naik **hanya jika konfigurasi tampilan berubah**. Ditambah **optimistic locking** untuk mencegah tabrakan antar-admin |
| 10 | Akses akun Google | Semua akun Google bisa login, tetapi role hanya Admin | Login hanya memberi akses jika email ada di **allowlist**. Selain itu role `pending` |
| 11 | Audit log | Tabel ada di §20, fiturnya di §30 (future) | MVP **menulis** log. Halaman viewer menyusul |
| 12 | Supabase Storage | Muncul di arsitektur tanpa fungsi | **Tidak dipakai di MVP** (dicadangkan untuk logo/gambar/OTA) |
| 13 | Menu Settings | Ada di navigasi tanpa isi | MVP: info akun dan logout |
| 14 | Server Actions | Disebut sebagai backend bersama Route Handlers | **Route Handlers** adalah kontrak API utama. Server Actions hanya untuk login/logout |
| 15 | Hapus group / profile yang dipakai | Tidak dijelaskan | Ditolak (`409`) kecuali `force=true` |
| 16 | Status group | Hanya online/offline | `online` / `partial` / `offline` |
| 17 | Ukuran group | "Dua ESP32-C6" terbaca sebagai batas | Dua adalah kasus pakai awal, **bukan batas** |
| 18 | Sleep timeout | Ada field tanpa perilaku. Kedua device tidak punya tombol, jadi layar yang mati tidak bisa dibangunkan | Field **dihapus dari MVP**. Layar selalu menyala. Jadwal layar mati/nyala dicatat sebagai fitur lanjutan (device selalu polling, sehingga bisa dibangunkan dari server) |
| 19 | WiFi | Tidak dijelaskan | SSID dan password **ditanam di firmware**. Tidak ada provisioning dari dashboard |
| 20 | Catu daya dan input fisik | Tidak dijelaskan | Device diasumsikan **bertenaga USB, selalu menyala, tanpa tombol**. Interval heartbeat tetap 20 detik. Pemulihan dilakukan dengan flash ulang via USB |
| 21 | Resolusi layar | "Perlu diverifikasi" | ESP32-C6 LCD 1.47": 172×320 (spesifikasi Waveshare). LilyGO T-Display-S3: 170×320. Dipakai sebagai konstanta |

---

# 1. Product Overview

Smart Price Display Management Dashboard adalah aplikasi web untuk mengelola **label harga digital berbasis ESP32** dari satu dashboard.

Admin dapat mengatur:

* nama produk, harga, unit, teks promo
* ukuran font, ketebalan, alignment
* posisi elemen (layout)
* brightness dan rotasi

## 1.1 Perangkat

| Perangkat | Layar | Resolusi portrait* | Cara dikelola |
| --------- | ----- | ------------------ | ------------- |
| ESP32-C6 LCD 1.47" | 1.47" | 172 × 320 | Dikelompokkan dalam **group**. Seluruh anggota group memakai profile yang sama |
| LilyGO T-Display-S3 | 1.9" | 170 × 320 | Berdiri sendiri. Boleh memakai profile bersama atau profile custom |

\* Resolusi mengikuti spesifikasi pabrikan (panel ST7789). Nilainya disimpan di satu file konstanta yang dipakai bersama oleh preview dan firmware.

**Asumsi hardware (MVP):** kedua perangkat bertenaga USB dan menyala terus. Keduanya diperlakukan **tanpa tombol**: tidak ada input fisik yang bisa dipakai untuk bangun-tidur layar, reset pengaturan, atau konfigurasi. Seluruh pengaturan berasal dari server, dan pemulihan darurat dilakukan dengan flash ulang lewat USB.

## 1.2 Istilah

| Istilah | Arti |
| ------- | ---- |
| **Device** | Satu perangkat fisik dengan `device_uid` unik |
| **Group** | Kumpulan device bertipe sama (MVP: ESP32-C6) yang dikelola bersama |
| **Display Profile** | Paket konfigurasi tampilan yang bisa dipakai banyak target |
| **Display Config** | Isi konfigurasi sebuah profile (1 profile = 1 config) |
| **Assignment** | Hubungan antara profile dan target (group atau device) |
| **Target** | Group atau device yang menerima profile |
| **Profile efektif** | Profile yang benar-benar berlaku untuk sebuah device |
| **Version** | Nomor revisi konfigurasi sebuah profile |
| **Sync** | Proses device mengambil dan memakai versi terbaru |
| **Heartbeat** | Sinyal berkala dari device ke server |

---

# 2. Tujuan dan Non-Goals

## 2.1 Tujuan

Admin dapat:

1. Login dengan Google.
2. Melihat seluruh device dan statusnya.
3. Mendaftarkan device baru.
4. Mengelompokkan ESP32-C6.
5. Membuat, mengubah, menduplikasi, dan menghapus Display Profile.
6. Mengatur harga dan tampilan dengan live preview.
7. Menghubungkan profile ke group atau device.
8. Memakai satu profile untuk banyak device.
9. Memberi LilyGO profile berbeda atau custom.
10. Mengetahui apakah konfigurasi di device sudah versi terbaru.

## 2.2 Non-Goals (MVP)

* Multi-user dengan role berbeda (Editor, Viewer)
* Multi-outlet
* Jadwal harga, bulk update, OTA firmware
* Gambar/logo di layar
* Provisioning WiFi dari dashboard atau captive portal (SSID/password ditanam di firmware)
* Sleep timeout / jadwal layar mati (perangkat tidak punya tombol untuk membangunkan layar)
* Mode baterai / hemat daya
* Halaman audit log (datanya sudah dicatat)

---

# 3. Technology Stack dan Arsitektur

| Lapisan | Teknologi |
| ------- | --------- |
| Frontend | Next.js (App Router), TypeScript, React, Tailwind CSS, shadcn/ui |
| Backend | Next.js **Route Handlers** (`/api/*`). Server Actions hanya untuk login/logout |
| Database | Supabase PostgreSQL dengan RLS |
| Auth | Supabase Auth + Google OAuth |
| Realtime | Supabase Realtime (hanya untuk dashboard) |
| Validasi | Zod |
| Deployment | Vercel (web) + Supabase (data) |

Tidak ada Express atau server backend terpisah.

```text
                ADMIN (Browser)                         DEVICE (ESP32-C6 / LilyGO)
                      │                                           │
          session cookie (Supabase)                     device token (HTTPS)
                      │                                           │
                      ▼                                           ▼
        ┌──────────────────────────── VERCEL / Next.js ────────────────────────────┐
        │  React Frontend        Route Handlers  /api/*        /api/device/*        │
        └──────────────┬──────────────────────┬─────────────────────┬──────────────┘
                       │ Realtime (subscribe) │ query               │ service role
                       ▼                      ▼                     ▼
                ┌──────────────────────────────────────────────────────────┐
                │                       SUPABASE                           │
                │         PostgreSQL (RLS) · Auth · Realtime               │
                └──────────────────────────────────────────────────────────┘
```

Aturan penting:

* Admin berkomunikasi dengan `/api/*` memakai session Google.
* Device berkomunikasi **hanya** dengan `/api/device/*` memakai device token.
* Device tidak pernah mengakses Supabase secara langsung.
* Dashboard menerima perubahan status lewat Realtime tanpa refresh.

---

# 4. Role dan Akses

MVP hanya memakai role **Admin**.

```text
Google login
     │
     ▼
Email ada di admin_allowlist? ── ya ──► role = admin   ──► /dashboard
     │
     └── tidak ──► role = pending ──► halaman "Menunggu persetujuan akses"
```

Admin pertama didaftarkan langsung di database (lihat `BE.md` §5.2). Struktur role disiapkan untuk pengembangan: `owner`, `admin`, `editor`, `viewer`.

Admin dapat: login, melihat dashboard, mengelola device, group, profile, assignment, display, serta melihat status sync.

---

# 5. Konsep Inti dan Aturan Bisnis

## 5.1 Model

```text
Group (ESP32-C6)
  ├── Device C6 #01
  └── Device C6 #02

Display Profile ──(1:1)── Display Config
        │
        └── Assignment ──► Target = Group  atau  Device

Device ──(1:1)── Sync Status
```

## 5.2 Aturan bisnis

| Kode | Aturan |
| ---- | ------ |
| BR-01 | `device_uid` unik. Format: huruf kapital, angka, dan `-` (3–40 karakter), contoh `ESP32C6-A001`, `LILYGO-S3-001` |
| BR-02 | Group hanya untuk device bertipe sama. MVP: hanya `esp32_c6`. Satu device paling banyak satu group. Jumlah anggota tidak dibatasi |
| BR-03 | **Profile efektif**: device dalam group mengikuti profile milik group. Device tanpa group mengikuti assignment atas dirinya sendiri |
| BR-04 | Satu target hanya punya **satu** assignment aktif. Assign baru menggantikan yang lama |
| BR-05 | Satu profile boleh dipakai banyak target |
| BR-06 | Device **dalam group** tidak boleh punya assignment sendiri. Saat device dimasukkan ke group, assignment individualnya dinonaktifkan. Saat dikeluarkan dari group, device menjadi **tanpa profile** sampai di-assign lagi |
| BR-07 | **Custom profile**: profile milik tepat satu device yang tidak berada dalam group. Tidak muncul di daftar profile umum dan tidak bisa dipakai target lain |
| BR-08 | `version` profile naik **hanya** jika Display Config berubah. Mengubah nama/deskripsi profile tidak menaikkan versi. Profile baru dan hasil duplikat mulai dari versi 1 |
| BR-09 | Simpan config memakai **optimistic locking**: request membawa `expected_version`. Jika versi di server sudah berbeda → ditolak (`VERSION_CONFLICT`) dan admin diminta memuat ulang |
| BR-10 | Menghapus profile yang masih dipakai ditolak. Dengan `force=true`, assignment dinonaktifkan dan device terkait menjadi tanpa profile |
| BR-11 | Menghapus group yang masih punya device ditolak. Dengan `force=true`, device dikeluarkan dari group (lihat BR-06) |
| BR-12 | Harga adalah **bilangan bulat rupiah**, tanpa desimal |
| BR-13 | Status online dihitung dari `last_seen`: **online** jika heartbeat terakhir ≤ 60 detik yang lalu |
| BR-14 | Perubahan konfigurasi, assignment, atau perpindahan group otomatis membuat status sync device terkait menjadi `pending` |

---

# 6. Authentication

Halaman: `/login`

```text
┌──────────────────────────────┐
│        PRICE DISPLAY         │
│          DASHBOARD           │
│   Manage your smart display  │
│ ┌──────────────────────────┐ │
│ │    Continue with Google  │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

Alur: `User → Google OAuth → Supabase Auth → /auth/callback → session → cek role → /dashboard`.

Aturan:

* Belum login → semua halaman dashboard dan `/api/*` admin diarahkan ke `/login` (atau `401`).
* Role `pending` → halaman informasi akses, tanpa data apa pun.
* Session bertahan setelah refresh halaman.
* Logout menghapus session.

---

# 7. Halaman dan Navigasi

| Route | Fungsi |
| ----- | ------ |
| `/login` | Login Google |
| `/dashboard` | Ringkasan |
| `/devices` | Daftar device |
| `/devices/[id]` | Detail device |
| `/groups` | Daftar group |
| `/groups/[id]` | Detail group dan anggotanya |
| `/display-profiles` | Daftar profile |
| `/display-profiles/new` | Buat profile |
| `/display-profiles/[id]/editor` | Editor profile |
| `/settings` | Info akun dan logout |

```text
┌──────────────────────┐
│ PRICE DISPLAY        │
├──────────────────────┤
│ Dashboard            │
│ Devices              │
│ Groups               │
│ Display Profiles     │
│ ──────────────────── │
│ Settings             │
│ 👤 Admin · Logout    │
└──────────────────────┘
```

---

# 8. Spesifikasi Halaman

## 8.1 Dashboard (`/dashboard`)

Kartu ringkasan:

| Kartu | Arti |
| ----- | ---- |
| Total Devices | Jumlah device (setiap ESP32-C6 dihitung satu) |
| Online / Offline | Berdasarkan BR-13 |
| Groups | Jumlah group |
| Pending Sync | Device dengan status `pending`, `syncing`, atau `failed` |

Daftar status:

```text
ESP32-C6 Group 01     ● Online   2 Devices
LilyGO #01            ● Online   ✓ Synced
LilyGO #02            ○ Offline  ⟳ Pending
```

**Status group:** `online` (semua anggota online), `partial` (sebagian), `offline` (tidak ada yang online).

Semua angka dan status diperbarui otomatis lewat Realtime.

## 8.2 Devices (`/devices`)

| Device | Type | Group | Profile | Status | Sync | Last Seen |
| ------ | ---- | ----- | ------- | ------ | ---- | --------- |
| C6 #01 | ESP32-C6 | C6 Group 01 | Es Teh | Online | Synced | 5 dtk |
| C6 #02 | ESP32-C6 | C6 Group 01 | Es Teh | Online | Synced | 8 dtk |
| LilyGO #01 | LilyGO | — | Es Teh | Online | Synced | 3 dtk |
| LilyGO #02 | LilyGO | — | Kopi Susu (custom) | Offline | Pending | 5 mnt |

Fitur: filter (tipe, group, status), pencarian nama/UID, tombol **Tambah Device**.

Kolom Profile menampilkan **profile efektif** (BR-03), termasuk yang berasal dari group.

## 8.3 Registrasi Device

Alur:

```text
Admin klik "Tambah Device"
   │ isi: device_uid, nama, tipe, group (opsional)
   ▼
Sistem membuat device + device token
   │
   ▼
Token ditampilkan SEKALI  ──►  admin menanam uid + token di firmware
   │
   ▼
Device mengirim heartbeat pertama  ──►  status Online
```

Data device: `device_uid`, `name`, `device_type`, `group_id`, `firmware_version`, `last_seen`, `ip_address`, `battery` (opsional, hanya jika perangkat melaporkannya), `signal_strength`, `created_at`, `updated_at`.

Jika token hilang, admin membuat token baru (**Rotate Token**). Token lama langsung tidak berlaku.

## 8.4 Detail Device (`/devices/[id]`)

Menampilkan: info device, status, heartbeat terakhir (IP, sinyal, firmware, serta baterai bila ada), profile efektif beserta asalnya (group / device / custom), status sync (versi server vs versi di device), serta tombol:

* **Ubah group** (khusus ESP32-C6)
* **Ganti profile** (khusus device tanpa group)
* **Buat profile custom** (khusus device tanpa group): menyalin profile saat ini menjadi profile milik device ini
* **Force re-sync**
* **Rotate token**
* **Hapus device**

## 8.5 Groups (`/groups`, `/groups/[id]`)

```text
ESP32-C6 Group 01        ● Online
├── ESP32-C6 #01         ● Online   ✓ Synced
└── ESP32-C6 #02         ● Online   ✓ Synced
Profile: Es Teh (v3)
```

Admin dapat membuat, mengubah, menghapus group, serta menambah/mengeluarkan anggota.

Jika profile group diubah, semua anggota otomatis mendapat konfigurasi yang sama. Admin tidak mengedit device satu per satu.

## 8.6 Display Profiles (`/display-profiles`)

```text
┌──────────────────────────────────────────┐
│ Es Teh                         v3        │
│ Rp5.000                                  │
│ 3 Devices                                │
│                [Edit] [Duplicate] [Assign]│
├──────────────────────────────────────────┤
│ Kopi Susu                      v1        │
│ Rp10.000                                 │
│ 2 Devices                                │
└──────────────────────────────────────────┘
```

* "3 Devices" = jumlah device yang memakai profile ini sebagai profile efektif (anggota group ikut dihitung).
* Aksi: Create, Edit, Duplicate, Delete, Assign.
* Nama profile (mis. "Es Teh") adalah **label internal admin**. Teks di layar diatur lewat `product_name`.
* Profile custom tidak ditampilkan di daftar ini. Profile custom diakses lewat detail device.

## 8.7 Display Editor (`/display-profiles/[id]/editor`)

```text
┌──────────────────────┬──────────────────────┐
│ SETTINGS             │ PREVIEW              │
│ Product Name         │  [ESP32-C6] [LilyGO] │
│ [ ES TEH          ]  │  ┌──────────────┐    │
│ Price                │  │    ES TEH    │    │
│ [ 5000            ]  │  │   Rp5.000    │    │
│ Unit  [ gelas     ]  │  │ SEGAR SETIAP │    │
│ Promo [ SEGAR ... ]  │  └──────────────┘    │
│ Font Size [Large ▼]  │  Rotasi: 0°          │
│ Alignment [Center ▼] │                      │
│ Brightness ●──────   │                      │
│ Layout [Auto ▼]      │                      │
│ [ Save ]             │                      │
└──────────────────────┴──────────────────────┘
```

Aturan editor:

* Preview mengikuti `device_type` (tab ESP32-C6 / LilyGO) dan `rotation`.
* Input harga berupa angka. Preview menampilkan format `Rp5.000`.
* Preview menampilkan **peringatan overflow** bila teks diperkirakan tidak muat.
* Saat disimpan, request membawa `expected_version` (BR-09). Bila terjadi konflik, editor menampilkan pesan dan tombol muat ulang.
* Setelah simpan berhasil, versi naik dan device terkait menjadi `pending`.

## 8.8 Assign Profile

```text
Profile: [ Es Teh ]

Assign ke:
  ☑ ESP32-C6 Group 01   (2 devices)
  ☑ LilyGO #01
  ☐ LilyGO #02
  ☐ LilyGO #03

⚠ LilyGO #01 saat ini memakai "Kopi Susu". Akan diganti.
[ Save Assignment ]
```

* Daftar target hanya berisi **group** dan **device tanpa group**. ESP32-C6 yang sudah masuk group tidak muncul sendiri (BR-06).
* Jika target sudah punya profile lain, UI memberi peringatan penggantian (BR-04).
* Profile custom hanya bisa di-assign ke device pemiliknya (BR-07).

## 8.9 Settings (`/settings`)

MVP: menampilkan nama, email, dan avatar akun, serta tombol logout. Manajemen user menyusul bersama role tambahan.

---

# 9. Display Configuration

## 9.1 Field

| Field | Tipe | Wajib | Default | Aturan |
| ----- | ---- | ----- | ------- | ------ |
| `product_name` | teks | ya | — | 1–32 karakter |
| `price` | integer | ya | — | 0 – 999.999.999 (rupiah) |
| `unit` | teks | tidak | kosong | ≤ 16 karakter, contoh `gelas` |
| `promo_text` | teks | tidak | kosong | ≤ 48 karakter |
| `font_size` | enum | ya | `large` | `small`, `medium`, `large`, `xlarge` |
| `font_weight` | enum | ya | `bold` | `normal`, `bold` |
| `alignment` | enum | ya | `center` | `left`, `center`, `right` |
| `brightness` | integer | ya | 80 | 5 – 100 (persen). Minimum 5 agar layar tidak tampak mati tanpa sengaja |
| `rotation` | enum | ya | 0 | 0, 90, 180, 270 (derajat) |
| `layout_config` | JSON | ya | mode auto | Lihat §9.3 |

## 9.2 Aturan render (preview dan firmware harus identik)

1. **Format harga:** `Rp` + angka dengan titik sebagai pemisah ribuan, tanpa desimal. `15000` → `Rp15.000`.
2. **Unit:** bila ada, ditulis pada baris harga: `Rp5.000/gelas`.
3. **Ukuran font relatif** terhadap `font_size` (sebagai ukuran dasar):
   * nama produk = `font_size`
   * harga = satu tingkat di atas `font_size` (maksimal `xlarge`)
   * promo = satu tingkat di bawah `font_size` (minimal `small`)
4. **Alignment** berlaku untuk semua elemen, kecuali di-override di layout custom.
5. **Teks tidak muat:** firmware mengecilkan font satu tingkat berulang sampai `small`, lalu memotong teks dengan `…`.
6. **Elemen kosong** (promo atau unit kosong) tidak dirender dan tidak menyisakan ruang di mode auto.
7. **Rotasi:** 0 dan 180 = potret, 90 dan 270 = lanskap. Preview menerapkan rotasi yang sama.
8. **Layar selalu menyala.** Tidak ada mode sleep karena perangkat tidak punya tombol untuk membangunkannya. Satu-satunya pengatur daya tampilan adalah `brightness` (minimal 5).

Tabel ukuran font awal (piksel, untuk lebar layar ±170 px; dapat disesuaikan dengan font yang tersedia di firmware):

| Preset | Ukuran |
| ------ | ------ |
| `small` | 12 |
| `medium` | 18 |
| `large` | 28 |
| `xlarge` | 40 |

## 9.3 Layout (`layout_config`)

Layout disimpan sebagai JSONB agar bisa berkembang tanpa mengubah skema DB. Koordinat memakai **persen (0–100)** terhadap ukuran layar setelah rotasi, sehingga satu profile dapat dipakai di kedua ukuran layar.

```json
{
  "schema_version": 1,
  "mode": "custom",
  "elements": {
    "product": { "x": 50, "y": 25, "font_size": "medium", "align": "center" },
    "price":   { "x": 50, "y": 55, "font_size": "xlarge" },
    "promo":   { "x": 50, "y": 85 }
  }
}
```

| Properti | Arti |
| -------- | ---- |
| `mode` | `auto`: elemen ditumpuk vertikal di tengah, `elements` diabaikan. `custom`: posisi memakai `elements` |
| `x`, `y` | Titik jangkar elemen, 0–100. `x` mengikuti alignment: tengah elemen (center), tepi kiri (left), tepi kanan (right). `y` = tengah vertikal elemen |
| `font_size`, `align` | **Opsional.** Jika ada, menimpa nilai global. Jika tidak ada, memakai `font_size` dan `alignment` global |

MVP menyediakan editor untuk mode `auto` penuh. Mode `custom` boleh dibuat bertahap (input angka x/y, drag-and-drop menyusul). Firmware mengabaikan config dengan `schema_version` yang tidak dikenal dan melaporkan `failed`.

## 9.4 Preview per device

```text
ESP32-C6 1.47" (172×320)       LilyGO T-Display-S3 (170×320)
┌─────────────┐                ┌─────────────┐
│   ES TEH    │                │   ES TEH    │
│  Rp5.000    │                │  Rp5.000    │
└─────────────┘                └─────────────┘
```

Frontend memiliki satu renderer yang menerima `device_type`, `rotation`, dan config, lalu menghasilkan preview sesuai aturan §9.2.

---

# 10. Protokol Device (Firmware ↔ Server)

Seluruh komunikasi memakai HTTPS ke `/api/device/*`. Header setiap request:

```text
Authorization: Bearer <device_token>
X-Device-UID:  <device_uid>
```

Rincian request/response ada di `BE.md` §10.

## 10.1 Parameter

| Parameter | Nilai |
| --------- | ----- |
| Interval heartbeat | 20 detik (± jitter acak sampai 5 detik) |
| Batas offline | 60 detik tanpa heartbeat (tiga kali terlewat) |
| Target propagasi perubahan | ≤ 30 detik dari simpan sampai layar berubah (saat device online) |
| Ukuran maksimal payload config | 4 KB |

## 10.2 Perilaku firmware

```text
Boot
 ├─ Baca config terakhir dari penyimpanan lokal (flash) → tampilkan SEGERA
 ├─ Konek WiFi (SSID/password dari firmware; coba ulang dengan backoff 2 → 4 → 8 … maks 60 detik)
 └─ Loop setiap ±20 detik:
      1. POST /heartbeat  (kirim versi yang sedang dipakai)
      2. Jika config_outdated = true:
           a. GET /config
           b. Validasi dan simpan ke flash
           c. Render ulang layar
           d. POST /sync-ack  (success atau error)
```

Aturan:

* Device **harus** menyimpan config terakhir di flash dan menampilkannya saat boot walau tanpa jaringan.
* Jika server tidak terjangkau, device tetap menampilkan config terakhir dan mencoba lagi pada siklus berikutnya.
* Jika config gagal diterapkan, device mengirim `sync-ack` dengan `success=false` dan tetap memakai config lama. Percobaan ulang terjadi di heartbeat berikutnya.
* Waktu server adalah acuan. Timestamp dari device hanya informatif.

---

# 11. Versioning dan Sinkronisasi

## 11.1 Versi

```text
Profile "Es Teh"  v1  Rp10.000
Admin ubah harga  →   v2  Rp15.000   (naik 1 kali per Save yang mengubah config)
```

Server menyimpan `profile_version` (terbaru) dan `synced_version` (yang sudah dipakai device) per device.

## 11.2 State machine

```text
            (tidak ada profile)
                    │ assign
                    ▼
   ┌──────────►  pending  ◄────────────────────────────┐
   │                │ device mengambil config           │ config berubah /
   │                ▼                                   │ assignment berubah /
   │            syncing                                 │ pindah group /
   │          ack sukses │ ack gagal                    │ force re-sync
   │                ▼         ▼                         │
   │             synced     failed ── heartbeat berikutnya (retry)
   │                │                       │
   │                └───────────────────────┴───────────┘
   └── (retry: failed → syncing saat device mengambil config lagi)
```

| Status | Arti |
| ------ | ---- |
| `synced` | Device memakai versi terbaru, atau device belum punya profile |
| `pending` | Ada versi baru yang belum diambil device |
| `syncing` | Device sedang mengambil/menerapkan |
| `failed` | Device melaporkan gagal menerapkan |

Catatan:

* Device tanpa profile ditampilkan sebagai **"No profile"**, bukan "Synced".
* **Self-healing:** jika heartbeat melaporkan device sudah memakai versi terbaru, server otomatis mengubah status menjadi `synced`, walau `sync-ack` sebelumnya hilang.
* `Force re-sync` membuat device mengambil ulang config walau versinya sama.

---

# 12. Realtime

Realtime dipakai **hanya oleh dashboard**.

```text
Admin Save
   │
   ▼
Next.js API → PostgreSQL (versi naik, status device = pending)
   │
   ├──► Realtime ──► Dashboard admin (badge Pending muncul)
   │
   └──► (device mengambil di heartbeat berikutnya, ≤ 20 detik)
                         │
                         ▼
               sync-ack → status synced → Realtime → Dashboard (✓ Synced)
```

Dipakai untuk: status device, last seen, status sync, perubahan profile, perubahan assignment.

Status **offline** tidak punya event (device yang mati tidak mengirim apa pun). Dashboard menghitungnya dari `last_seen` dan batas 60 detik, lalu memperbarui tampilan secara berkala.

Pengiriman instan ke device (tanpa menunggu heartbeat) adalah fitur lanjutan (§19).

---

# 13. Data Model (Ringkas)

Skema lengkap beserta SQL ada di `BE.md` §6.

| Tabel | Fungsi |
| ----- | ------ |
| `users` | Profil admin (1:1 dengan `auth.users`) |
| `admin_allowlist` | Email yang boleh menjadi admin |
| `device_groups` | Group device |
| `devices` | Device dan data heartbeat terakhir |
| `device_credentials` | Hash device token (tidak dapat dibaca dari client) |
| `display_profiles` | Profile dan nomor versi |
| `display_configs` | Isi konfigurasi (1:1 dengan profile) |
| `device_profile_assignments` | Assignment ke group atau device |
| `device_sync_status` | Status sinkronisasi per device |
| `audit_logs` | Riwayat perubahan |

```text
users ── display_profiles ── display_configs (1:1)
                │
                └── device_profile_assignments ──► device_groups   (target group)
                                              └──► devices          (target device)

device_groups ── devices ── device_sync_status (1:1)
                    └─────── device_credentials (1:1)
```

Riwayat nilai lama (mis. harga `10000 → 15000`) tersimpan di `audit_logs`. Fitur rollback ke versi lama adalah fitur lanjutan.

---

# 14. Security

* **Supabase Auth + Google OAuth** untuk admin, ditambah allowlist email.
* **RLS** aktif di semua tabel. Hanya admin yang dapat membaca/mengubah data.
* **Alur validasi API:** Authenticated → Authorized → Validate (Zod) → Database.
* **Device token** disimpan sebagai hash, tidak pernah ditampilkan lagi setelah dibuat, dan dapat dirotasi.
* **Service role key** hanya dipakai di server.
* **Rate limit** pada `/api/device/*`.
* Error ke client tidak membocorkan detail internal database.

---

# 15. Non-Functional Requirements

| Aspek | Target MVP |
| ----- | ---------- |
| Skala | Sampai ±50 device |
| Propagasi perubahan | ≤ 30 detik (device online) |
| Deteksi offline | ≤ 60 detik setelah heartbeat terakhir |
| Respons API admin | p95 < 500 ms |
| Ketahanan device | Layar tetap menampilkan config terakhir tanpa jaringan |
| Aksesibilitas dashboard | Responsif (desktop dan tablet), kontras memadai |

---

# 16. Struktur Project

```text
src/
├── app/
│   ├── login/
│   ├── auth/callback/
│   ├── dashboard/
│   ├── devices/            (page.tsx, [id]/)
│   ├── groups/             (page.tsx, [id]/)
│   ├── display-profiles/   (page.tsx, new/, [id]/editor/)
│   ├── settings/
│   └── api/
│       ├── devices/  groups/  display-profiles/  assignments/
│       ├── dashboard/summary/
│       └── device/         (heartbeat/, config/, sync-ack/)
├── components/             (dashboard, devices, groups, display-editor, ui)
├── lib/
│   ├── supabase/  auth/  services/  validations/  http/
│   └── display/            (devices.ts: ukuran layar, font preset; renderer.ts: aturan §9.2)
├── types/
└── middleware.ts
```

`lib/display/` dipakai bersama oleh preview dan validasi, agar aturan tampilan hanya ada di satu tempat.

---

# 17. Fase MVP

| Fase | Isi | Selesai jika |
| ---- | --- | ------------ |
| 1 Foundation | Next.js, TypeScript, Tailwind, Supabase, migrasi awal, deploy Vercel | Aplikasi live dan terhubung ke DB |
| 2 Authentication | Login/logout Google, allowlist, role, protected routes, session | AC-AUTH lolos |
| 3 Device | Registrasi, token, daftar, detail, heartbeat, online/offline, last seen | AC-DEV lolos |
| 4 Groups | CRUD group, anggota, status group | AC-GRP lolos |
| 5 Display Profiles | CRUD, duplicate, versioning, optimistic locking, audit log | AC-PRF lolos |
| 6 Display Editor | Semua field §9, renderer, live preview per device | AC-DSP lolos |
| 7 Assignment | Assign ke group/device, custom profile, aturan BR-03–BR-07 | AC-ASG lolos |
| 8 Realtime & Sync | Endpoint config/ack, state machine, Realtime dashboard | AC-SYNC lolos |

---

# 18. Acceptance Criteria

### Authentication (AC-AUTH)
1. Login Google berhasil dan membuat profil user.
2. Email di allowlist mendapat role `admin`. Email lain mendapat `pending` dan tidak bisa melihat data.
3. User belum login tidak dapat membuka dashboard maupun API admin.
4. Session bertahan saat halaman di-refresh.

### Device (AC-DEV)
1. `device_uid` unik. Duplikat ditolak.
2. Token tampil sekali saat registrasi. Rotate token membatalkan token lama.
3. Heartbeat memperbarui `last_seen`. Device tanpa heartbeat > 60 detik tampil Offline.
4. Request device dengan token salah ditolak.

### Group dan ESP32-C6 (AC-GRP)
1. Dua ESP32-C6 (atau lebih) dapat berada dalam satu group.
2. Group hanya menerima device bertipe sama.
3. Satu profile yang di-assign ke group membuat semua anggota menerima konfigurasi identik.
4. Device yang ditambahkan ke group belakangan otomatis mengikuti profile group.
5. Status group menampilkan online / partial / offline dengan benar.

### Display Profile (AC-PRF)
1. Create, edit, duplicate, delete berfungsi.
2. Save yang mengubah config menaikkan versi tepat 1. Mengubah nama/deskripsi saja tidak menaikkan versi.
3. Save dengan `expected_version` usang ditolak dengan pesan konflik.
4. Hapus profile yang dipakai ditolak, kecuali `force=true`.

### Display (AC-DSP)
1. Admin dapat mengubah nama produk, harga, unit, promo, font, alignment, brightness, rotasi, dan layout.
2. Preview mengikuti tipe device dan rotasi, dan menampilkan peringatan overflow.
3. Harga tampil `Rp15.000` untuk nilai `15000` di preview dan di device.

### LilyGO dan Assignment (AC-ASG)
1. LilyGO dapat memakai profile yang sama dengan device lain.
2. LilyGO dapat memakai profile yang berbeda.
3. LilyGO dapat memakai profile custom yang tidak muncul di daftar profile umum.
4. Assign baru menggantikan assignment lama dengan peringatan di UI.
5. Memasukkan device ke group menonaktifkan assignment individualnya.

### Sync (AC-SYNC)
1. Perubahan config menjadikan device terkait `pending` dan dashboard memperbaruinya tanpa refresh.
2. Device mengetahui versi terbaru lewat heartbeat dan mengambilnya dalam ≤ 30 detik.
3. Setelah `sync-ack` sukses, status menjadi `synced` dan `synced_version` terisi.
4. `sync-ack` gagal menghasilkan status `failed`, dan retry otomatis pada heartbeat berikutnya.
5. Device menampilkan config terakhir saat boot tanpa jaringan.
6. Heartbeat yang melaporkan versi terbaru memulihkan status menjadi `synced`.

### Security (AC-SEC)
1. RLS aktif di semua tabel.
2. Hash token dan service role key tidak pernah muncul di response atau bundle client.
3. Input tidak valid ditolak dengan detail error terstruktur.

---

# 19. Future Features

| Fitur | Catatan |
| ----- | ------- |
| Scheduled Price | Contoh: 08:00 → Rp10.000, 12:00 → Rp12.000, 18:00 → Rp15.000 |
| Bulk Update | Satu profile ke banyak device sekaligus |
| OTA Firmware | Update firmware dari dashboard |
| Audit Log Viewer | Halaman riwayat (data sudah dicatat sejak MVP) |
| Multi Outlet | Company → Outlet → Group/Device |
| Role tambahan | Owner, Editor, Viewer |
| Jadwal layar mati/nyala | Bisa dilakukan tanpa tombol karena device selalu polling dan dibangunkan dari server. Menggantikan `sleep_timeout` |
| Mode baterai | Interval heartbeat lebih panjang dan deep sleep |
| Push instan ke device | Supabase Broadcast per device, menggantikan tunggu heartbeat |
| Riwayat versi & rollback | Tabel `display_config_versions` |
| Gambar/logo | Memakai Supabase Storage |
| Group untuk LilyGO | Membuka batas BR-02 |

---

# 20. Keputusan Final dan Asumsi Firmware

Semua pertanyaan terbuka dari v1.0 sudah diputuskan.

| Topik | Keputusan |
| ----- | --------- |
| WiFi | SSID dan password ditanam di firmware. Mengubah WiFi = flash ulang |
| Resolusi layar | ESP32-C6 LCD 1.47": 172×320. LilyGO T-Display-S3: 170×320. Konstanta di `lib/display/devices.ts` |
| Font preset | small 12, medium 18, large 28, xlarge 40 (piksel). Boleh disesuaikan dengan font yang tersedia di firmware, selama preview ikut diubah |
| Heartbeat | 20 detik (± 5 detik jitter). Perangkat bertenaga USB |
| Input fisik | Tidak ada tombol. Tidak ada sleep, wake, atau reset dari perangkat |
| Pemulihan | Flash ulang via USB, lalu perangkat mengambil config terbaru dari server |

## 20.1 Konfigurasi firmware

Konstanta berikut ditanam saat build, disimpan di berkas yang **tidak** masuk repositori (mis. `secrets.h`):

```text
WIFI_SSID
WIFI_PASSWORD
API_BASE_URL     # https://<domain-vercel>
DEVICE_UID       # sama dengan yang didaftarkan di dashboard
DEVICE_TOKEN     # token yang tampil sekali saat registrasi
```

Konsekuensi:

* Satu binary firmware per device, atau satu binary dengan `DEVICE_UID` dan `DEVICE_TOKEN` yang disuntik saat flash.
* Rotate token di dashboard mewajibkan flash ulang device dengan token baru.
* Selama WiFi/server tidak terjangkau, device terus menampilkan config terakhir dari flash dan mencoba lagi (lihat §10.2).