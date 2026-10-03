import { AppError } from '../http/errors';
import { store, DeviceRecord } from '../storage/store';
import { heartbeatSchema, syncAckSchema } from '../validations';
import { z } from 'zod';
import { getSupabaseClient } from '../supabase/get-client';

export async function processDeviceHeartbeat(device: DeviceRecord, input: z.infer<typeof heartbeatSchema>) {
  const data = heartbeatSchema.parse(input);
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();

  if (supabase) {
    const updateData: any = {
      last_seen: now,
      firmware_version: data.firmware_version,
      updated_at: now,
    };
    if (data.ip_address) updateData.ip_address = data.ip_address;
    if (data.battery !== undefined) updateData.battery = data.battery;
    if (data.signal_strength !== undefined) updateData.signal_strength = data.signal_strength;

    await supabase.from('devices').update(updateData).eq('id', device.id);

    const { data: effective } = await supabase
      .from('device_effective_assignments')
      .select('display_profile_id')
      .eq('device_id', device.id)
      .maybeSingle();

    if (!effective?.display_profile_id) {
      return {
        server_time: now,
        config_outdated: false,
        latest_profile_id: null,
        latest_version: null,
      };
    }

    const { data: prf } = await supabase
      .from('display_profiles')
      .select('id, version')
      .eq('id', effective.display_profile_id)
      .single();

    const { data: sync } = await supabase
      .from('device_sync_status')
      .select('*')
      .eq('device_id', device.id)
      .maybeSingle();

    const outdated =
      !sync ||
      sync.force_resync ||
      data.current_profile_id !== prf.id ||
      data.current_profile_version !== prf.version;

    if (!outdated && sync && sync.sync_status !== 'synced') {
      await supabase
        .from('device_sync_status')
        .update({
          synced_profile_id: prf.id,
          synced_version: prf.version,
          sync_status: 'synced',
          force_resync: false,
          last_sync: now,
          last_error: null,
        })
        .eq('device_id', device.id);
    }

    return {
      server_time: now,
      config_outdated: outdated,
      latest_profile_id: prf.id,
      latest_version: prf.version,
    };
  }

  // Fallback
  device.last_seen = now;
  device.firmware_version = data.firmware_version;
  if (data.ip_address) device.ip_address = data.ip_address;
  if (data.battery !== undefined) device.battery = data.battery;
  if (data.signal_strength !== undefined) device.signal_strength = data.signal_strength;
  device.updated_at = now;
  store.devices.set(device.id, device);

  const effectiveProfileId = store.getEffectiveProfileId(device.id);
  const effectiveProfile = effectiveProfileId ? store.profiles.get(effectiveProfileId) : null;
  const sync = store.syncStatuses.get(device.id) || {
    device_id: device.id,
    profile_id: null,
    profile_version: 0,
    synced_profile_id: null,
    synced_version: 0,
    sync_status: 'synced',
    force_resync: false,
    last_sync: null,
    last_error: null,
  };

  if (!effectiveProfileId || !effectiveProfile) {
    return {
      server_time: now,
      config_outdated: false,
      latest_profile_id: null,
      latest_version: null,
    };
  }

  const outdated =
    sync.force_resync ||
    data.current_profile_id !== effectiveProfile.id ||
    data.current_profile_version !== effectiveProfile.version;

  if (!outdated && sync.sync_status !== 'synced') {
    sync.synced_profile_id = effectiveProfile.id;
    sync.synced_version = effectiveProfile.version;
    sync.sync_status = 'synced';
    sync.force_resync = false;
    sync.last_sync = now;
    sync.last_error = null;
    store.syncStatuses.set(device.id, sync);
  }

  return {
    server_time: now,
    config_outdated: outdated,
    latest_profile_id: effectiveProfile.id,
    latest_version: effectiveProfile.version,
  };
}

