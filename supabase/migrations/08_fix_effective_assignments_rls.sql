-- ============================================================
-- MIGRATION 08: Fix device_effective_assignments view RLS bypass
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Re-create view device_effective_assignments (security_invoker = false agar view tidak diblokir RLS devices)
create or replace view public.device_effective_assignments
with (security_invoker = false) as
select distinct on (d.id)
       d.id as device_id,
       a.id as assignment_id,
       a.display_profile_id
from public.devices d
join public.device_profile_assignments a
  on a.is_active = true
 and (a.device_id = d.id or (d.group_id is not null and a.group_id = d.group_id))
order by d.id,
         (case when a.device_id is not null then 1 else 2 end),
         a.assigned_at desc;

-- 2. Grant SELECT pada devices dan view ke anon & authenticated
grant select on public.devices to anon, authenticated;
grant select on public.device_effective_assignments to anon, authenticated;

-- 3. Tambahkan policy RLS SELECT untuk devices agar anon dapat membaca devices
drop policy if exists "device read devices" on public.devices;
create policy "device read devices" on public.devices for select using (true);

select 'Migration 08 (Fix Effective Assignments RLS) berhasil diterapkan!' as status;
