-- ============================================================
-- MIGRATION 04: Security Definer functions untuk Device API
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Fungsi untuk membaca sync status (bypass RLS)
create or replace function public.get_device_sync_status(p_device_id uuid)
returns table (
  device_id uuid, profile_id uuid, profile_version int,
  synced_profile_id uuid, synced_version int,
  sync_status text, force_resync boolean,
  last_sync timestamptz, last_error text
)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select s.device_id, s.profile_id, s.profile_version,
           s.synced_profile_id, s.synced_version,
           s.sync_status::text, s.force_resync,
           s.last_sync, s.last_error
      from device_sync_status s
     where s.device_id = p_device_id;
end $$;

-- Fungsi untuk menandai device sudah synced (bypass RLS)
create or replace function public.mark_device_synced(
  p_device_id uuid,
  p_profile_id uuid,
  p_profile_version int
)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into device_sync_status as s (
    device_id, profile_id, profile_version,
    synced_profile_id, synced_version,
    sync_status, force_resync, last_sync, last_error
  )
  values (
    p_device_id, p_profile_id, p_profile_version,
    p_profile_id, p_profile_version,
    'synced', false, now(), null
  )
  on conflict (device_id) do update set
    profile_id        = p_profile_id,
    profile_version   = p_profile_version,
    synced_profile_id = p_profile_id,
    synced_version    = p_profile_version,
    sync_status       = 'synced',
    force_resync      = false,
    last_sync         = now(),
    last_error        = null;
end $$;

-- Fungsi untuk menandai sync gagal (bypass RLS)
create or replace function public.mark_device_sync_failed(
  p_device_id uuid,
  p_profile_id uuid,
  p_profile_version int,
  p_error text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into device_sync_status as s (
    device_id, profile_id, profile_version,
    sync_status, force_resync, last_error
  )
  values (
    p_device_id, p_profile_id, p_profile_version,
    'failed', false, left(p_error, 200)
  )
  on conflict (device_id) do update set
    profile_id      = p_profile_id,
    profile_version = p_profile_version,
    sync_status     = 'failed',
    last_error      = left(p_error, 200);
end $$;

-- Grant ke anon dan authenticated
grant execute on function public.get_device_sync_status(uuid) to anon, authenticated;
grant execute on function public.mark_device_synced(uuid, uuid, int) to anon, authenticated;
grant execute on function public.mark_device_sync_failed(uuid, uuid, int, text) to anon, authenticated;

-- Verifikasi
select 'Migration 04 berhasil!' as status;
