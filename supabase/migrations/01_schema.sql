-- Smart Price Display Management Dashboard Migration Script
-- Version: 1.1
-- Compatible with Supabase PostgreSQL (Auth, Realtime, RLS)

-- ===== 1. ENUMS =====
create type device_type as enum ('esp32_c6', 'lilygo_s3');
create type sync_status as enum ('synced', 'pending', 'syncing', 'failed');
create type user_role   as enum ('owner', 'admin', 'editor', 'viewer', 'pending');
create type font_size   as enum ('small', 'medium', 'large', 'xlarge');
create type text_align  as enum ('left', 'center', 'right');

-- ===== 2. TABLES =====
-- Allowlist Admin
create table public.admin_allowlist (
  email       text primary key,
  role        user_role not null default 'admin',
  created_at  timestamptz not null default now()
);

-- Users (1:1 with auth.users)
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text,
  avatar_url  text,
  role        user_role not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Groups
create table public.device_groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  device_type  device_type not null default 'esp32_c6',
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint group_mvp_type check (device_type = 'esp32_c6')   -- BR-02
);

-- Devices
create table public.devices (
  id                uuid primary key default gen_random_uuid(),
  device_uid        text not null unique check (device_uid ~ '^[A-Z0-9-]{3,40}$'),  -- BR-01
  name              text not null,
  device_type       device_type not null,
  group_id          uuid references public.device_groups(id) on delete set null,
  firmware_version  text,
  last_seen         timestamptz,
  ip_address        inet,
  battery           smallint check (battery between 0 and 100),
  signal_strength   smallint,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_devices_group on public.devices(group_id);
create index idx_devices_last_seen on public.devices(last_seen);

-- Separate credentials table (hash device token)
create table public.device_credentials (
  device_id   uuid primary key references public.devices(id) on delete cascade,
  token_hash  text not null,
  created_at  timestamptz not null default now(),
  rotated_at  timestamptz
);

-- Display Profiles
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

-- Display Configs
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

-- Assignments
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

-- Sync Status
create table public.device_sync_status (
  device_id           uuid primary key references public.devices(id) on delete cascade,
  profile_id          uuid references public.display_profiles(id) on delete set null,
  profile_version     integer not null default 0,
  synced_profile_id   uuid,
  synced_version      integer not null default 0,
  sync_status         sync_status not null default 'synced',
  force_resync        boolean not null default false,
  last_sync           timestamptz,
  last_error          text
);

-- Audit Logs
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

-- ===== 3. VIEWS =====
-- Profile Efektif (BR-03)
create view public.device_effective_assignments
with (security_invoker = true) as
select d.id as device_id, a.id as assignment_id, a.display_profile_id
from public.devices d
join public.device_profile_assignments a
  on a.is_active
 and (a.device_id = d.id or (d.group_id is not null and a.group_id = d.group_id));

-- Devices Overview
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

-- Groups Overview
create view public.groups_overview with (security_invoker = true) as
select g.id, g.name, g.description, g.device_type,
       count(d.id) as device_count,
       count(d.id) filter (where d.last_seen > now() - interval '60 seconds') as online_count
from public.device_groups g
left join public.devices d on d.group_id = g.id
group by g.id;

-- Profiles Overview
create view public.profiles_overview with (security_invoker = true) as
select p.id, p.name, p.description, p.version, p.is_custom, p.owner_device_id, p.updated_at,
       c.product_name, c.price, c.unit,
       (select count(*) from public.device_effective_assignments e
         where e.display_profile_id = p.id) as device_count
from public.display_profiles p
join public.display_configs c on c.display_profile_id = p.id;

-- ===== 4. FUNCTIONS & STORED PROCEDURES (RPC) =====
-- refresh_device_sync: Melakukan kalkulasi state machine sync
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
          case when v_profile is null then 'synced'::sync_status else 'pending'::sync_status end)
  on conflict (device_id) do update set
    profile_id      = excluded.profile_id,
    profile_version = excluded.profile_version,
    sync_status = case
      when excluded.profile_id is null then 'synced'::sync_status
      when s.synced_profile_id is not distinct from excluded.profile_id
       and s.synced_version = excluded.profile_version and not s.force_resync then 'synced'::sync_status
      when s.profile_id is not distinct from excluded.profile_id
       and s.profile_version = excluded.profile_version then s.sync_status
      else 'pending'::sync_status
    end,
    last_error = case when excluded.profile_id is null then null else s.last_error end;
end $$;

-- RPC: create_display_profile
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

-- RPC: update_display_config (Optimistic Locking BR-09)
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

-- RPC: assign_profile (Atomic multi-target assignment BR-03 - BR-07)
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

-- ===== 5. TRIGGERS =====
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_devices_updated before update on public.devices
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, avatar_url, role)
  values (new.id, new.email,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'avatar_url',
          coalesce((select role from public.admin_allowlist where lower(email) = lower(new.email)), 'pending'::user_role));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.allowlist_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.users set role = new.role where lower(email) = lower(new.email);
  return new;
end $$;

create trigger trg_allowlist after insert or update on public.admin_allowlist
  for each row execute function public.allowlist_sync();

create or replace function public.trg_device_created() returns trigger
language plpgsql as $$
begin perform public.refresh_device_sync(new.id); return new; end $$;

create trigger trg_device_created after insert on public.devices
  for each row execute function public.trg_device_created();

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

-- ===== 6. SECURITY & RLS =====
alter table public.users enable row level security;
alter table public.admin_allowlist enable row level security;
alter table public.device_groups enable row level security;
alter table public.devices enable row level security;
alter table public.device_credentials enable row level security;
alter table public.display_profiles enable row level security;
alter table public.display_configs enable row level security;
alter table public.device_profile_assignments enable row level security;
alter table public.device_sync_status enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users
                  where id = auth.uid() and role in ('owner','admin'));
$$;

create policy "admin all" on public.device_groups for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.devices for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.display_profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.display_configs for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.device_profile_assignments for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.device_sync_status for all using (public.is_admin()) with check (public.is_admin());

create policy "self read"  on public.users for select using (id = auth.uid());
create policy "admin read" on public.users for select using (public.is_admin());
create policy "admin read" on public.audit_logs for select using (public.is_admin());

-- ===== 7. REALTIME PUBLICATION =====
alter publication supabase_realtime add table
  public.devices, public.device_sync_status, public.display_profiles,
  public.device_profile_assignments, public.device_groups;

-- ===== 8. SEED INITIAL DATA =====
insert into public.admin_allowlist (email, role) values
  ('admin@email.com', 'admin'),
  ('you@gmail.com', 'owner')
on conflict (email) do nothing;
