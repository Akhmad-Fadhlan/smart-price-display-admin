
# FE PLAN — Smart Price Display Management Dashboard

## 1. Frontend Stack

Sesuai PRD:

* **Next.js App Router**
* **TypeScript**
* **React**
* **Tailwind CSS**
* **shadcn/ui**
* **Supabase Auth**
* **Supabase Realtime**
* **Zod**
* Responsive: **Desktop + Tablet**

Frontend menggunakan `/api/*` sebagai kontrak utama untuk operasi admin, sedangkan Supabase Realtime digunakan untuk memperbarui dashboard tanpa refresh. Device tidak pernah mengakses Supabase secara langsung. 

---

# 2. Struktur Halaman FE

Total MVP:

```text
/login
/auth/callback

/dashboard

/devices
/devices/[id]

/groups
/groups/[id]

/display-profiles
/display-profiles/new
/display-profiles/[id]/editor

/settings
```

Struktur route ini mengikuti halaman yang ditetapkan PRD. 

---

# 3. App Shell

Semua halaman setelah login menggunakan layout utama:

```text
┌─────────────────────────────────────────────────────────────┐
│ Logo / PRICE DISPLAY                         🔔  Admin ▼    │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│ Dashboard    │                                              │
│ Devices      │              PAGE CONTENT                    │
│ Groups       │                                              │
│ Profiles     │                                              │
│              │                                              │
│──────────────│                                              │
│ Settings     │                                              │
│              │                                              │
│ 👤 Admin     │                                              │
│ Logout       │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### Sidebar

Menu:

1. Dashboard
2. Devices
3. Groups
4. Display Profiles
5. Settings

Footer:

* Avatar
* Nama admin
* Logout

PRD menetapkan navigasi ini sebagai struktur utama MVP. 

---

# 4. Design System

Saya sarankan FE menggunakan visual **premium industrial IoT dashboard**, bukan dashboard admin generik.

### Visual direction

```text
Background
#F8FAFC

Surface
#FFFFFF

Border
#E2E8F0

Text
#0F172A

Muted
#64748B

Primary
#2563EB

Success
#16A34A

Warning
#F59E0B

Danger
#DC2626
```

### UI style

* Clean
* Rounded 12–16px
* Subtle shadow
* Thin border
* Compact data table
* Status badge
* Device-oriented visual
* Banyak whitespace
* Tidak terlalu banyak gradient

### Status

| Status  | UI             |
| ------- | -------------- |
| Online  | Green dot      |
| Offline | Gray/red dot   |
| Pending | Amber          |
| Syncing | Blue + spinner |
| Synced  | Green check    |
| Failed  | Red            |
| Partial | Amber          |

---

# 5. Dashboard

Route:

```text
/dashboard
```

Dashboard menjadi **control center**.

## Header

```text
Dashboard
Monitor your smart price displays

[Refresh] [Add Device]
```

## Summary cards

Empat card:

```text
┌─────────────┐ ┌─────────────┐
│ Total Device│ │ Online      │
│     12      │ │ 10 / 12     │
└─────────────┘ └─────────────┘

┌─────────────┐ ┌─────────────┐
│ Groups      │ │ Pending Sync│
│      3      │ │      2      │
└─────────────┘ └─────────────┘
```

Data mengikuti empat metrik dashboard di PRD. 

## Device overview

```text
Device / Group       Status       Sync
─────────────────────────────────────────
ESP32-C6 Group 01    ● Online     ✓ Synced
ESP32-C6 #01         ● Online     ✓ Synced
ESP32-C6 #02         ● Online     ⟳ Pending
LilyGO #01           ● Online     ✓ Synced
LilyGO #02           ○ Offline    ⚠ Failed
```

Realtime listener:

```text
device status
last_seen
sync_status
profile changes
assignment changes
```

Dashboard harus memperbarui data tanpa refresh. 

---

# 6. Devices Page

Route:

```text
/devices
```

## Header

```text
Devices

Manage all registered smart displays

[ Search devices... ] [Filter ▼] [ + Add Device ]
```

## Filter

```text
Type
☐ ESP32-C6
☐ LilyGO

Group
☐ Group 01
☐ Group 02

