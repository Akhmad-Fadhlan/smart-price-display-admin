-- ============================================================
-- JALANKAN SCRIPT INI DI SUPABASE SQL EDITOR
-- Mengatasi:
--   1. assign_profile error untuk device yg pernah punya group_id
--   2. sync tetap pending setelah edit tampilan (force_resync tidak di-set)
--   3. Grant permission ke fungsi-fungsi RPC
-- ============================================================

-- ===========================================================
-- FIX 1: refresh_device_sync — set force_resync = true ketika
--         versi profile berubah agar ESP32 tahu harus pull ulang
-- ===========================================================
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
    -- Set force_resync = TRUE jika versi profil berubah, agar ESP32 tahu harus re-fetch
    force_resync = case
      when excluded.profile_id is null then false
      when s.synced_profile_id is not distinct from excluded.profile_id
       and s.synced_version = excluded.profile_version then false
      else true
    end,
    last_error = case when excluded.profile_id is null then null else s.last_error end;
end $$;

-- ===========================================================
-- FIX 2: assign_profile — izinkan device yang group_id-nya null
--         (sebelumnya bisa error jika device pernah di group)
--         + grant ke authenticated
-- ===========================================================
create or replace function public.assign_profile(p_profile_id uuid, p_targets jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  t jsonb;
  v_owner uuid;
  v_is_custom boolean;
  v_ids uuid[] := '{}';
  v_dev_group uuid;
begin
  select owner_device_id, is_custom into v_owner, v_is_custom
    from display_profiles where id = p_profile_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  for t in select * from jsonb_array_elements(p_targets) loop
    if t->>'type' = 'group' then
      if v_is_custom then raise exception 'CUSTOM_PROFILE_MISMATCH'; end if;
      if not exists (select 1 from device_groups where id = (t->>'id')::uuid) then
        raise exception 'NOT_FOUND';
      end if;
      update device_profile_assignments set is_active = false
        where group_id = (t->>'id')::uuid and is_active;
      insert into device_profile_assignments (display_profile_id, group_id)
        values (p_profile_id, (t->>'id')::uuid);
      v_ids := v_ids || array(select id from devices where group_id = (t->>'id')::uuid);
    else
      -- Cek group_id device SAAT INI (bukan dari history)
      select group_id into v_dev_group from devices where id = (t->>'id')::uuid;
      if not found then raise exception 'NOT_FOUND'; end if;
      if v_dev_group is not null then raise exception 'DEVICE_IN_GROUP'; end if;
      if v_is_custom and v_owner <> (t->>'id')::uuid then
        raise exception 'CUSTOM_PROFILE_MISMATCH';
      end if;
      update device_profile_assignments set is_active = false
        where device_id = (t->>'id')::uuid and is_active;
      insert into device_profile_assignments (display_profile_id, device_id)
        values (p_profile_id, (t->>'id')::uuid);
      v_ids := v_ids || (t->>'id')::uuid;
    end if;
  end loop;

  -- Trigger refresh_device_sync untuk semua device yang di-assign
  perform public.refresh_device_sync(unnested) from unnest(v_ids) as unnested;

  return jsonb_build_object('assigned_devices', cardinality(v_ids), 'device_ids', to_jsonb(v_ids));
end $$;

-- ===========================================================
-- FIX 3: create_display_profile — pastikan v_version di-return
-- ===========================================================
create or replace function public.create_display_profile(
  p_name text, p_description text, p_config jsonb,
  p_created_by uuid, p_owner_device_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
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

-- ===========================================================
-- FIX 4: Grant semua fungsi RPC ke authenticated dan anon
-- ===========================================================
grant execute on function public.refresh_device_sync(uuid) to authenticated, anon;
grant execute on function public.assign_profile(uuid, jsonb) to authenticated;
grant execute on function public.create_display_profile(text, text, jsonb, uuid, uuid) to authenticated;
grant execute on function public.update_display_config(uuid, int, jsonb) to authenticated;
grant execute on function public.verify_device_token(text, text) to authenticated, anon;

-- ===========================================================
-- VERIFIKASI: Cek device sync status saat ini
-- ===========================================================
select d.device_uid, d.name, d.group_id,
       s.sync_status, s.force_resync,
       s.profile_id, s.profile_version, s.synced_version
from devices d
left join device_sync_status s on s.device_id = d.id
order by d.device_uid;
