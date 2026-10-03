import { AppError } from '../http/errors';
import { store, DeviceRecord } from '../storage/store';
import { createDeviceSchema, updateDeviceSchema } from '../validations';
import { z } from 'zod';
import { getSupabaseClient } from '../supabase/get-client';

export interface DeviceOverviewItem {
  id: string;
  device_uid: string;
  name: string;
  device_type: 'esp32_c6' | 'lilygo_s3';
  group_id: string | null;
  group_name: string | null;
  firmware_version: string | null;
  last_seen: string | null;
  ip_address: string | null;
  battery: number | null;
  signal_strength: number | null;
  is_online: boolean;
  status: 'online' | 'offline';
  profile: {
    id: string;
    name: string;
    version: number;
    source: 'group' | 'device';
    is_custom: boolean;
  } | null;
  sync: {
    status: 'synced' | 'pending' | 'syncing' | 'failed';
    profile_version: number;
    synced_version: number;
    last_sync: string | null;
    last_error: string | null;
  };
  created_at: string;
  updated_at: string;
}

export async function listDevicesOverview(filters?: {
  type?: string;
  group_id?: string;
  online?: boolean;
  sync_status?: string;
  q?: string;
}): Promise<DeviceOverviewItem[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    let query = supabase.from('devices_overview').select('*');
    if (filters?.type) query = query.eq('device_type', filters.type);
    if (filters?.group_id !== undefined) {
      if (filters.group_id === 'none') query = query.is('group_id', null);
      else query = query.eq('group_id', filters.group_id);
    }
    if (filters?.sync_status) query = query.eq('sync_status', filters.sync_status);

    const { data, error } = await query;
    if (error) throw new AppError('DATABASE_ERROR', 500, error.message);

    let items: DeviceOverviewItem[] = (data || []).map((row: any) => ({
      id: row.id,
      device_uid: row.device_uid,
      name: row.name,
      device_type: row.device_type,
      group_id: row.group_id,
      group_name: row.group_name,
      firmware_version: row.firmware_version,
      last_seen: row.last_seen,
      ip_address: row.ip_address,
      battery: row.battery,
      signal_strength: row.signal_strength,
      is_online: Boolean(row.is_online),
      status: row.is_online ? 'online' : 'offline',
      profile: row.profile_id
        ? {
            id: row.profile_id,
            name: row.profile_name,
            version: row.profile_version || 1,
            source: row.group_id ? 'group' : 'device',
            is_custom: Boolean(row.profile_is_custom),
          }
        : null,
      sync: {
        status: row.sync_status || 'synced',
        profile_version: row.profile_version || 0,
        synced_version: row.synced_version || 0,
        last_sync: row.last_sync,
        last_error: row.last_error,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    if (filters?.online !== undefined) {
      items = items.filter((d) => d.is_online === filters.online);
    }

    if (filters?.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(
        (d) => d.name.toLowerCase().includes(q) || d.device_uid.toLowerCase().includes(q)
      );
    }

    return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  // Fallback to InMemStore if Supabase is unconfigured
  const result: DeviceOverviewItem[] = [];

  for (const dev of Array.from(store.devices.values())) {
    const isOnline = store.isOnline(dev.last_seen);

    if (filters?.type && dev.device_type !== filters.type) continue;
    if (filters?.group_id !== undefined) {
      if (filters.group_id === 'none' && dev.group_id !== null) continue;
      if (filters.group_id !== 'none' && dev.group_id !== filters.group_id) continue;
    }
    if (filters?.online !== undefined && isOnline !== filters.online) continue;

    if (filters?.q) {
      const q = filters.q.toLowerCase();
      const matchName = dev.name.toLowerCase().includes(q);
      const matchUid = dev.device_uid.toLowerCase().includes(q);
      if (!matchName && !matchUid) continue;
    }

    const group = dev.group_id ? store.groups.get(dev.group_id) : null;
    const effectiveProfileId = store.getEffectiveProfileId(dev.id);
    const profile = effectiveProfileId ? store.profiles.get(effectiveProfileId) : null;
    const sync = store.syncStatuses.get(dev.id) || {
      device_id: dev.id,
      profile_id: null,
      profile_version: 0,
      synced_profile_id: null,
      synced_version: 0,
      sync_status: 'synced',
      force_resync: false,
      last_sync: null,
      last_error: null,
    };

    if (filters?.sync_status && sync.sync_status !== filters.sync_status) continue;

    result.push({
      id: dev.id,
      device_uid: dev.device_uid,
      name: dev.name,
      device_type: dev.device_type,
      group_id: dev.group_id,
      group_name: group ? group.name : null,
      firmware_version: dev.firmware_version,
      last_seen: dev.last_seen,
      ip_address: dev.ip_address,
      battery: dev.battery,
      signal_strength: dev.signal_strength,
      is_online: isOnline,
      status: isOnline ? 'online' : 'offline',
      profile: profile
        ? {
            id: profile.id,
            name: profile.name,
            version: profile.version,
            source: dev.group_id ? 'group' : 'device',
            is_custom: profile.is_custom,
          }
        : null,
      sync: {
        status: sync.sync_status,
        profile_version: sync.profile_version,
        synced_version: sync.synced_version,
        last_sync: sync.last_sync,
        last_error: sync.last_error,
      },
      created_at: dev.created_at,
      updated_at: dev.updated_at,
    });
  }

  return result.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function registerDevice(input: z.infer<typeof createDeviceSchema>) {
  const data = createDeviceSchema.parse(input);
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data: existing } = await supabase
      .from('devices')
      .select('id')
      .ilike('device_uid', data.device_uid)
      .maybeSingle();

    if (existing) {
      throw new AppError('CONFLICT', 409, `Device UID "${data.device_uid}" sudah terdaftar`);
    }

    if (data.group_id) {
      const { data: grp } = await supabase.from('device_groups').select('device_type').eq('id', data.group_id).single();
      if (!grp) throw new AppError('NOT_FOUND', 404, 'Group tidak ditemukan');
      if (grp.device_type !== data.device_type) {
        throw new AppError('GROUP_TYPE_MISMATCH', 409, 'Tipe device tidak sesuai dengan tipe group');
      }
    }

    const { data: inserted, error: devErr } = await supabase
      .from('devices')
      .insert({
        device_uid: data.device_uid.toUpperCase(),
        name: data.name,
        device_type: data.device_type,
        group_id: data.group_id || null,
      })
      .select()
      .single();

    if (devErr || !inserted) {
      throw new AppError('VALIDATION_ERROR', 400, devErr?.message || 'Gagal meregistrasi device');
    }

    const rawToken = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
    const token = `dpt_${rawToken}`;

    await supabase.from('device_credentials').insert({
      device_id: inserted.id,
      token_hash: token,
    });

    await supabase.rpc('refresh_device_sync', { p_device_id: inserted.id });

    return {
      id: inserted.id,
      device_uid: inserted.device_uid,
      name: inserted.name,
      device_type: inserted.device_type,
      group_id: inserted.group_id,
      device_token: token,
    };
  }

  // Fallback to InMemStore
  for (const dev of Array.from(store.devices.values())) {
    if (dev.device_uid.toUpperCase() === data.device_uid.toUpperCase()) {
      throw new AppError('CONFLICT', 409, `Device UID "${data.device_uid}" sudah terdaftar`);
    }
  }

  if (data.group_id) {
    const grp = store.groups.get(data.group_id);
    if (!grp) throw new AppError('NOT_FOUND', 404, 'Group tidak ditemukan');
    if (grp.device_type !== data.device_type) {
      throw new AppError('GROUP_TYPE_MISMATCH', 409, 'Tipe device tidak sesuai dengan tipe group');
    }
  }

  const now = new Date().toISOString();
  const id = `dev-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const rawToken = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
  const token = `dpt_${rawToken}`;

  const newDevice: DeviceRecord = {
    id,
    device_uid: data.device_uid.toUpperCase(),
    name: data.name,
    device_type: data.device_type,
    group_id: data.group_id || null,
    firmware_version: null,
    last_seen: null,
    ip_address: null,
    battery: null,
    signal_strength: null,
    created_at: now,
    updated_at: now,
  };

  store.devices.set(id, newDevice);
  store.credentials.set(id, {
    device_id: id,
    token,
    token_hash: token,
    created_at: now,
    rotated_at: null,
  });

  store.refreshDeviceSync(id);

  return {
    id,
    device_uid: newDevice.device_uid,
    name: newDevice.name,
    device_type: newDevice.device_type,
    group_id: newDevice.group_id,
    device_token: token,
  };
}

export async function updateDevice(id: string, input: z.infer<typeof updateDeviceSchema>) {
  const data = updateDeviceSchema.parse(input);
  const supabase = getSupabaseClient();

  if (supabase) {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.group_id !== undefined) updateData.group_id = data.group_id;

    const { data: updated, error } = await supabase
      .from('devices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) throw new AppError('NOT_FOUND', 404, 'Device tidak ditemukan');

    await supabase.rpc('refresh_device_sync', { p_device_id: id });
    return updated;
  }

  // Fallback to InMemStore
  const dev = store.devices.get(id);
  if (!dev) throw new AppError('NOT_FOUND', 404, 'Device tidak ditemukan');

  const now = new Date().toISOString();

  if (data.name !== undefined) {
    dev.name = data.name;
  }

  if (data.group_id !== undefined && data.group_id !== dev.group_id) {
    if (data.group_id !== null) {
      const grp = store.groups.get(data.group_id);
      if (!grp) throw new AppError('NOT_FOUND', 404, 'Group tidak ditemukan');
      if (grp.device_type !== dev.device_type) {
        throw new AppError('GROUP_TYPE_MISMATCH', 409, 'Tipe device tidak sesuai dengan tipe group');
      }

      for (const asg of Array.from(store.assignments.values())) {
        if (asg.device_id === id && asg.is_active) {
          asg.is_active = false;
          asg.updated_at = now;
        }
      }
    }
    dev.group_id = data.group_id;
  }

  dev.updated_at = now;
  store.devices.set(id, dev);
  store.refreshDeviceSync(id);

  return dev;
}

export async function rotateDeviceToken(id: string) {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data: dev } = await supabase.from('devices').select('id, device_uid').eq('id', id).single();
    if (!dev) throw new AppError('NOT_FOUND', 404, 'Device tidak ditemukan');

    const rawToken = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
    const newToken = `dpt_${rawToken}`;

    await supabase.from('device_credentials').upsert({
      device_id: id,
      token_hash: newToken,
      rotated_at: new Date().toISOString(),
    });

    return {
      id: dev.id,
      device_uid: dev.device_uid,
      device_token: newToken,
    };
  }

  // Fallback
  const dev = store.devices.get(id);
  if (!dev) throw new AppError('NOT_FOUND', 404, 'Device tidak ditemukan');

  const now = new Date().toISOString();
  const rawToken = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
  const newToken = `dpt_${rawToken}`;

  store.credentials.set(id, {
    device_id: id,
    token: newToken,
    token_hash: newToken,
    created_at: now,
    rotated_at: now,
  });

  return {
    id: dev.id,
    device_uid: dev.device_uid,
    device_token: newToken,
  };
}

export async function createCustomProfileForDevice(deviceId: string, name?: string, fromProfileId?: string) {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data: dev } = await supabase.from('devices').select('id, name, group_id').eq('id', deviceId).single();
    if (!dev) throw new AppError('NOT_FOUND', 404, 'Device tidak ditemukan');
    if (dev.group_id) throw new AppError('DEVICE_IN_GROUP', 409, 'Device dalam group tidak bisa memiliki custom profile');

    const profileName = name || `${dev.name} (Custom)`;
    const defaultConfig = {
      product_name: dev.name.toUpperCase(),
      price: 5000,
      unit: 'gelas',
      promo_text: 'SPECIAL OFFER',
      font_size: 'large',
      font_weight: 'bold',
      alignment: 'center',
      brightness: 80,
      rotation: 0,
      layout_config: { schema_version: 1, mode: 'auto', elements: {} },
    };

    const { data: profileId, error } = await supabase.rpc('create_display_profile', {
      p_name: profileName,
      p_description: `Custom profile untuk ${dev.name}`,
      p_config: defaultConfig,
      p_created_by: null,
      p_owner_device_id: deviceId,
    });

    if (error) throw new AppError('VALIDATION_ERROR', 400, error.message);

    await supabase.rpc('assign_profile', {
      p_profile_id: profileId,
      p_targets: [{ type: 'device', id: deviceId }],
    });

    return { profileId, version: 1 };
  }

  // Fallback
  const dev = store.devices.get(deviceId);
  if (!dev) throw new AppError('NOT_FOUND', 404, 'Device tidak ditemukan');
  if (dev.group_id) {
    throw new AppError('DEVICE_IN_GROUP', 409, 'Device dalam group tidak bisa memiliki custom profile');
  }

  for (const prf of Array.from(store.profiles.values())) {
    if (prf.is_custom && prf.owner_device_id === deviceId) {
      throw new AppError('CONFLICT', 409, 'Device ini sudah memiliki custom profile');
    }
  }

  const now = new Date().toISOString();
  const profileId = `prf-custom-${Date.now()}`;
  const configId = `cfg-custom-${Date.now()}`;

  let baseConfig = {
    product_name: dev.name.toUpperCase(),
    price: 5000,
    unit: 'gelas' as string | null,
    promo_text: 'SPECIAL OFFER' as string | null,
    font_size: 'large' as const,
    font_weight: 'bold' as const,
    alignment: 'center' as const,
    brightness: 80,
    rotation: 0 as const,
    layout_config: { schema_version: 1, mode: 'auto' as const, elements: {} },
  };

  const profileName = name || `${dev.name} (Custom)`;

  store.profiles.set(profileId, {
    id: profileId,
    name: profileName,
    description: `Custom profile untuk ${dev.name}`,
    version: 1,
    is_custom: true,
    owner_device_id: deviceId,
    created_by: 'usr-admin-1',
    created_at: now,
    updated_at: now,
  });

  store.configs.set(configId, {
    id: configId,
    display_profile_id: profileId,
    ...baseConfig,
    created_at: now,
    updated_at: now,
  });

  for (const asg of Array.from(store.assignments.values())) {
    if (asg.device_id === deviceId && asg.is_active) {
      asg.is_active = false;
      asg.updated_at = now;
    }
  }

  const newAsgId = `asg-${Date.now()}`;
  store.assignments.set(newAsgId, {
    id: newAsgId,
    display_profile_id: profileId,
    device_id: deviceId,
    group_id: null,
    is_active: true,
    assigned_at: now,
    updated_at: now,
  });

  store.refreshDeviceSync(deviceId);

  return { profileId, version: 1 };
}

export async function forceResyncDevice(id: string) {
  const supabase = getSupabaseClient();

  if (supabase) {
    await supabase
      .from('device_sync_status')
      .update({ force_resync: true, sync_status: 'pending' })
      .eq('device_id', id);
    return { success: true };
  }

  // Fallback
  const dev = store.devices.get(id);
  if (!dev) throw new AppError('NOT_FOUND', 404, 'Device tidak ditemukan');

  const sync = store.syncStatuses.get(id);
  if (sync) {
    sync.force_resync = true;
    sync.sync_status = 'pending';
    store.syncStatuses.set(id, sync);
  }

  return { success: true };
}

export async function deleteDevice(id: string) {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase.from('devices').delete().eq('id', id);
    if (error) throw new AppError('NOT_FOUND', 404, 'Device tidak ditemukan');
    return { success: true };
  }

  // Fallback
  const dev = store.devices.get(id);
  if (!dev) throw new AppError('NOT_FOUND', 404, 'Device tidak ditemukan');

  store.devices.delete(id);
  store.credentials.delete(id);
  store.syncStatuses.delete(id);

  for (const [asgId, asg] of Array.from(store.assignments.entries())) {
    if (asg.device_id === id) {
      store.assignments.delete(asgId);
    }
  }

  return { success: true };
}