export async function getDeviceConfig(device: DeviceRecord) {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data: effective } = await supabase
      .from('device_effective_assignments')
      .select('display_profile_id')
      .eq('device_id', device.id)
      .maybeSingle();

    if (!effective?.display_profile_id) return null;

    const { data: profile } = await supabase
      .from('display_profiles')
      .select('id, version')
      .eq('id', effective.display_profile_id)
      .single();

    if (!profile) return null;

    const { data: config } = await supabase
      .from('display_configs')
      .select('*')
      .eq('display_profile_id', profile.id)
      .single();

    if (!config) return null;

    await supabase
      .from('device_sync_status')
      .update({ sync_status: 'syncing' })
      .eq('device_id', device.id)
      .in('sync_status', ['pending', 'failed']);

    return {
      profile_id: profile.id,
      version: profile.version,
      device_type: device.device_type,
      config: {
        product_name: config.product_name,
        price: config.price,
        unit: config.unit,
        promo_text: config.promo_text,
        font_size: config.font_size,
        font_weight: config.font_weight,
        alignment: config.alignment,
        brightness: config.brightness,
        rotation: config.rotation,
        layout_config: config.layout_config,
      },
    };
  }

  // Fallback
  const effectiveProfileId = store.getEffectiveProfileId(device.id);
  if (!effectiveProfileId) return null;

  const profile = store.profiles.get(effectiveProfileId);
  if (!profile) return null;

  const config = Array.from(store.configs.values()).find((c) => c.display_profile_id === profile.id);
  if (!config) return null;

  const sync = store.syncStatuses.get(device.id);
  if (sync && (sync.sync_status === 'pending' || sync.sync_status === 'failed')) {
    sync.sync_status = 'syncing';
    store.syncStatuses.set(device.id, sync);
  }

  return {
    profile_id: profile.id,
    version: profile.version,
    device_type: device.device_type,
    config: {
      product_name: config.product_name,
      price: config.price,
      unit: config.unit,
      promo_text: config.promo_text,
      font_size: config.font_size,
      font_weight: config.font_weight,
      alignment: config.alignment,
      brightness: config.brightness,
      rotation: config.rotation,
      layout_config: config.layout_config,
    },
  };
}

export async function processDeviceSyncAck(device: DeviceRecord, input: z.infer<typeof syncAckSchema>) {
  const data = syncAckSchema.parse(input);
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data: effective } = await supabase
      .from('device_effective_assignments')
      .select('display_profile_id')
      .eq('device_id', device.id)
      .maybeSingle();

    if (effective?.display_profile_id) {
      const { data: prf } = await supabase
        .from('display_profiles')
        .select('id, version')
        .eq('id', effective.display_profile_id)
        .single();

      if (data.success) {
        if (prf && data.profile_id === prf.id && data.version === prf.version) {
          await supabase
            .from('device_sync_status')
            .update({
              synced_profile_id: data.profile_id,
              synced_version: data.version,
              sync_status: 'synced',
              force_resync: false,
              last_sync: now,
              last_error: null,
            })
            .eq('device_id', device.id);
        }
      } else {
        if (prf && data.profile_id === prf.id && data.version === prf.version) {
          await supabase
            .from('device_sync_status')
            .update({
              sync_status: 'failed',
              last_error: (data.error || 'Sync failed').slice(0, 200),
            })
            .eq('device_id', device.id);
        }
      }
    }
    return { ok: true };
  }

  // Fallback
  const sync = store.syncStatuses.get(device.id);
  if (!sync) return { ok: true };

  const effectiveProfileId = store.getEffectiveProfileId(device.id);
  const effectiveProfile = effectiveProfileId ? store.profiles.get(effectiveProfileId) : null;

  if (data.success) {
    if (effectiveProfile && data.profile_id === effectiveProfile.id && data.version === effectiveProfile.version) {
      sync.synced_profile_id = data.profile_id;
      sync.synced_version = data.version;
      sync.sync_status = 'synced';
      sync.force_resync = false;
      sync.last_sync = now;
      sync.last_error = null;
    }
  } else {
    if (effectiveProfile && data.profile_id === effectiveProfile.id && data.version === effectiveProfile.version) {
      sync.sync_status = 'failed';
      sync.last_error = (data.error || 'Sync failed').slice(0, 200);
    }
  }

  store.syncStatuses.set(device.id, sync);
  return { ok: true };
}
