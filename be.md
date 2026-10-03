# BE — Backend Specification
## Smart Price Display Management Dashboard

**Versi:** 1.1
**Sinkron dengan:** `prd_adminlcd.md` v1.1
**Stack:** Next.js Route Handlers + TypeScript, Supabase (PostgreSQL, Auth, Realtime), Zod, Vercel

Kode seperti `BR-03` dan `AC-SYNC` merujuk ke aturan bisnis dan acceptance criteria di PRD v1.1.

---

## 1. Ruang Lingkup

Backend bertanggung jawab atas:

1. Autentikasi admin (Google OAuth) dan otorisasi berbasis allowlist.
2. CRUD device, group, display profile, assignment.
3. Penentuan **profile efektif** setiap device (BR-03).
4. Versioning konfigurasi dan state machine sinkronisasi.
5. Endpoint khusus firmware: heartbeat, ambil config, ack.
6. Realtime untuk dashboard.
7. Audit log.

Tidak ada server terpisah. Semua berjalan di Next.js pada Vercel.

---

## 2. Arsitektur

```text
Admin (cookie session)                Device (device token)
        │                                    │
        ▼                                    ▼
   /api/*  (requireAdmin)             /api/device/*  (deviceAuth)
        │                                    │
        └──────► Service layer ◄─────────────┘
                     │  Zod
                     ▼
             Supabase PostgreSQL
        (RLS · trigger · RPC · view)
                     │
                     └──► Realtime ──► Dashboard
```

Prinsip:

* **Logika konsistensi data ada di database** (trigger dan fungsi SQL): versioning, profile efektif, status sync. Dengan begitu tidak ada celah walau ada beberapa jalur penulisan.
* Route handler tipis: auth → parse/validasi → panggil service → bentuk response.
* Operasi multi-langkah (buat profile, assign, simpan config) dijalankan lewat **RPC (fungsi Postgres)** supaya atomik.
* Device tidak pernah berbicara langsung ke Supabase.

---

## 3. Struktur Folder

```text
src/
├── app/
│   ├── auth/callback/route.ts
│   └── api/
│       ├── devices/
│       │   ├── route.ts                       # GET, POST
│       │   └── [id]/
│       │       ├── route.ts                   # GET, PATCH, DELETE
│       │       ├── sync/route.ts              # GET, POST (force)
│       │       ├── rotate-token/route.ts      # POST
│       │       └── custom-profile/route.ts    # POST
│       ├── groups/
│       │   ├── route.ts                       # GET, POST
│       │   └── [id]/
│       │       ├── route.ts                   # GET, PATCH, DELETE
│       │       └── devices/route.ts           # POST, DELETE (anggota)
│       ├── display-profiles/
│       │   ├── route.ts                       # GET, POST (+duplicate)
│       │   └── [id]/route.ts                  # GET, PATCH, DELETE
│       ├── assignments/
│       │   ├── route.ts                       # GET, POST
│       │   └── [id]/route.ts                  # DELETE
│       ├── dashboard/summary/route.ts         # GET
│       └── device/
│           ├── heartbeat/route.ts             # POST
│           ├── config/route.ts                # GET
│           └── sync-ack/route.ts              # POST
├── lib/
│   ├── supabase/   (server.ts, admin.ts, middleware.ts)
│   ├── auth/       (require-admin.ts, device-auth.ts, token.ts)
│   ├── services/   (devices, groups, profiles, assignments, sync, audit)
│   ├── validations/(device, group, profile, assignment, device-api)
│   ├── display/    (devices.ts, renderer.ts)     # konstanta layar, aturan render (bersama FE)
│   └── http/       (response.ts, errors.ts, with-api.ts)
├── types/database.ts                              # supabase gen types
└── middleware.ts
supabase/migrations/*.sql
```

---

## 4. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only, tanpa prefix NEXT_PUBLIC_
NEXT_PUBLIC_SITE_URL=
```

Allowlist admin berada di **tabel** `admin_allowlist` (bukan env), sehingga penambahan admin tidak perlu redeploy. Batas offline (60 detik) dan interval heartbeat adalah konstanta yang tercatat di §6.7 dan PRD §10.

---

## 5. Authentication dan Authorization

### 5.1 Admin

```text
/login → Google OAuth → Supabase Auth → /auth/callback (exchange code)
      → trigger handle_new_user mengisi public.users (role dari allowlist)
      → role admin/owner → /dashboard
      → role pending      → halaman "Menunggu persetujuan akses"
