-- ============================================================
-- MIGRATION 07: Allow Read Access (SELECT) for Device API on Supabase
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Grant SELECT ke anon dan authenticated pada views dan tabel
grant select on public.device_effective_assignments to anon, authenticated;
grant select on public.display_profiles to anon, authenticated;
grant select on public.display_configs to anon, authenticated;
grant select on public.device_profile_assignments to anon, authenticated;
grant select on public.device_sync_status to anon, authenticated;

-- Buat policy RLS SELECT agar anon key (Device API) dapat membaca profile dan config
drop policy if exists "device read profiles" on public.display_profiles;
create policy "device read profiles" on public.display_profiles for select using (true);

drop policy if exists "device read configs" on public.display_configs;
create policy "device read configs" on public.display_configs for select using (true);

drop policy if exists "device read assignments" on public.device_profile_assignments;
create policy "device read assignments" on public.device_profile_assignments for select using (true);

drop policy if exists "device read sync" on public.device_sync_status;
create policy "device read sync" on public.device_sync_status for select using (true);

select 'Migration 07 (Device API RLS Read Access) berhasil diterapkan!' as status;