Status
☐ Online
☐ Offline
```

## Table

```text
┌──────────────────────────────────────────────────────────────┐
│ Device │ Type │ Group │ Profile │ Status │ Sync │ Last Seen │
├──────────────────────────────────────────────────────────────┤
│ C6 #01 │ C6   │ G01   │ Es Teh  │ Online │ ✓    │ 5 sec     │
│ C6 #02 │ C6   │ G01   │ Es Teh  │ Online │ ✓    │ 8 sec     │
│ S3 #01 │ S3   │ —     │ Kopi    │ Online │ ⟳    │ 12 sec    │
└──────────────────────────────────────────────────────────────┘
```

Kolom dan filter mengikuti PRD. Profile yang ditampilkan harus **profile efektif**, bukan sekadar assignment langsung. 

---

# 7. Add Device

Gunakan modal atau drawer.

```text
Add Device

Device UID
[ ESP32C6-A001             ]

Name
[ Display Rak Minuman      ]

Device Type
[ ESP32-C6 ▼               ]

Group
[ C6 Group 01 ▼ ] Optional

                    [Cancel] [Register Device]
```

Setelah berhasil:

```text
Device Registered ✓

Device UID
ESP32C6-A001

Device Token
••••••••••••••••••••••••

⚠ This token will only be shown once.

[ Copy Token ]

