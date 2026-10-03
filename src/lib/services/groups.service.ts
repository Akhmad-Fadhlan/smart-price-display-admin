import { AppError } from '../http/errors';
import { store, DeviceGroupRecord } from '../storage/store';
import { createGroupSchema, updateGroupSchema } from '../validations';
import { z } from 'zod';
import { listDevicesOverview, DeviceOverviewItem } from './devices.service';
import { getSupabaseClient } from '../supabase/get-client';

export interface GroupOverviewItem {
  id: string;
  name: string;
  device_type: 'esp32_c6';
  description: string | null;
  device_count: number;
  online_count: number;
  status: 'online' | 'partial' | 'offline';
  profile: {
    id: string;
    name: string;
    version: number;
  } | null;
  created_at: string;
  updated_at: string;
}

export async function listGroupsOverview(): Promise<GroupOverviewItem[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data: groups, error } = await supabase.from('groups_overview').select('*');
    if (error) throw new AppError('DATABASE_ERROR', 500, error.message);

    const { data: assignments } = await supabase
      .from('device_profile_assignments')
      .select('group_id, display_profiles(id, name, version)')
      .eq('is_active', true);

    const profileMap = new Map();
    assignments?.forEach((a: any) => {
      if (a.group_id && a.display_profiles) {
        profileMap.set(a.group_id, a.display_profiles);
      }
    });

    return (groups || []).map((g: any) => {
      const devCount = Number(g.device_count || 0);
      const onlineCount = Number(g.online_count || 0);
      let status: 'online' | 'partial' | 'offline' = 'offline';
      if (devCount > 0) {
        if (onlineCount === devCount) status = 'online';
        else if (onlineCount > 0) status = 'partial';
      }

      return {
        id: g.id,
        name: g.name,
        device_type: g.device_type,
        description: g.description,
        device_count: devCount,
        online_count: onlineCount,
        status,
        profile: profileMap.get(g.id) || null,
        created_at: g.created_at || new Date().toISOString(),
        updated_at: g.updated_at || new Date().toISOString(),
      };
    });
  }

  // Fallback
  const result: GroupOverviewItem[] = [];

  for (const grp of Array.from(store.groups.values())) {
    const devices = Array.from(store.devices.values()).filter((d) => d.group_id === grp.id);
    const deviceCount = devices.length;
    const onlineCount = devices.filter((d) => store.isOnline(d.last_seen)).length;

    let status: 'online' | 'partial' | 'offline' = 'offline';
    if (deviceCount > 0) {
      if (onlineCount === deviceCount) status = 'online';
      else if (onlineCount > 0) status = 'partial';
      else status = 'offline';
    }

    let groupProfile = null;
    for (const asg of Array.from(store.assignments.values())) {
      if (asg.is_active && asg.group_id === grp.id) {
        const prf = store.profiles.get(asg.display_profile_id);
        if (prf) {
          groupProfile = {
            id: prf.id,
            name: prf.name,
            version: prf.version,
          };
        }
        break;
      }
    }

    result.push({
      id: grp.id,
      name: grp.name,
      device_type: grp.device_type,
      description: grp.description,
      device_count: deviceCount,
      online_count: onlineCount,
      status,
      profile: groupProfile,
      created_at: grp.created_at,
      updated_at: grp.updated_at,
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getGroupDetail(id: string) {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data: grp } = await supabase.from('device_groups').select('*').eq('id', id).single();
    if (!grp) throw new AppError('NOT_FOUND', 404, 'Group tidak ditemukan');

    const members: DeviceOverviewItem[] = await listDevicesOverview({ group_id: id });
    const onlineCount = members.filter((m) => m.is_online).length;

    let status: 'online' | 'partial' | 'offline' = 'offline';
    if (members.length > 0) {
      if (onlineCount === members.length) status = 'online';
      else if (onlineCount > 0) status = 'partial';
    }

    const { data: asg } = await supabase
      .from('device_profile_assignments')
      .select('display_profiles(id, name, version)')
      .eq('group_id', id)
      .eq('is_active', true)
      .maybeSingle();

    const groupProfile = (asg as any)?.display_profiles || null;

    return {
      ...grp,
      device_count: members.length,
      online_count: onlineCount,
      status,
      profile: groupProfile,
      members,
    };
  }

  // Fallback
  const grp = store.groups.get(id);
  if (!grp) throw new AppError('NOT_FOUND', 404, 'Group tidak ditemukan');

  const members: DeviceOverviewItem[] = await listDevicesOverview({ group_id: id });
  const onlineCount = members.filter((m) => m.is_online).length;

  let status: 'online' | 'partial' | 'offline' = 'offline';
  if (members.length > 0) {
    if (onlineCount === members.length) status = 'online';
    else if (onlineCount > 0) status = 'partial';
  }

  let groupProfile = null;
  for (const asg of Array.from(store.assignments.values())) {
    if (asg.is_active && asg.group_id === grp.id) {
      const prf = store.profiles.get(asg.display_profile_id);
      if (prf) {
        groupProfile = {
          id: prf.id,
          name: prf.name,
          version: prf.version,
        };
      }
      break;
    }
  }

  return {
    ...grp,
    device_count: members.length,
    online_count: onlineCount,
    status,
    profile: groupProfile,
    members,
  };
}

export async function createGroup(input: z.infer<typeof createGroupSchema>) {
  const data = createGroupSchema.parse(input);
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data: grp, error } = await supabase
      .from('device_groups')
      .insert({
        name: data.name,
        device_type: data.device_type,
        description: data.description || null,
      })
      .select()
      .single();

    if (error) throw new AppError('CONFLICT', 409, error.message);
    return grp;
  }

  // Fallback
  for (const g of Array.from(store.groups.values())) {
    if (g.name.toLowerCase() === data.name.toLowerCase()) {
      throw new AppError('CONFLICT', 409, `Group dengan nama "${data.name}" sudah ada`);
    }
  }

  const now = new Date().toISOString();
  const id = `grp-${Date.now()}`;

  const newGroup: DeviceGroupRecord = {
    id,
    name: data.name,
    device_type: data.device_type,
    description: data.description || null,
    created_at: now,
    updated_at: now,
  };

  store.groups.set(id, newGroup);
  return newGroup;
}

