-- ============================================================
-- MIGRATION 05: Fix device_effective_assignments view & refresh_device_sync
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Fix 1: device_effective_assignments — jamin EXACTLY 1 ROW per device
-- Precedence: Direct assignment > Group assignment > Terbaru (assigned_at desc)
create or replace view public.device_effective_assignments
with (security_invoker = true) as
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

-- Fix 2: refresh_device_sync — sync status & force_resync
create or replace function public.refresh_device_sync(p_device_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_profile uuid; v_version int;
begin
  select e.display_profile_id, p.version into v_profile, v_version
    from device_effective_assignments e
    join display_profiles p on p.id = e.display_profile_id
   where e.device_id = p_device_id
   limit 1;

  insert into device_sync_status as s (device_id, profile_id, profile_version, sync_status, force_resync)
  values (p_device_id, v_profile, coalesce(v_version, 0),
          case when v_profile is null then 'synced'::sync_status else 'pending'::sync_status end,
          case when v_profile is null then false else true end)
  on conflict (device_id) do update set
    profile_id      = excluded.profile_id,
    profile_version = excluded.profile_version,
    sync_status = case
      when excluded.profile_id is null then 'synced'::sync_status
      when s.synced_profile_id is not distinct from excluded.profile_id
       and s.synced_version = excluded.profile_version
       and not s.force_resync then 'synced'::sync_status
      when s.profile_id is not distinct from excluded.profile_id
       and s.profile_version = excluded.profile_version then s.sync_status
      else 'pending'::sync_status
    end,
    force_resync = case
      when excluded.profile_id is null then false
      when s.synced_profile_id is not distinct from excluded.profile_id
       and s.synced_version = excluded.profile_version then false
      else true
    end,
    last_error = case when excluded.profile_id is null then null else s.last_error end;
end $$;

-- Fix 3: Jalankan refresh_device_sync untuk semua device
do $$
declare r record;
begin
  for r in select id from devices loop
    perform refresh_device_sync(r.id);
  end loop;
end $$;

grant execute on function public.refresh_device_sync(uuid) to authenticated, anon;

select 'Migration 05 berhasil diterapkan!' as status;