[ I've Saved The Token ]
```

FE harus memperlakukan token sebagai **one-time secret**.

PRD secara eksplisit menetapkan token hanya tampil sekali dan dapat di-rotate jika hilang. 

---

# 8. Device Detail

Route:

```text
/devices/[id]
```

Layout:

```text
← Devices

ESP32C6-A001
Display Rak Minuman

● Online
```

## Device information

```text
Device UID
ESP32C6-A001

Type
ESP32-C6

Firmware
1.0.3

IP Address
192.168.1.20

Signal
-54 dBm

Last Seen
5 seconds ago
```

## Current Profile

```text
Es Teh
Version 3

Source
Group: C6 Group 01

Rp5.000
```

## Sync

```text
Server Version     v3
Device Version     v3

✓ Synced
```

Actions:

```text
[Change Group]
[Change Profile]
[Create Custom Profile]
[Force Re-sync]
[Rotate Token]
[Delete Device]
```

Actions tersebut mengikuti detail device pada PRD. 

---

# 9. Groups Page

Route:

```text
/groups
```

Card-based layout cocok untuk group karena jumlah group diperkirakan relatif kecil.

```text
┌─────────────────────────────────────┐
│ ESP32-C6 Group 01        ● Online   │
│                                     │
│ 2 Devices                           │
│                                     │
│ Profile                             │
│ Es Teh · v3                         │
│                                     │
│ C6 #01       ● Online   ✓ Synced    │
│ C6 #02       ● Online   ✓ Synced    │
│                                     │
│ [Open Group]                        │
└─────────────────────────────────────┘
```

Status group:

```text
ONLINE
semua device online

PARTIAL
sebagian online

OFFLINE
tidak ada yang online
```

Aturan status tersebut ditetapkan dalam PRD. 

---

# 10. Group Detail

Route:

```text
/groups/[id]
```

Header:

```text
ESP32-C6 Group 01

● Online
2 Devices

[Edit Group] [Delete]
```

Profile:

```text
Current Display Profile

Es Teh
Version 3

[Change Profile]
```

Members:

```text
Members

┌────────────────────────────────────────────┐
│ C6 #01   ● Online   ✓ Synced   [Remove]   │
│ C6 #02   ● Online   ✓ Synced   [Remove]   │
└────────────────────────────────────────────┘

[+ Add Device]
```

Ketika profile group berubah, FE menampilkan confirmation:

```text
Change Group Profile?

All 2 devices in this group will use:

Es Teh v4

Their current profiles will be replaced.

[Cancel] [Change Profile]
```

---

# 11. Display Profiles

Route:

```text
/display-profiles
```

Gunakan **card/list hybrid**.

```text
Display Profiles

Manage reusable display configurations

[ + Create Profile ]

┌─────────────────────────────────────┐
│ Es Teh                         v3   │
│ Rp5.000                            │
│ 3 devices                          │
│                                    │
│ [Edit] [Duplicate] [Assign] [•••] │
└─────────────────────────────────────┘
```

Profile custom tidak ditampilkan di halaman ini karena PRD menetapkannya sebagai profile milik device tertentu. 

---

# 12. Create Profile

Route:

```text
/display-profiles/new
```

Form:

```text
Create Display Profile

Profile Name
[ Es Teh ]

Description
[ Display untuk produk Es Teh ]

Display Configuration

Product Name
[ ES TEH ]

Price
[ 5000 ]

Unit
[ gelas ]

Promo Text
[ SEGAR SETIAP HARI ]

[ Create Profile ]
```

Setelah create:

```text
→ redirect ke /display-profiles/[id]/editor
```

---

# 13. Display Editor — Halaman Terpenting

Route:

```text
/display-profiles/[id]/editor
```

Saya sarankan menggunakan **3 area** pada desktop:

```text
┌──────────────────┬───────────────────────────┬──────────────────┐
│ CONFIGURATION    │ LIVE PREVIEW              │ PROFILE INFO     │
│                  │                           │                  │
│ Product          │       ┌───────────┐       │ Es Teh           │
│ [ES TEH       ]  │       │  ES TEH   │       │ Version 3        │
│                  │       │           │       │                  │
│ Price            │       │ Rp5.000   │       │ Assigned To      │
│ [5000         ]  │       │           │       │ 3 devices        │
│                  │       │ SEGAR     │       │                  │
│ Unit             │       │ SETIAP    │       │                  │
│ [gelas         ] │       │ HARI      │       │                  │
│                  │       └───────────┘       │                  │
│ Promo            │                           │                  │
│ [SEGAR...      ] │       ESP32-C6            │                  │
│                  │       172 × 320           │                  │
│ Font             │                           │                  │
│ [Large ▼       ] │                           │                  │
│                  │                           │                  │
│ Alignment        │                           │                  │
│ [Center ▼      ] │                           │                  │
│                  │                           │                  │
│ Brightness       │                           │                  │
│ ●────────────    │                           │                  │
│                  │                           │                  │
│ Rotation         │                           │                  │
│ [0° ▼          ] │                           │                  │
│                  │                           │                  │
│ Layout           │                           │                  │
│ [Auto ▼        ] │                           │                  │
└──────────────────┴───────────────────────────┴──────────────────┘

[Cancel]                              [Save Changes]
```

PRD memang menjadikan editor sebagai area utama untuk konfigurasi + live preview. 

---

# 14. Preview Component

Buat reusable component:

```text
<DisplayPreview
  deviceType="esp32_c6"
  rotation={0}
  config={config}
/>
```

Device selector:

```text
[ ESP32-C6 ] [ LilyGO ]
```

Resolution:

```text
ESP32-C6
172 × 320

LilyGO
170 × 320
```

Renderer harus menggunakan satu logic yang sama untuk preview sehingga aturan rendering tidak tersebar di banyak component. PRD secara khusus meminta satu renderer bersama preview dan validasi. 

---

# 15. Preview States

FE perlu memiliki beberapa kondisi.

### Normal

```text
┌──────────────┐
│   ES TEH     │
│              │
│   Rp5.000    │
│              │
│ SEGAR HARI   │
└──────────────┘
```

### Overflow

```text
┌──────────────┐
│ SUPER LONG   │
│ PRODUCT NAME │
│              │
│ Rp5.000      │
└──────────────┘

⚠ Text may not fit
```

### Empty promo

Promo kosong:

```text
ES TEH

Rp5.000
```

Tidak boleh menyisakan ruang kosong.

Aturan tersebut berasal dari renderer §9.2. 

---

# 16. Display Editor State Management

Gunakan state terpisah:

```ts
type DisplayEditorState = {
  config: DisplayConfig
  originalConfig: DisplayConfig
  expectedVersion: number
  isDirty: boolean
  isSaving: boolean
  saveError?: string
}
```

Computed:

```ts
const isDirty =
  JSON.stringify(config) !== JSON.stringify(originalConfig)
```

Save:

```text
User edit
   ↓
Local state
   ↓
Preview update instantly
   ↓
Save
   ↓
API
   ↓
expected_version
   ↓
success
   ↓
version +1
   ↓
Realtime update
```

Jika version conflict:

```text
⚠ This profile was changed by another admin.

Your changes were not saved.

[Reload Latest Version]
```

Karena optimistic locking merupakan aturan bisnis wajib. 

---

# 17. Assignment UI

Bisa berupa modal dari profile:

```text
Assign Profile

Profile
Es Teh · v3

Assign to:

GROUPS

☑ ESP32-C6 Group 01
  2 devices

DEVICES

☑ LilyGO #01
☐ LilyGO #02
☐ LilyGO #03
```

Jika device sudah memiliki profile:

```text
⚠ LilyGO #01

Currently:
Kopi Susu

New:
Es Teh

This assignment will replace the current profile.
```

FE hanya menampilkan target yang valid:

* Group
* Device tanpa group

ESP32-C6 yang sudah masuk group **tidak ditampilkan sebagai target individual**. 

---

# 18. Custom Profile UX

Dari:

```text
/devices/[id]
```

Klik:

```text
Create Custom Profile
```

Confirmation:

```text
Create Custom Profile?

This will copy the current display configuration
and create a profile specifically for:

LilyGO #02

This profile cannot be used by other devices.

[Cancel] [Create Custom Profile]
```

Kemudian masuk ke editor:

```text
/display-profiles/[custom-id]/editor
```

dengan badge:

```text
CUSTOM PROFILE
LilyGO #02
```

---

# 19. Settings

Route:

```text
/settings
```

MVP sangat sederhana:

```text
Settings

Account

┌─────────────────────────────────────┐
│        [Avatar]                     │
│                                     │
│        Akhmad Fadhlan              │
│        admin@email.com              │
│                                     │
│        Role: Admin                  │
└─────────────────────────────────────┘

                         [Logout]
```

Tidak perlu membuat user management karena itu bukan bagian MVP. 

---

# 20. Login

Route:

```text
/login
```

Desain:

```text
                    ┌──────────────────────┐
                    │                      │
                    │   PRICE DISPLAY      │
                    │     DASHBOARD        │
                    │                      │
                    │ Manage your smart    │
                    │ price displays       │
                    │                      │
                    │ ┌──────────────────┐ │
                    │ │ G Continue with  │ │
                    │ │   Google         │ │
                    │ └──────────────────┘ │
                    │                      │
                    └──────────────────────┘
```

Hanya tombol Google sesuai PRD. 

---

# 21. Pending Access Page

Untuk Google account yang belum masuk allowlist:

```text
Access Pending

Your account has not been approved yet.

Please contact the administrator
to request access.

admin@email.com

[Sign Out]
```

Tidak boleh menampilkan data dashboard kepada role `pending`. 

---

# 22. Realtime Architecture FE

Buat hook:

```text
useRealtimeDevices()
useRealtimeProfiles()
useRealtimeAssignments()
useRealtimeSync()
```

Contoh flow:

```text
Supabase Realtime
       │
       ▼
useRealtimeDevices()
       │
       ▼
React Query / local cache
       │
       ▼
UI
```

Event penting:

```text
device updated
device heartbeat
sync status changed
profile updated
assignment updated
```

Untuk offline, jangan menunggu event karena device offline memang tidak mengirim event. FE menghitung berdasarkan `last_seen`. 

---

# 23. API Layer FE

Jangan fetch API secara langsung dari setiap component.

Buat:

```text
lib/api/
├── dashboard.ts
├── devices.ts
├── groups.ts
├── profiles.ts
├── assignments.ts
└── sync.ts
```

Contoh:

```ts
devicesApi.list()
devicesApi.get(id)
devicesApi.create(data)
devicesApi.update(id, data)
devicesApi.delete(id)
devicesApi.rotateToken(id)
devicesApi.forceResync(id)
```

Kemudian hooks:

```text
hooks/
├── useDashboard.ts
├── useDevices.ts
├── useGroups.ts
├── useProfiles.ts
├── useAssignments.ts
└── useSyncStatus.ts
```

---

# 24. Component Architecture

```text
components/
│
├── layout/
│   ├── AppShell
│   ├── Sidebar
│   ├── Header
│   └── UserMenu
│
├── dashboard/
│   ├── SummaryCard
│   ├── DeviceOverview
│   ├── GroupStatus
│   └── PendingSync
│
├── devices/
│   ├── DeviceTable
│   ├── DeviceFilters
│   ├── DeviceStatus
│   ├── DeviceInfo
│   ├── AddDeviceDialog
│   ├── TokenRevealDialog
│   └── RotateTokenDialog
│
├── groups/
│   ├── GroupCard
│   ├── GroupTable
│   ├── GroupMembers
│   ├── GroupStatus
│   └── GroupForm
│
├── display/
│   ├── ProfileCard
│   ├── ProfileForm
│   ├── DisplayEditor
│   ├── DisplayPreview
│   ├── DevicePreviewSelector
│   ├── FontSelector
│   ├── LayoutEditor
│   ├── OverflowWarning
│   └── AssignmentDialog
│
├── sync/
│   ├── SyncBadge
│   ├── SyncStatus
│   └── SyncTimeline
│
└── ui/
    └── shadcn components
```

---

# 25. Display Renderer Architecture

Ini bagian yang **sangat penting**.

```text
lib/display/

devices.ts
renderer.ts
formatter.ts
validation.ts
constants.ts
```

### `devices.ts`

```ts
ESP32_C6 = {
  width: 172,
  height: 320
}

LILYGO_S3 = {
  width: 170,
  height: 320
}
```

### `formatter.ts`

```ts
formatPrice(5000)
// Rp5.000
```

### `renderer.ts`

```ts
renderDisplay({
  deviceType,
  rotation,
  config
})
```

### `validation.ts`

```ts
validateDisplayConfig(config)
checkOverflow(...)
```

Ini mengikuti keputusan PRD bahwa `lib/display/` dipakai bersama oleh preview dan validasi agar aturan display hanya berada di satu tempat. 

---

# 26. Loading & Empty States

Setiap halaman wajib memiliki:

### Loading

```text
Skeleton cards
Skeleton table
```

### Empty Devices

```text
No devices yet

Register your first smart display
to start managing your price labels.

[+ Add Device]
```

### Empty Groups

```text
No groups yet

Create a group to manage
multiple ESP32-C6 devices together.

[+ Create Group]
```

### Empty Profiles

```text
No display profiles

Create a reusable configuration
for your smart displays.

[+ Create Profile]
```

---

# 27. Error Handling

Gunakan error UI yang jelas.

### Network

```text
Unable to load devices.

Please check your connection.

[Retry]
```

### 401

```text
Your session has expired.

[Sign In Again]
```

### 409 Version Conflict

```text
This profile has been modified.

Reload the latest version before saving.
```

### 409 Delete

```text
This profile is currently being used
by 3 devices.

Remove its assignments first
or force delete.
```

### Validation

Gunakan Zod-compatible field errors:

```text
Product Name
[                         ]
Product name is required.
```

---

# 28. Confirmation Dialog Rules

Jangan langsung melakukan destructive action.

Contoh:

### Delete Device

```text
Delete Device?

ESP32C6-A001

This action cannot be undone.

[Cancel] [Delete Device]
```

### Force Delete Profile

```text
Force Delete Profile?

3 devices will become:

No Profile

The current display configuration
will stop being assigned.

[Cancel] [Force Delete]
```

Ini diperlukan karena PRD menetapkan penghapusan profile/group yang masih digunakan ditolak kecuali `force=true`. 

---

# 29. Responsive Behavior

Target:

```text
Desktop ≥ 1280
Tablet 768–1279
```

### Desktop

Display editor:

```text
Settings | Preview | Info
```

### Tablet

```text
Settings
────────
Preview
────────
Info
```

Sidebar dapat berubah menjadi compact navigation.

Mobile **bukan target utama MVP**, karena NFR menyebut responsif untuk desktop dan tablet. 

---

# 30. Frontend Development Phases

Saya sarankan FE dikerjakan dalam **8 phase**, paralel dengan fase MVP PRD.

### Phase 1 — Foundation

```text
Next.js
TypeScript
Tailwind
shadcn
App Shell
Theme
Routing
API client
```

### Phase 2 — Authentication

```text
Login
Google OAuth
Callback
Session
Protected routes
Pending page
Logout
```

### Phase 3 — Device

```text
Device list
Search
Filter
Add device
Token reveal
Device detail
Rotate token
Status
Last seen
```

### Phase 4 — Groups

```text
Group list
Create
Edit
Members
Add/remove member
Group status
Profile group
```

### Phase 5 — Profiles

```text
Profile list
Create
Edit metadata
Duplicate
Delete
Version badge
Usage count
```

### Phase 6 — Display Editor

```text
Config form
Price formatter
Font preset
Alignment
Brightness
Rotation
Preview
Overflow detection
Auto layout
Save
Version conflict
```

### Phase 7 — Assignment

```text
Assignment modal
Group target
Device target
Conflict warning
Custom profile
Profile replacement
```

### Phase 8 — Realtime & Sync

```text
Realtime hooks
Pending
Syncing
Synced
Failed
Force resync
Last seen
Offline calculation
Live dashboard
```

Urutan ini konsisten dengan urutan fase MVP pada PRD. 

---

# 31. Prioritas Komponen

### P0 — Wajib

```text
AppShell
Sidebar
Login
Dashboard
DeviceTable
DeviceDetail
AddDevice
GroupList
GroupDetail
ProfileList
DisplayEditor
DisplayPreview
AssignmentDialog
SyncBadge
```

### P1

```text
Filters
Search
DuplicateProfile
CustomProfile
TokenRotate
OverflowWarning
RealtimeIndicators
```

### P2

```text
Advanced custom layout
Drag & drop
Sync timeline
Advanced animations
```

Custom layout drag-and-drop memang tidak diwajibkan di MVP; PRD memperbolehkan tahap awal menggunakan input x/y. 

---

# 32. Final FE Sitemap

```text
PRICE DISPLAY DASHBOARD
│
├── /login
│
├── /dashboard
│   ├── Summary
│   ├── Device Status
│   ├── Group Status
│   └── Pending Sync
│
├── /devices
│   ├── Search
│   ├── Filter
│   ├── Add Device
│   └── /[id]
│       ├── Device Info
│       ├── Effective Profile
│       ├── Sync
│       ├── Change Group
│       ├── Change Profile
│       ├── Custom Profile
│       ├── Force Sync
│       ├── Rotate Token
│       └── Delete
│
├── /groups
│   ├── Group Cards
│   └── /[id]
│       ├── Members
│       ├── Profile
│       ├── Add Device
│       └── Remove Device
│
├── /display-profiles
│   ├── Create
│   ├── Duplicate
│   ├── Assign
│   ├── Delete
│   └── /[id]/editor
│       ├── Configuration
│       ├── Preview
│       ├── Device Type
│       ├── Rotation
│       ├── Brightness
│       ├── Layout
│       └── Version Conflict
│
└── /settings
    ├── Account
    └── Logout
```

## 33. Definition of Done FE

Frontend dianggap selesai jika:

* [ ] Google login bekerja
* [ ] Protected route bekerja
* [ ] Pending user tidak bisa melihat data
* [ ] Dashboard menampilkan summary
* [ ] Device CRUD bekerja
* [ ] Token hanya tampil sekali
* [ ] Device online/offline realtime
* [ ] Group CRUD bekerja
* [ ] Group status online/partial/offline benar
* [ ] Profile CRUD bekerja
* [ ] Duplicate profile bekerja
* [ ] Versioning bekerja
* [ ] Optimistic locking ditangani UI
* [ ] Display editor lengkap
* [ ] Preview ESP32-C6 benar
* [ ] Preview LilyGO benar
* [ ] Rotation bekerja
* [ ] Price formatting benar
* [ ] Overflow warning bekerja
* [ ] Assignment group/device benar
* [ ] Custom profile bekerja
* [ ] Sync status realtime
* [ ] Force re-sync tersedia
* [ ] Settings + logout bekerja
* [ ] Desktop responsive
* [ ] Tablet responsive