```

### 5.2 Admin pertama

```sql
insert into public.admin_allowlist (email, role) values ('you@gmail.com', 'owner');
```

Jalankan sebelum login pertama. Jika akun sudah terlanjur login (role `pending`), trigger pada `admin_allowlist` (§6.5) otomatis menaikkan rolenya.

### 5.3 Middleware

* Refresh session Supabase pada tiap request.
* Tanpa session: halaman dashboard → redirect `/login`, `/api/*` admin → `401`.
* Sudah login mengakses `/login` → redirect `/dashboard`.
* `/api/device/*` dikecualikan dari cek session.

### 5.4 Guard admin

```ts
// lib/auth/require-admin.ts
export async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();   // verifikasi ke Supabase Auth
  if (!user) throw new AppError("UNAUTHENTICATED", 401);

  const { data: me } = await supabase
    .from("users").select("role").eq("id", user.id).single();
  if (!me || !["owner", "admin"].includes(me.role))
    throw new AppError("FORBIDDEN", 403);

  return { supabase, user };
}
```

Gunakan `getUser()`, bukan `getSession()`, untuk keputusan keamanan di server.

### 5.5 Device auth

Header wajib:

```text
Authorization: Bearer <device_token>
X-Device-UID:  <device_uid>
```

```ts
// lib/auth/device-auth.ts  (memakai service-role client)
export async function deviceAuth(req: Request) {
  const uid = req.headers.get("x-device-uid");
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!uid || !token) throw new AppError("UNAUTHENTICATED", 401);

  const admin = createAdminClient();
  const { data: device } = await admin
    .from("devices").select("id, device_uid, device_type, group_id")
    .eq("device_uid", uid).maybeSingle();
  const { data: cred } = device
    ? await admin.from("device_credentials").select("token_hash").eq("device_id", device.id).single()
    : { data: null };

  const ok = cred && timingSafeEqual(sha256(token), cred.token_hash);
  if (!device || !ok) throw new AppError("UNAUTHENTICATED", 401);   // pesan sama untuk uid salah / token salah
  return { admin, device };
}
```

Token: 32 byte acak (`crypto.randomBytes`), format `dpt_<base64url>`. Karena sudah acak dan panjang, SHA-256 cukup (tidak perlu bcrypt). Hanya hash yang disimpan. Endpoint `/api/device/*` memakai service role sehingga **RLS tidak berlaku**; seluruh pembatasan akses dilakukan di kode (selalu filter `device_id` dari hasil `deviceAuth`, jangan dari body).

---

## 6. Database

### 6.1 Enum dan tabel

```sql
create type device_type as enum ('esp32_c6', 'lilygo_s3');
create type sync_status as enum ('synced', 'pending', 'syncing', 'failed');
create type user_role   as enum ('owner', 'admin', 'editor', 'viewer', 'pending');
create type font_size   as enum ('small', 'medium', 'large', 'xlarge');
create type text_align  as enum ('left', 'center', 'right');

-- ===== users & allowlist =====
create table public.admin_allowlist (
  email       text primary key,
  role        user_role not null default 'admin',
  created_at  timestamptz not null default now()
);

create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text,
  avatar_url  text,
  role        user_role not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ===== groups =====
create table public.device_groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  device_type  device_type not null default 'esp32_c6',
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint group_mvp_type check (device_type = 'esp32_c6')   -- BR-02; hapus saat group LilyGO dibuka
);

-- ===== devices =====
create table public.devices (
  id                uuid primary key default gen_random_uuid(),
  device_uid        text not null unique check (device_uid ~ '^[A-Z0-9-]{3,40}$'),  -- BR-01
  name              text not null,
  device_type       device_type not null,
  group_id          uuid references public.device_groups(id) on delete set null,
  firmware_version  text,
  last_seen         timestamptz,
  ip_address        inet,
  battery           smallint check (battery between 0 and 100),   -- opsional; perangkat USB biasanya null
  signal_strength   smallint,                                   -- RSSI (dBm)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_devices_group on public.devices(group_id);
create index idx_devices_last_seen on public.devices(last_seen);

-- hash token terpisah dan TANPA policy → tidak terbaca dari client mana pun
create table public.device_credentials (
  device_id   uuid primary key references public.devices(id) on delete cascade,
  token_hash  text not null,
  created_at  timestamptz not null default now(),
  rotated_at  timestamptz
);

-- ===== profiles & configs =====
create table public.display_profiles (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  version          integer not null default 1,
  is_custom        boolean not null default false,
  owner_device_id  uuid references public.devices(id) on delete cascade,
  created_by       uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint custom_has_owner check (is_custom = (owner_device_id is not null))   -- BR-07
);
create unique index uq_profile_name on public.display_profiles (lower(name)) where not is_custom;
create unique index uq_custom_per_device on public.display_profiles (owner_device_id) where is_custom;

create table public.display_configs (
  id                  uuid primary key default gen_random_uuid(),
  display_profile_id  uuid not null unique references public.display_profiles(id) on delete cascade,

  product_name  text not null check (char_length(product_name) between 1 and 32),
  price         integer not null check (price between 0 and 999999999),      -- BR-12
  unit          text check (char_length(unit) <= 16),
  promo_text    text check (char_length(promo_text) <= 48),

  font_size     font_size not null default 'large',
  font_weight   text not null default 'bold' check (font_weight in ('normal','bold')),
  alignment     text_align not null default 'center',

  brightness    smallint not null default 80 check (brightness between 5 and 100),
  rotation      smallint not null default 0 check (rotation in (0,90,180,270)),

  layout_config jsonb not null
                default '{"schema_version":1,"mode":"auto","elements":{}}'::jsonb,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ===== assignments =====
create table public.device_profile_assignments (
  id                  uuid primary key default gen_random_uuid(),
  display_profile_id  uuid not null references public.display_profiles(id) on delete cascade,
  device_id           uuid references public.devices(id) on delete cascade,
  group_id            uuid references public.device_groups(id) on delete cascade,
  is_active           boolean not null default true,
  assigned_at         timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint one_target check (num_nonnulls(device_id, group_id) = 1)
);
create unique index uq_active_device_assignment on public.device_profile_assignments(device_id)
  where is_active and device_id is not null;                                   -- BR-04
create unique index uq_active_group_assignment on public.device_profile_assignments(group_id)
  where is_active and group_id is not null;                                    -- BR-04
create index idx_assign_profile on public.device_profile_assignments(display_profile_id);

-- ===== sync status =====
create table public.device_sync_status (
  device_id           uuid primary key references public.devices(id) on delete cascade,
  profile_id          uuid references public.display_profiles(id) on delete set null,  -- profile efektif
  profile_version     integer not null default 0,                                      -- versi terbaru di server
  synced_profile_id   uuid,                                                            -- yang dipakai device
  synced_version      integer not null default 0,
  sync_status         sync_status not null default 'synced',
  force_resync        boolean not null default false,
  last_sync           timestamptz,
  last_error          text
);

-- ===== audit =====
create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.users(id) on delete set null,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  old_data     jsonb,
  new_data     jsonb,
  created_at   timestamptz not null default now()
);
create index idx_audit_created on public.audit_logs(created_at desc);
```

Perbedaan penting dari draf sebelumnya:

* `devices.status` **dihapus**. Status online dihitung dari `last_seen` (BR-13).
* `price` memakai `integer`, bukan `numeric`.
* Assignment punya `group_id` selain `device_id` (PRD §0 #5).
* Sync status menyimpan **profile id** selain versi, supaya perpindahan profile terdeteksi walau nomor versinya kebetulan sama.
* Hash token dipisah ke `device_credentials`.

### 6.2 Profile efektif (BR-03)

```sql
create view public.device_effective_assignments
with (security_invoker = true) as
select d.id as device_id, a.id as assignment_id, a.display_profile_id
from public.devices d
join public.device_profile_assignments a
  on a.is_active
 and (a.device_id = d.id or (d.group_id is not null and a.group_id = d.group_id));
```

Karena indeks unik BR-04 dan aturan BR-06 (device dalam group tidak punya assignment sendiri), tiap device menghasilkan paling banyak **satu** baris.

### 6.3 View untuk API

```sql
create view public.devices_overview with (security_invoker = true) as
select d.id, d.device_uid, d.name, d.device_type,
       d.group_id, g.name as group_name,
       d.firmware_version, d.last_seen, d.ip_address, d.battery, d.signal_strength,
       (d.last_seen is not null and d.last_seen > now() - interval '60 seconds') as is_online,
       s.profile_id, p.name as profile_name, p.is_custom as profile_is_custom,
       s.profile_version, s.synced_version, s.sync_status, s.last_sync, s.last_error,
       d.created_at, d.updated_at
from public.devices d
left join public.device_groups g on g.id = d.group_id
left join public.device_sync_status s on s.device_id = d.id
left join public.display_profiles p on p.id = s.profile_id;

create view public.groups_overview with (security_invoker = true) as
select g.id, g.name, g.description, g.device_type,
       count(d.id)                                         as device_count,
       count(d.id) filter (where d.last_seen > now() - interval '60 seconds') as online_count
from public.device_groups g
left join public.devices d on d.group_id = g.id
group by g.id;

create view public.profiles_overview with (security_invoker = true) as
select p.id, p.name, p.description, p.version, p.is_custom, p.owner_device_id, p.updated_at,
       c.product_name, c.price, c.unit,
       (select count(*) from public.device_effective_assignments e
         where e.display_profile_id = p.id) as device_count
from public.display_profiles p
join public.display_configs c on c.display_profile_id = p.id;
```

Status group (PRD §8.1) dihitung di service: `online_count = device_count` → `online`, `0` → `offline`, selain itu `partial`. Angka 60 detik harus sama dengan PRD §10.1.

### 6.4 Fungsi inti: `refresh_device_sync`

Satu fungsi yang menyelaraskan `device_sync_status` dengan kondisi saat ini. Dipanggil oleh semua trigger di §6.5.

```sql
create or replace function public.refresh_device_sync(p_device_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_profile uuid; v_version int;
begin
  select e.display_profile_id, p.version into v_profile, v_version
    from device_effective_assignments e
    join display_profiles p on p.id = e.display_profile_id
   where e.device_id = p_device_id
   limit 1;

  insert into device_sync_status as s (device_id, profile_id, profile_version, sync_status)
  values (p_device_id, v_profile, coalesce(v_version, 0),
          case when v_profile is null then 'synced' else 'pending' end)
  on conflict (device_id) do update set
    profile_id      = excluded.profile_id,
    profile_version = excluded.profile_version,
    sync_status = case
      when excluded.profile_id is null then 'synced'                                   -- tanpa profile
      when s.synced_profile_id is not distinct from excluded.profile_id
       and s.synced_version = excluded.profile_version and not s.force_resync then 'synced'
      when s.profile_id is not distinct from excluded.profile_id
       and s.profile_version = excluded.profile_version then s.sync_status             -- tidak berubah
      else 'pending'
    end,
    last_error = case when excluded.profile_id is null then null else s.last_error end;
end $$;
```

### 6.5 Trigger

```sql
-- updated_at (pasang di: users, device_groups, devices, display_profiles,
--             display_configs, device_profile_assignments)
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger trg_devices_updated before update on public.devices
  for each row execute function public.set_updated_at();

-- user baru dari auth.users → public.users (role dari allowlist)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, avatar_url, role)
  values (new.id, new.email,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'avatar_url',
          coalesce((select role from public.admin_allowlist where lower(email) = lower(new.email)), 'pending'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- email baru masuk allowlist → role user yang sudah ada ikut naik
create or replace function public.allowlist_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.users set role = new.role where lower(email) = lower(new.email);
  return new;
end $$;
create trigger trg_allowlist after insert or update on public.admin_allowlist
  for each row execute function public.allowlist_sync();

-- device baru → buat baris sync
create or replace function public.trg_device_created() returns trigger
language plpgsql as $$
begin perform public.refresh_device_sync(new.id); return new; end $$;
create trigger trg_device_created after insert on public.devices
  for each row execute function public.trg_device_created();

-- device pindah group: validasi tipe, nonaktifkan assignment individual (BR-06), segarkan sync
create or replace function public.trg_device_group_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.group_id is not null then
    if (select device_type from device_groups where id = new.group_id) <> new.device_type then
      raise exception 'GROUP_TYPE_MISMATCH';
    end if;
    update device_profile_assignments
       set is_active = false where device_id = new.id and is_active;
  end if;
  perform refresh_device_sync(new.id);
  return new;
end $$;
create trigger trg_device_group before update of group_id on public.devices
  for each row when (old.group_id is distinct from new.group_id)
  execute function public.trg_device_group_changed();
-- Catatan: untuk INSERT dengan group_id, validasi tipe dilakukan di service (atau tambahkan trigger BEFORE INSERT serupa).

-- assignment berubah → segarkan device terkait (device langsung / seluruh anggota group)
create or replace function public.trg_assignment_changed() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_dev uuid; v_grp uuid;
begin
  v_dev := case when tg_op = 'DELETE' then old.device_id else new.device_id end;
  v_grp := case when tg_op = 'DELETE' then old.group_id  else new.group_id  end;
  perform refresh_device_sync(d.id) from devices d
   where d.id = v_dev or (v_grp is not null and d.group_id = v_grp);
  return null;
end $$;
create trigger trg_assignment_changed after insert or update or delete
  on public.device_profile_assignments
  for each row execute function public.trg_assignment_changed();

-- config berubah → naikkan versi HANYA jika isi berubah (BR-08), tandai device terkait (BR-14)
create or replace function public.trg_config_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (to_jsonb(old) - 'updated_at') is not distinct from (to_jsonb(new) - 'updated_at') then
    return null;
  end if;
  update display_profiles set version = version + 1 where id = new.display_profile_id;
  perform refresh_device_sync(e.device_id)
    from device_effective_assignments e where e.display_profile_id = new.display_profile_id;
  return null;
end $$;
create trigger trg_config_changed after update on public.display_configs
  for each row execute function public.trg_config_changed();
```

### 6.6 RPC (operasi atomik)

```sql
-- Buat profile + config. Dipakai untuk: create, duplicate, custom profile.
create or replace function public.create_display_profile(
  p_name text, p_description text, p_config jsonb,
  p_created_by uuid, p_owner_device_id uuid default null)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into display_profiles (name, description, created_by, is_custom, owner_device_id)
  values (p_name, p_description, p_created_by, p_owner_device_id is not null, p_owner_device_id)
  returning id into v_id;

  insert into display_configs (display_profile_id, product_name, price, unit, promo_text,
    font_size, font_weight, alignment, brightness, rotation, layout_config)
  values (v_id, p_config->>'product_name', (p_config->>'price')::int,
    nullif(p_config->>'unit',''), nullif(p_config->>'promo_text',''),
    (p_config->>'font_size')::font_size, p_config->>'font_weight',
    (p_config->>'alignment')::text_align, (p_config->>'brightness')::smallint,
    (p_config->>'rotation')::smallint,
    p_config->'layout_config');
  return v_id;
end $$;

-- Simpan config dengan optimistic locking (BR-09). Mengembalikan versi baru.
create or replace function public.update_display_config(
  p_profile_id uuid, p_expected_version int, p_config jsonb)
returns int language plpgsql as $$
declare v_version int;
begin
  select version into v_version from display_profiles where id = p_profile_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_version <> p_expected_version then raise exception 'VERSION_CONFLICT'; end if;

  update display_configs set
    product_name = p_config->>'product_name',
    price        = (p_config->>'price')::int,
    unit         = nullif(p_config->>'unit',''),
    promo_text   = nullif(p_config->>'promo_text',''),
    font_size    = (p_config->>'font_size')::font_size,
    font_weight  = p_config->>'font_weight',
    alignment    = (p_config->>'alignment')::text_align,
    brightness   = (p_config->>'brightness')::smallint,
    rotation     = (p_config->>'rotation')::smallint,
    layout_config= p_config->'layout_config',
    updated_at   = now()
  where display_profile_id = p_profile_id;

  select version into v_version from display_profiles where id = p_profile_id;
  return v_version;
end $$;

-- Assign profile ke banyak target. Mengembalikan {assigned_devices, device_ids}.
create or replace function public.assign_profile(p_profile_id uuid, p_targets jsonb)
returns jsonb language plpgsql as $$
declare t jsonb; v_owner uuid; v_is_custom boolean; v_ids uuid[] := '{}';
begin
  select owner_device_id, is_custom into v_owner, v_is_custom
    from display_profiles where id = p_profile_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  for t in select * from jsonb_array_elements(p_targets) loop
    if t->>'type' = 'group' then
      if v_is_custom then raise exception 'CUSTOM_PROFILE_MISMATCH'; end if;       -- BR-07
      if not exists (select 1 from device_groups where id = (t->>'id')::uuid) then
        raise exception 'NOT_FOUND'; end if;
      update device_profile_assignments set is_active = false
        where group_id = (t->>'id')::uuid and is_active;
      insert into device_profile_assignments (display_profile_id, group_id)
        values (p_profile_id, (t->>'id')::uuid);
      v_ids := v_ids || array(select id from devices where group_id = (t->>'id')::uuid);
    else
      if exists (select 1 from devices where id = (t->>'id')::uuid and group_id is not null) then
        raise exception 'DEVICE_IN_GROUP'; end if;                                 -- BR-06
      if v_is_custom and v_owner <> (t->>'id')::uuid then
        raise exception 'CUSTOM_PROFILE_MISMATCH'; end if;                         -- BR-07
      update device_profile_assignments set is_active = false
        where device_id = (t->>'id')::uuid and is_active;
      insert into device_profile_assignments (display_profile_id, device_id)
        values (p_profile_id, (t->>'id')::uuid);
      v_ids := v_ids || (t->>'id')::uuid;
    end if;
  end loop;

  return jsonb_build_object('assigned_devices', cardinality(v_ids), 'device_ids', to_jsonb(v_ids));
end $$;
```

Pemanggilan dari service: `supabase.rpc('assign_profile', {...})`. Pesan exception (`VERSION_CONFLICT`, `DEVICE_IN_GROUP`, dst.) dipetakan ke kode error API di §8.

### 6.7 Konstanta

| Konstanta | Nilai | Dipakai di |
| --------- | ----- | ---------- |
| Batas offline | 60 detik | view `devices_overview`, `groups_overview`, FE |
| Interval heartbeat | 20 detik (± 5 detik jitter) | firmware |
| Maks ukuran payload config | 4 KB | validasi `layout_config` |

---

## 7. Row Level Security

```sql
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users
                  where id = auth.uid() and role in ('owner','admin'));
$$;

do $$
declare t text;
begin
  foreach t in array array['users','admin_allowlist','device_groups','devices',
    'device_credentials','display_profiles','display_configs',
    'device_profile_assignments','device_sync_status','audit_logs']
  loop execute format('alter table public.%I enable row level security', t); end loop;

  -- admin penuh pada tabel data
  foreach t in array array['device_groups','devices','display_profiles','display_configs',
    'device_profile_assignments','device_sync_status']
  loop
    execute format('create policy "admin all" on public.%I for all
                    using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- users: lihat diri sendiri; admin lihat semua
create policy "self read"  on public.users for select using (id = auth.uid());
create policy "admin read" on public.users for select using (public.is_admin());

-- audit_logs: admin hanya membaca. Penulisan lewat service role dari API.
create policy "admin read" on public.audit_logs for select using (public.is_admin());

-- device_credentials dan admin_allowlist: TANPA policy → hanya service role / SQL editor
```

Catatan:

* Fungsi `security definer` (trigger, `refresh_device_sync`) berjalan dengan hak pemilik sehingga bisa menulis `device_sync_status` walau pemanggil hanya admin biasa.
* Fungsi RPC `create_display_profile`, `update_display_config`, `assign_profile` dibuat `security invoker` (default), sehingga **RLS tetap berlaku** atas pemanggil.
* View memakai `security_invoker = true` agar RLS tabel dasar diterapkan.

### Realtime

```sql
alter publication supabase_realtime add table
  public.devices, public.device_sync_status, public.display_profiles,
  public.device_profile_assignments, public.device_groups;
```

Realtime memakai session admin sehingga RLS berlaku. Lihat §11.

---

## 8. Konvensi API

**Sukses**

```json
{ "data": { }, "meta": { "page": 1, "pageSize": 20, "total": 42 } }
```

`meta` hanya pada endpoint list. Parameter `page` (default 1) dan `pageSize` (default 20, maks 100).

**Error**

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Input tidak valid",
             "details": [{ "path": ["price"], "message": "Harus >= 0" }] } }
```

| HTTP | code | Kapan |
| ---- | ---- | ----- |
| 400 | `VALIDATION_ERROR` | Zod gagal |
| 401 | `UNAUTHENTICATED` | Belum login / token device salah |
| 403 | `FORBIDDEN` | Role tidak cukup |
| 404 | `NOT_FOUND` | Data tidak ada |
| 409 | `CONFLICT` | `device_uid` / nama profile duplikat |
| 409 | `VERSION_CONFLICT` | `expected_version` tidak cocok (BR-09) |
| 409 | `IN_USE` | Hapus profile/group yang masih dipakai tanpa `force` (BR-10, BR-11) |
| 409 | `DEVICE_IN_GROUP` | Assign langsung ke device yang berada dalam group (BR-06) |
| 409 | `GROUP_TYPE_MISMATCH` | Tipe device tidak sama dengan tipe group (BR-02) |
| 409 | `CUSTOM_PROFILE_MISMATCH` | Profile custom di-assign ke selain pemiliknya (BR-07) |
| 429 | `RATE_LIMITED` | Rate limit device |
| 500 | `INTERNAL_ERROR` | Tak terduga (tanpa detail internal) |

Pemetaan error RPC: `error.message` dari Postgres yang cocok dengan salah satu kode di atas diteruskan sebagai kode itu. Pesan lain menjadi `INTERNAL_ERROR` dan dicatat di log server.

Pembungkus handler:

```ts
// lib/http/with-api.ts
export const withApi = (fn: (req: Request, ctx: any) => Promise<Response>) =>
  async (req: Request, ctx: any) => {
    try { return await fn(req, ctx); }
    catch (e) { return toErrorResponse(e); }   // AppError, ZodError, error RPC
  };
```

---

## 9. API Admin

Semua endpoint berikut membutuhkan session admin.

### 9.1 Devices

| Method | Path | Deskripsi |
| ------ | ---- | --------- |
| GET | `/api/devices` | List dari `devices_overview`. Query: `type`, `group_id`, `online` (true/false), `sync_status`, `q`, `page`, `pageSize` |
| GET | `/api/devices/[id]` | Detail + sumber profile |
| POST | `/api/devices` | Daftarkan device. Mengembalikan `device_token` sekali saja |
| PATCH | `/api/devices/[id]` | Ubah `name` dan/atau `group_id` |
| DELETE | `/api/devices/[id]` | Hapus device |
| POST | `/api/devices/[id]/rotate-token` | Buat token baru, token lama langsung tidak berlaku |
| POST | `/api/devices/[id]/custom-profile` | Buat profile custom untuk device |
| GET | `/api/devices/[id]/sync` | Status sync |
| POST | `/api/devices/[id]/sync` | Force re-sync |

**POST /api/devices**

```json
// request
{ "device_uid": "ESP32C6-A001", "name": "C6 #01", "device_type": "esp32_c6", "group_id": null }

// 201
{ "data": { "id": "uuid", "device_uid": "ESP32C6-A001", "device_token": "dpt_xxxxxxxx" } }
```

Langkah service: insert `devices` (trigger membuat baris sync) → generate token → insert hash ke `device_credentials` → audit `device.create`. Jika insert kredensial gagal, device dihapus kembali.

**GET /api/devices (item)**

```json
{
  "id": "uuid", "device_uid": "LILYGO-S3-001", "name": "LilyGO #01", "device_type": "lilygo_s3",
  "group": null,
  "status": "online",
  "last_seen": "2026-10-02T10:20:05Z",
  "firmware_version": "1.0.0",
  "profile": { "id": "uuid", "name": "Es Teh", "version": 3, "source": "device", "is_custom": false },
  "sync": { "status": "synced", "profile_version": 3, "synced_version": 3, "last_sync": "..." }
}
```

* `status` dihitung dari `is_online`.
* `profile.source`: `group` jika diwariskan dari group, selain itu `device`. `profile: null` jika tidak ada profile ("No profile").

**PATCH /api/devices/[id]**

* Memasukkan ke group (`group_id` diisi): trigger memvalidasi tipe (`GROUP_TYPE_MISMATCH`), menonaktifkan assignment individual, dan menyegarkan sync (BR-06).
* Mengeluarkan dari group (`group_id: null`): device menjadi tanpa profile.
* `device_type` dan `device_uid` tidak bisa diubah.

**POST /api/devices/[id]/custom-profile**

```json
{ "from_profile_id": "uuid-opsional", "name": "Custom LilyGO #01" }
```

Hanya untuk device tanpa group (`DEVICE_IN_GROUP` bila melanggar). Service menyalin config dari `from_profile_id` (atau dari profile efektif saat ini, atau default) lewat `create_display_profile(..., owner_device_id)`, lalu memanggil `assign_profile`. Jika device sudah punya custom profile → `CONFLICT`.

### 9.2 Groups

| Method | Path | Deskripsi |
| ------ | ---- | --------- |
| GET | `/api/groups` | List dari `groups_overview` + `status` (online/partial/offline) + profile group |
| GET | `/api/groups/[id]` | Detail + anggota + status sync tiap anggota |
| POST | `/api/groups` | Buat group |
| PATCH | `/api/groups/[id]` | Ubah nama/deskripsi |
| DELETE | `/api/groups/[id]` | Hapus. Group berisi device → `IN_USE`, kecuali `?force=true` |
| POST | `/api/groups/[id]/devices` | Tambah anggota `{ "device_ids": ["uuid"] }` |
| DELETE | `/api/groups/[id]/devices` | Keluarkan anggota `{ "device_ids": ["uuid"] }` |

```json
// POST /api/groups
{ "name": "ESP32-C6 Group 01", "device_type": "esp32_c6", "description": "Meja kasir" }
```

`force=true` pada DELETE: device dikeluarkan dari group (`group_id → null`, otomatis tanpa profile) lalu group dihapus (assignment group ikut terhapus lewat cascade).

### 9.3 Display Profiles

| Method | Path | Deskripsi |
| ------ | ---- | --------- |
| GET | `/api/display-profiles` | List dari `profiles_overview` (tanpa custom, kecuali `?include_custom=true`) |
| GET | `/api/display-profiles/[id]` | Detail + config penuh + target yang memakai |
| POST | `/api/display-profiles` | Buat profile (+ config). Mendukung `duplicate_from` |
| PATCH | `/api/display-profiles/[id]` | Ubah metadata dan/atau config |
| DELETE | `/api/display-profiles/[id]` | Hapus. Masih dipakai → `IN_USE`, kecuali `?force=true` |

**POST**

```json
{
  "name": "Es Teh",
  "description": "Menu minuman",
  "config": {
    "product_name": "ES TEH", "price": 5000, "unit": "gelas",
    "promo_text": "SEGAR SETIAP HARI",
    "font_size": "large", "font_weight": "bold", "alignment": "center",
    "brightness": 80, "rotation": 0,
    "layout_config": { "schema_version": 1, "mode": "auto", "elements": {} }
  }
}
```

Field config yang tidak dikirim diisi default oleh Zod (PRD §9.1) sebelum RPC dipanggil.

**Duplicate**

```json
{ "name": "Es Teh (Copy)", "duplicate_from": "uuid-profile-asal" }
```

Hasilnya versi 1, tanpa assignment.

**PATCH**

```json
{
  "name": "Es Teh Manis",
  "expected_version": 3,
  "config": { "price": 6000 }
}
```

Langkah service:

1. Metadata (`name`, `description`) diperbarui langsung. **Tidak** menaikkan versi (BR-08).
2. Jika `config` ada, `expected_version` **wajib**. Service membaca config saat ini, menggabungkan patch, memvalidasi hasil penuh dengan Zod, lalu memanggil `update_display_config`.
3. Versi tidak cocok → `409 VERSION_CONFLICT`. Respons menyertakan `current_version` agar FE bisa memuat ulang.
4. Jika hasil gabungan sama persis dengan config lama, versi tidak naik (dijaga trigger).
5. Audit `profile.update` dengan `old_data` / `new_data` hanya berisi field yang berubah (mis. `{ "price": 5000 }` → `{ "price": 6000 }`).

```json
// 200
{ "data": { "id": "uuid", "version": 4 } }
```

### 9.4 Assignments

| Method | Path | Deskripsi |
| ------ | ---- | --------- |
| GET | `/api/assignments` | Assignment aktif. Query: `profile_id`, `device_id`, `group_id` |
| POST | `/api/assignments` | Assign profile ke group dan/atau device |
| DELETE | `/api/assignments/[id]` | Lepas assignment (target menjadi tanpa profile) |

```json
// POST
{
  "display_profile_id": "uuid",
  "targets": [
    { "type": "group",  "id": "uuid-group-c6-01" },
    { "type": "device", "id": "uuid-lilygo-01" }
  ]
}

// 201
{ "data": { "assigned_devices": 3, "device_ids": ["...", "...", "..."], "replaced": 1 } }
```

Perilaku (dijalankan atomik oleh `assign_profile`):

* Target `group` berlaku untuk semua anggota sekarang **dan anggota yang masuk kemudian** (BR-03).
* Target `device` ditolak jika device berada dalam group (`DEVICE_IN_GROUP`).
* Assignment aktif lama pada target yang sama dinonaktifkan (BR-04).
* Profile custom hanya boleh untuk device pemiliknya (`CUSTOM_PROFILE_MISMATCH`).
* Trigger menyegarkan sync seluruh device terdampak menjadi `pending`.
* `replaced` = jumlah target yang sebelumnya sudah punya assignment aktif (untuk peringatan di UI).
* Audit `assignment.create`.

### 9.5 Sync (sisi admin)

```json
// GET /api/devices/[id]/sync
{
  "data": {
    "device_id": "uuid", "profile_id": "uuid",
    "profile_version": 3, "synced_version": 2,
    "sync_status": "pending", "last_sync": "2026-10-02T10:00:00Z", "last_error": null
  }
}
```

`POST /api/devices/[id]/sync` (force re-sync): set `force_resync = true` dan `sync_status = 'pending'`. Device akan menerima `config_outdated = true` pada heartbeat berikutnya, bahkan bila versinya sama. Flag dibersihkan saat `sync-ack` sukses. Audit `sync.force`.

### 9.6 Dashboard summary

`GET /api/dashboard/summary`

```json
{
  "data": {
    "total_devices": 5, "online": 4, "offline": 1,
    "groups": 2,
    "pending_sync": 1
  }
}
```

`pending_sync` = jumlah device dengan `sync_status` ∈ {`pending`, `syncing`, `failed`} dan memiliki profile.

---

## 10. API Device (Firmware)

Semua memakai `deviceAuth` (§5.5), `export const dynamic = "force-dynamic"`, dan rate limit (mis. 10 request/menit per device). `device_id` selalu diambil dari hasil `deviceAuth`, tidak dari body.

### 10.1 `POST /api/device/heartbeat`

```json
// request
{
  "firmware_version": "1.0.0",
  "current_profile_id": "uuid-atau-null",
  "current_profile_version": 2,
  "ip_address": "192.168.1.20",
  "battery": 87,
  "signal_strength": -61,
  "timestamp": "2026-10-02T10:20:05Z"
}
```

Logika:

```text
1. UPDATE devices SET last_seen = now() (waktu server), firmware_version, ip_address,
   battery, signal_strength.
2. Baca device_sync_status (profile efektif + versi terbaru).
3. Jika profile_id null → config_outdated=false, latest_* = null.
4. outdated = force_resync
          OR current_profile_id  <> profile_id
          OR current_profile_version <> profile_version
5. Jika NOT outdated dan sync_status ≠ 'synced'   (self-healing, PRD §11.2)
     → set synced_profile_id, synced_version, sync_status='synced', last_sync=now().
```

```json
// 200
{
  "data": {
    "server_time": "2026-10-02T10:20:05Z",
    "config_outdated": true,
    "latest_profile_id": "uuid",
    "latest_version": 3
  }
}
```

Timestamp dari device hanya informatif dan tidak dipakai untuk `last_seen`.

### 10.2 `GET /api/device/config`

Mengembalikan config profile efektif device.

```json
{
  "data": {
    "profile_id": "uuid",
    "version": 3,
    "device_type": "lilygo_s3",
    "config": {
      "product_name": "ES TEH", "price": 5000, "unit": "gelas",
      "promo_text": "SEGAR SETIAP HARI",
      "font_size": "large", "font_weight": "bold", "alignment": "center",
      "brightness": 80, "rotation": 0,
      "layout_config": { "schema_version": 1, "mode": "auto", "elements": {} }
    }
  }
}
```

* Header `ETag: "<profile_id>:<version>"`. Jika `If-None-Match` cocok dan `force_resync = false` → `304`.
* Device belum punya profile → `204 No Content`.
* Jika `sync_status` saat ini `pending` atau `failed` → ubah menjadi `syncing`.
* Nilai dikirim apa adanya (enum string, harga integer). **Pemformatan** (`Rp15.000`, ukuran font relatif) dilakukan firmware sesuai PRD §9.2.

### 10.3 `POST /api/device/sync-ack`

```json
{ "profile_id": "uuid", "version": 3, "success": true }
{ "profile_id": "uuid", "version": 3, "success": false, "error": "unsupported_schema" }
```

* `success: true`: set `synced_profile_id`, `synced_version`, `last_sync = now()`, `force_resync = false`, `last_error = null`, lalu `refresh_device_sync` menentukan status. Jika ack untuk versi yang sudah usang (ada versi lebih baru) status tetap `pending`.
* `success: false`: hanya diterapkan bila `profile_id` dan `version` sama dengan profile efektif saat ini. Set `sync_status = 'failed'` dan `last_error` (dipotong 200 karakter). Ack usang diabaikan.
* Response `200 { "data": { "ok": true } }`.

### 10.4 Alur lengkap

```text
Admin Save (PATCH, expected_version=3)
  → update_display_config → trigger: version 4, device terkait = pending
  → Realtime → dashboard: badge Pending
Device heartbeat berikutnya (≤ 20 dtk) → config_outdated = true
Device GET /config            → status syncing
Device render ulang layar
Device POST /sync-ack         → status synced → Realtime → dashboard ✓ Synced
```

---

## 11. Realtime

| Tabel | Event | Dipakai untuk |
| ----- | ----- | ------------- |
| `devices` | UPDATE | last seen, firmware, IP, sinyal |
| `device_sync_status` | INSERT/UPDATE | badge Synced/Pending/Syncing/Failed |
| `display_profiles` | UPDATE | versi baru |
| `device_profile_assignments` | INSERT/UPDATE/DELETE | perubahan assignment |
| `device_groups` | INSERT/UPDATE/DELETE | daftar group |

Catatan:

* Hanya dashboard (session admin) yang berlangganan. Device memakai heartbeat + polling.
* `last_seen` berubah tiap 20 detik per device. Berlangganan `devices` hanya di halaman `/dashboard`, `/devices`, `/groups` agar tidak boros koneksi.
* **Offline tidak punya event.** FE menghitung `is_online` dari `last_seen` terhadap batas 60 detik, dengan timer berkala (mis. 10 detik).
* Pengiriman instan ke device (Supabase Broadcast per device) adalah fitur lanjutan.

---

## 12. Validasi (Zod)

Skema ini adalah sumber kebenaran aturan PRD §9.1.

```ts
// lib/validations/profile.ts
import { z } from "zod";

const element = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  font_size: z.enum(["small", "medium", "large", "xlarge"]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
}).strict();

export const layoutConfigSchema = z.object({
  schema_version: z.literal(1),
  mode: z.enum(["auto", "custom"]),
  elements: z.object({
    product: element.optional(),
    price: element.optional(),
    promo: element.optional(),
  }).strict(),
}).strict().refine(v => JSON.stringify(v).length <= 4096, "layout_config terlalu besar");

export const displayConfigSchema = z.object({
  product_name: z.string().trim().min(1).max(32),
  price: z.number().int().min(0).max(999_999_999),
  unit: z.string().trim().max(16).nullish().transform(v => v || null),
  promo_text: z.string().trim().max(48).nullish().transform(v => v || null),
  font_size: z.enum(["small", "medium", "large", "xlarge"]).default("large"),
  font_weight: z.enum(["normal", "bold"]).default("bold"),
  alignment: z.enum(["left", "center", "right"]).default("center"),
  brightness: z.number().int().min(5).max(100).default(80),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).default(0),
  layout_config: layoutConfigSchema.default({ schema_version: 1, mode: "auto", elements: {} }),
});

export const createProfileSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().max(255).nullish(),
  config: displayConfigSchema.optional(),
  duplicate_from: z.string().uuid().optional(),
}).refine(v => v.config || v.duplicate_from, "config atau duplicate_from wajib diisi");

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  description: z.string().max(255).nullish(),
  expected_version: z.number().int().min(1).optional(),
  config: displayConfigSchema.partial().optional(),
}).refine(v => !v.config || v.expected_version !== undefined,
          { message: "expected_version wajib saat mengubah config", path: ["expected_version"] });
```

```ts
// lib/validations/device.ts
export const createDeviceSchema = z.object({
  device_uid: z.string().regex(/^[A-Z0-9-]{3,40}$/),
  name: z.string().trim().min(1).max(60),
  device_type: z.enum(["esp32_c6", "lilygo_s3"]),
  group_id: z.string().uuid().nullish(),
});
export const updateDeviceSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  group_id: z.string().uuid().nullable().optional(),
});

// lib/validations/group.ts
export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(60),
  device_type: z.literal("esp32_c6"),            // BR-02, longgarkan saat group LilyGO dibuka
  description: z.string().max(255).nullish(),
});

// lib/validations/assignment.ts
export const createAssignmentSchema = z.object({
  display_profile_id: z.string().uuid(),
  targets: z.array(z.object({
    type: z.enum(["device", "group"]), id: z.string().uuid(),
  })).min(1).max(100),
});

// lib/validations/device-api.ts
export const heartbeatSchema = z.object({
  firmware_version: z.string().max(32),
  current_profile_id: z.string().uuid().nullable(),
  current_profile_version: z.number().int().min(0),
  ip_address: z.string().ip().optional(),
  battery: z.number().int().min(0).max(100).optional(),
  signal_strength: z.number().int().min(-120).max(0).optional(),
  timestamp: z.string().datetime().optional(),
});
export const syncAckSchema = z.object({
  profile_id: z.string().uuid(),
  version: z.number().int().min(1),
  success: z.boolean(),
  error: z.string().max(200).optional(),
});
```

---

## 13. Audit Log

MVP **menulis** log (tanpa halaman viewer). Penulisan lewat service-role client agar `user_id` tidak bisa dipalsukan dari client.

| action | Dipicu oleh |
| ------ | ----------- |
| `device.create` / `update` / `delete` / `rotate_token` | Device |
| `group.create` / `update` / `delete` / `members` | Group |
| `profile.create` / `update` / `delete` / `duplicate` | Profile |
| `assignment.create` / `delete` | Assignment |
| `sync.force` | Force re-sync |

```ts
await writeAudit({
  userId: user.id, action: "profile.update",
  entityType: "display_profile", entityId: id,
  oldData: { price: 5000 }, newData: { price: 6000 },
});
```

Jangan menyimpan token atau hash token di `old_data` / `new_data`.

---

## 14. Keamanan

1. RLS aktif di semua tabel. Tabel `device_credentials` dan `admin_allowlist` tanpa policy (hanya service role).
2. Semua input divalidasi Zod. Gunakan `.strict()` pada objek JSON yang disimpan agar field liar tidak masuk ke `layout_config`.
3. `SUPABASE_SERVICE_ROLE_KEY` hanya di server dan hanya dipakai oleh `lib/supabase/admin.ts`.
4. Token device: acak 32 byte, hanya hash yang disimpan, `timingSafeEqual`, dapat dirotasi. Pesan error sama untuk UID salah dan token salah.
5. Rate limit `/api/device/*` (Upstash Ratelimit atau Vercel Firewall).
6. API admin same-origin saja. Endpoint device tidak memakai cookie.
7. Error ke client tidak membocorkan pesan Postgres.
8. Server Actions hanya untuk login/logout dan tetap memakai guard yang sama.

---

## 15. Deployment

* Route handler bersifat serverless, jadi tidak boleh menyimpan state di memori.
* Endpoint device: `export const dynamic = "force-dynamic"`.
* Migrasi disimpan di `supabase/migrations/` dan dijalankan dengan Supabase CLI. Tipe TS dibuat dengan `supabase gen types typescript`.
* Tambahkan domain production dan preview Vercel pada Supabase Auth → URL Configuration (redirect Google OAuth).
* Urutan migrasi: enum → tabel → view efektif → fungsi/trigger → RPC → RLS → publikasi Realtime → seed allowlist.

---

## 16. Rencana Implementasi

Selaras dengan PRD §17.

| Fase | Pekerjaan backend | Selesai jika |
| ---- | ----------------- | ------------ |
| 1 Foundation | Project, Supabase, env, migrasi awal (§6.1–6.3), deploy | App live terhubung ke DB |
| 2 Authentication | OAuth, callback, middleware, `requireAdmin`, trigger user & allowlist | AC-AUTH |
| 3 Device | `/api/devices`, token, `deviceAuth`, heartbeat (langkah 1–3), view overview | AC-DEV |
| 4 Groups | `/api/groups`, anggota, trigger perpindahan group | AC-GRP |
| 5 Display Profiles | `/api/display-profiles`, RPC create & update, trigger versi, audit | AC-PRF |
| 6 Display Editor | Skema Zod config dan layout, `lib/display` bersama FE | AC-DSP |
| 7 Assignment | `assign_profile`, `/api/assignments`, custom profile, trigger refresh | AC-ASG |
| 8 Realtime & Sync | `config`, `sync-ack`, force sync, self-healing, publikasi Realtime | AC-SYNC |

---

## 17. Pemetaan PRD → Backend

| Persyaratan PRD | Implementasi |
| --------------- | ------------ |
| BR-01 | CHECK regex `device_uid` + unique |
| BR-02 | CHECK `group_mvp_type`, trigger `GROUP_TYPE_MISMATCH` |
| BR-03 | View `device_effective_assignments` |
| BR-04 | Dua unique index parsial pada assignment |
| BR-05 | Tidak ada constraint unik pada profile → target |
| BR-06 | `trg_device_group_changed`, cek di `assign_profile` |
| BR-07 | CHECK `custom_has_owner`, `uq_custom_per_device`, cek di `assign_profile` |
| BR-08 | `trg_config_changed` (bandingkan isi) |
| BR-09 | `update_display_config` + `expected_version` |
| BR-10, BR-11 | `IN_USE` + `force` di service |
| BR-12 | Kolom `price integer` |
| BR-13 | `is_online` di view, tanpa kolom status |
| BR-14 | `refresh_device_sync` dipanggil semua trigger |
| §10 Protokol device | §10 dokumen ini |
| §11 State machine | `refresh_device_sync`, heartbeat self-healing, `config`, `sync-ack` |
| §12 Realtime | §11 dokumen ini |

---

## 18. Acceptance Criteria Backend

**AC-AUTH**
- [ ] Login Google membuat baris `public.users`. Email allowlist → `admin`, lainnya → `pending`.
- [ ] Role `pending` tidak bisa membaca data apa pun (RLS) dan API admin → `403`.
- [ ] `/api/*` admin tanpa session → `401`.

**AC-DEV**
- [ ] `device_uid` duplikat → `409 CONFLICT`. Format salah → `400`.
- [ ] Token hanya muncul di response `POST /api/devices` dan `rotate-token`.
- [ ] Token lama ditolak setelah rotate.
- [ ] Heartbeat memperbarui `last_seen`. Device tanpa heartbeat > 60 detik `status: offline`.
- [ ] Token/UID salah → `401` dengan pesan yang sama.

**AC-GRP**
- [ ] Dua atau lebih ESP32-C6 dapat dalam satu group. LilyGO ke group ESP32-C6 → `GROUP_TYPE_MISMATCH`.
- [ ] Assign profile ke group → semua anggota menerima config identik dari `/api/device/config`.
- [ ] Device yang ditambahkan ke group kemudian otomatis mengikuti profile group dan berstatus `pending`.
- [ ] Device masuk group → assignment individualnya nonaktif. Keluar group → tanpa profile.
- [ ] Hapus group berisi device → `IN_USE`. Dengan `force=true` berhasil.

**AC-PRF**
- [ ] Create, edit, duplicate, delete berfungsi. Duplikat mulai dari versi 1.
- [ ] PATCH config yang mengubah isi menaikkan versi tepat 1. PATCH nama saja atau config identik tidak menaikkan versi.
- [ ] `expected_version` usang → `409 VERSION_CONFLICT` dengan `current_version`.
- [ ] Hapus profile yang dipakai → `IN_USE`. Dengan `force=true` berhasil dan device terkait menjadi tanpa profile.

**AC-DSP**
- [ ] Semua field PRD §9.1 tersimpan dan divalidasi (batas, default, enum).
- [ ] `layout_config` dengan `schema_version`/field tidak dikenal ditolak (`400`).

**AC-ASG**
- [ ] LilyGO dapat memakai profile bersama maupun berbeda dari device lain.
- [ ] Custom profile tidak muncul di `GET /api/display-profiles` dan hanya bisa di-assign ke pemiliknya.
- [ ] Assign ke device dalam group → `DEVICE_IN_GROUP`.
- [ ] Assign baru menggantikan assignment lama secara atomik (tidak ada keadaan dua assignment aktif).

**AC-SYNC**
- [ ] Perubahan config / assignment / pindah group → device terkait `pending`.
- [ ] Heartbeat dengan versi tertinggal → `config_outdated: true`.
- [ ] `GET /config` → `syncing`. `sync-ack` sukses → `synced` + `synced_version` terisi.
- [ ] `sync-ack` gagal → `failed` + `last_error`. Heartbeat berikutnya → `config_outdated: true`.
- [ ] Ack usang (versi lebih lama dari terbaru) tidak membuat status `synced`.
- [ ] Heartbeat yang melaporkan versi terbaru memulihkan status ke `synced` walau ack hilang.
- [ ] Force re-sync membuat `config_outdated: true` walau versi sama.
- [ ] Dashboard menerima perubahan status via Realtime tanpa refresh.

**AC-SEC**
- [ ] RLS aktif di semua tabel. `device_credentials` tidak bisa dibaca dengan anon/authenticated key.
- [ ] Hash token dan service role key tidak pernah muncul di response atau bundle client.
- [ ] Error Postgres mentah tidak pernah sampai ke client.

---

## 19. Catatan Implementasi

1. **Insert device dengan `group_id` langsung:** trigger validasi tipe hanya aktif untuk UPDATE. Untuk INSERT, validasi tipe dilakukan di service, atau tambahkan trigger BEFORE INSERT serupa.
2. **Hardware:** `lib/display/devices.ts` berisi `esp32_c6: 172×320` dan `lilygo_s3: 170×320` serta font preset 12/18/28/40 px (PRD §20). Perangkat tanpa tombol dan selalu menyala, jadi tidak ada field sleep.
3. **Group LilyGO di masa depan:** hapus `group_mvp_type`, longgarkan `createGroupSchema`. Logika efektif dan assignment sudah mendukungnya tanpa perubahan lain.
4. **Riwayat versi/rollback:** belum ada. Nilai lama hanya tersedia di `audit_logs`. Jika dibutuhkan, tambahkan tabel `display_config_versions` yang diisi oleh `trg_config_changed`.