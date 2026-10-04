-- ============================================================
-- JALANKAN SCRIPT INI DI SUPABASE SQL EDITOR
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- 1. Fungsi verify_device_token (SECURITY DEFINER = bypass RLS)
--    Digunakan oleh API backend untuk memverifikasi token ESP32
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
    return; -- kosong = tidak valid
  end if;

  -- Ambil token hash dari device_credentials (bypass RLS karena security definer)
  select dc.token_hash into v_token_hash
    from public.device_credentials dc
   where dc.device_id = v_device_id;

  -- Bandingkan token (trim whitespace)
  if v_token_hash is null or trim(v_token_hash) <> trim(p_token) then
    return; -- kosong = token tidak valid
  end if;

  -- Return data device
  return query
    select d.id, d.device_uid, d.name, d.device_type::text,
           d.group_id, d.firmware_version, d.last_seen,
           d.ip_address, d.battery, d.signal_strength,
           d.created_at, d.updated_at
      from public.devices d
     where d.id = v_device_id;
end $$;

-- 2. Grant akses ke anon dan authenticated
grant execute on function public.verify_device_token(text, text) to anon, authenticated;

-- 3. Tambah policy baca untuk device_credentials via service role
--    (Jika menggunakan service role key di Vercel, ini tidak diperlukan tapi tidak ada salahnya)
drop policy if exists "admin all" on public.device_credentials;
create policy "admin all" on public.device_credentials 
  for all using (public.is_admin()) with check (public.is_admin());

-- Verifikasi: Test fungsi (ganti dengan device_uid dan token_hash Anda dari Supabase)
-- select * from public.verify_device_token('ALFA1-MINYAKKITA', 'dpt_d1b47933c587eda1008f4d6e3527636ce0e7890200e56901fb15c1c20d55eb39');