export async function updateGroup(id: string, input: z.infer<typeof updateGroupSchema>) {
  const data = updateGroupSchema.parse(input);
  const supabase = getSupabaseClient();

  if (supabase) {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;

    const { data: grp, error } = await supabase
      .from('device_groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError('CONFLICT', 409, error.message);
    return grp;
  }

  // Fallback
  const grp = store.groups.get(id);
  if (!grp) throw new AppError('NOT_FOUND', 404, 'Group tidak ditemukan');

  if (data.name && data.name.toLowerCase() !== grp.name.toLowerCase()) {
    for (const g of Array.from(store.groups.values())) {
      if (g.id !== id && g.name.toLowerCase() === data.name.toLowerCase()) {
        throw new AppError('CONFLICT', 409, `Group dengan nama "${data.name}" sudah ada`);
      }
    }
    grp.name = data.name;
  }

  if (data.description !== undefined) {
    grp.description = data.description;
  }

  grp.updated_at = new Date().toISOString();
  store.groups.set(id, grp);
  return grp;
}

export async function deleteGroup(id: string, force = false) {
  const supabase = getSupabaseClient();

  if (supabase) {
    if (force) {
      await supabase.from('devices').update({ group_id: null }).eq('group_id', id);
    }
    const { error } = await supabase.from('device_groups').delete().eq('id', id);
    if (error) throw new AppError('IN_USE', 409, 'Group masih memiliki device anggota. Gunakan force=true.');
    return { success: true };
  }

  // Fallback
  const grp = store.groups.get(id);
  if (!grp) throw new AppError('NOT_FOUND', 404, 'Group tidak ditemukan');

  const memberDevices = Array.from(store.devices.values()).filter((d) => d.group_id === id);

  if (memberDevices.length > 0 && !force) {
    throw new AppError(
      'IN_USE',
      409,
      `Group masih memiliki ${memberDevices.length} device anggota. Gunakan force=true untuk mengeluarkan device.`
    );
  }

  const now = new Date().toISOString();
  for (const dev of memberDevices) {
    dev.group_id = null;
    dev.updated_at = now;
    store.devices.set(dev.id, dev);
    store.refreshDeviceSync(dev.id);
  }

  for (const [asgId, asg] of Array.from(store.assignments.entries())) {
    if (asg.group_id === id) {
      store.assignments.delete(asgId);
    }
  }

  store.groups.delete(id);
  return { success: true };
}

export async function addGroupMembers(groupId: string, deviceIds: string[]) {
  const supabase = getSupabaseClient();

  if (supabase) {
    await supabase.from('devices').update({ group_id: groupId }).in('id', deviceIds);
    for (const id of deviceIds) {
      await supabase.rpc('refresh_device_sync', { p_device_id: id });
    }
    return { success: true };
  }

  // Fallback
  const grp = store.groups.get(groupId);
  if (!grp) throw new AppError('NOT_FOUND', 404, 'Group tidak ditemukan');

  const now = new Date().toISOString();

  for (const devId of deviceIds) {
    const dev = store.devices.get(devId);
    if (!dev) continue;
    if (dev.device_type !== grp.device_type) {
      throw new AppError('GROUP_TYPE_MISMATCH', 409, `Device ${dev.name} (${dev.device_type}) tidak cocok dengan tipe group (${grp.device_type})`);
    }

    for (const asg of Array.from(store.assignments.values())) {
      if (asg.device_id === dev.id && asg.is_active) {
        asg.is_active = false;
        asg.updated_at = now;
      }
    }

    dev.group_id = groupId;
    dev.updated_at = now;
    store.devices.set(dev.id, dev);
    store.refreshDeviceSync(dev.id);
  }

  return { success: true };
}

export async function removeGroupMembers(groupId: string, deviceIds: string[]) {
  const supabase = getSupabaseClient();

  if (supabase) {
    await supabase.from('devices').update({ group_id: null }).in('id', deviceIds).eq('group_id', groupId);
    for (const id of deviceIds) {
      await supabase.rpc('refresh_device_sync', { p_device_id: id });
    }
    return { success: true };
  }

  // Fallback
  const grp = store.groups.get(groupId);
  if (!grp) throw new AppError('NOT_FOUND', 404, 'Group tidak ditemukan');

  const now = new Date().toISOString();

  for (const devId of deviceIds) {
    const dev = store.devices.get(devId);
    if (dev && dev.group_id === groupId) {
      dev.group_id = null;
      dev.updated_at = now;
      store.devices.set(dev.id, dev);
      store.refreshDeviceSync(dev.id);
    }
  }

  return { success: true };
}
