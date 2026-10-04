-- ============================================================
-- MIGRATION 06: Fix verify_device_token RPC type mismatch (inet -> text)
-- Jalankan di Supabase SQL Editor
-- ============================================================

create or replace function public.verify_device_token(p_uid text, p_token text)
returns table (
  id uuid, device_uid text, name text, device_type text,
  group_id uuid, firmware_version text, last_seen timestamptz,
  ip_address text, battery int, signal_strength int,
  created_at timestamptz, updated_at timestamptz
)
language plpgsql security definer set search_path = public as $$
declare
  v_device_id uuid;
  v_token_hash text;
begin
  -- Cari device berdasarkan device_uid (case insensitive)
  select d.id into v_device_id
    from public.devices d
   where upper(d.device_uid) = upper(trim(p_uid))
   limit 1;

  if v_device_id is null then
    return; -- tidak ditemukan
  end if;

  -- Ambil token_hash (limit 1 untuk keamanan)
  select dc.token_hash into v_token_hash
    from public.device_credentials dc
   where dc.device_id = v_device_id
   limit 1;

  -- Bandingkan token
  if v_token_hash is null or trim(v_token_hash) <> trim(p_token) then
    return; -- token salah
  end if;

  -- Return data device dengan cast d.ip_address::text
  return query
    select d.id, d.device_uid, d.name, d.device_type::text,
           d.group_id, d.firmware_version, d.last_seen,
           d.ip_address::text, d.battery, d.signal_strength,
           d.created_at, d.updated_at
      from public.devices d
     where d.id = v_device_id;
end $$;

grant execute on function public.verify_device_token(text, text) to anon, authenticated;

select 'Migration 06 (verify_device_token fix) berhasil diterapkan!' as status;
