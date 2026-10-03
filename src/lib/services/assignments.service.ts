import { AppError } from '../http/errors';
import { store, AssignmentRecord } from '../storage/store';
import { createAssignmentSchema } from '../validations';
import { z } from 'zod';
import { getSupabaseClient } from '../supabase/get-client';

export async function createAssignments(input: z.infer<typeof createAssignmentSchema>) {
  const data = createAssignmentSchema.parse(input);
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data: res, error } = await supabase.rpc('assign_profile', {
      p_profile_id: data.display_profile_id,
      p_targets: data.targets,
    });

    if (error) {
      if (error.message.includes('DEVICE_IN_GROUP')) {
        throw new AppError('DEVICE_IN_GROUP', 409, 'Device yang berada dalam group tidak dapat diassign profile secara individual');
      }
      if (error.message.includes('CUSTOM_PROFILE_MISMATCH')) {
        throw new AppError('CUSTOM_PROFILE_MISMATCH', 409, 'Custom profile hanya dapat di-assign ke device pemiliknya');
      }
      if (error.message.includes('NOT_FOUND')) {
        throw new AppError('NOT_FOUND', 404, 'Profile atau target tidak ditemukan');
      }
      throw new AppError('VALIDATION_ERROR', 400, error.message);
    }

    return {
      assigned_devices: res?.assigned_devices || 0,
      device_ids: res?.device_ids || [],
      replaced: 0,
    };
  }

  // Fallback
  const profile = store.profiles.get(data.display_profile_id);
  if (!profile) throw new AppError('NOT_FOUND', 404, 'Display Profile tidak ditemukan');

  const now = new Date().toISOString();
  const affectedDeviceIds: string[] = [];
  let replacedCount = 0;

  for (const target of data.targets) {
    if (target.type === 'group') {
      if (profile.is_custom) {
        throw new AppError('CUSTOM_PROFILE_MISMATCH', 409, 'Custom profile tidak dapat di-assign ke group');
      }

      const group = store.groups.get(target.id);
      if (!group) throw new AppError('NOT_FOUND', 404, `Group ${target.id} tidak ditemukan`);

      for (const asg of Array.from(store.assignments.values())) {
        if (asg.is_active && asg.group_id === target.id) {
          asg.is_active = false;
          asg.updated_at = now;
          replacedCount++;
        }
      }

      const newAsgId = `asg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      store.assignments.set(newAsgId, {
        id: newAsgId,
        display_profile_id: profile.id,
        device_id: null,
        group_id: target.id,
        is_active: true,
        assigned_at: now,
        updated_at: now,
      });

      for (const dev of Array.from(store.devices.values())) {
        if (dev.group_id === target.id) {
          affectedDeviceIds.push(dev.id);
        }
      }
    } else {
      const dev = store.devices.get(target.id);
      if (!dev) throw new AppError('NOT_FOUND', 404, `Device ${target.id} tidak ditemukan`);

      if (dev.group_id) {
        throw new AppError('DEVICE_IN_GROUP', 409, `Device ${dev.name} berada dalam group. Assignment harus ditargetkan ke Group ${dev.group_id}`);
      }

      if (profile.is_custom && profile.owner_device_id !== dev.id) {
        throw new AppError('CUSTOM_PROFILE_MISMATCH', 409, 'Custom profile ini hanya milik device pemiliknya');
      }

      for (const asg of Array.from(store.assignments.values())) {
        if (asg.is_active && asg.device_id === dev.id) {
          asg.is_active = false;
          asg.updated_at = now;
          replacedCount++;
        }
      }

      const newAsgId = `asg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      store.assignments.set(newAsgId, {
        id: newAsgId,
        display_profile_id: profile.id,
        device_id: dev.id,
        group_id: null,
        is_active: true,
        assigned_at: now,
        updated_at: now,
      });

      affectedDeviceIds.push(dev.id);
    }
  }

  store.refreshAllSync();

  return {
    assigned_devices: affectedDeviceIds.length,
    device_ids: affectedDeviceIds,
    replaced: replacedCount,
  };
}

export async function listActiveAssignments(filters?: { profile_id?: string; device_id?: string; group_id?: string }) {
  const supabase = getSupabaseClient();

  if (supabase) {
    let query = supabase.from('device_profile_assignments').select('*').eq('is_active', true);
    if (filters?.profile_id) query = query.eq('display_profile_id', filters.profile_id);
    if (filters?.device_id) query = query.eq('device_id', filters.device_id);
    if (filters?.group_id) query = query.eq('group_id', filters.group_id);

    const { data } = await query;
    return data || [];
  }

  // Fallback
  let list = Array.from(store.assignments.values()).filter((a) => a.is_active);

  if (filters?.profile_id) {
    list = list.filter((a) => a.display_profile_id === filters.profile_id);
  }
  if (filters?.device_id) {
    list = list.filter((a) => a.device_id === filters.device_id);
  }
  if (filters?.group_id) {
    list = list.filter((a) => a.group_id === filters.group_id);
  }

  return list;
}

export async function removeAssignment(id: string) {
  const supabase = getSupabaseClient();

  if (supabase) {
    await supabase.from('device_profile_assignments').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
    return { success: true };
  }

  // Fallback
  const asg = store.assignments.get(id);
  if (!asg) throw new AppError('NOT_FOUND', 404, 'Assignment tidak ditemukan');

  asg.is_active = false;
  asg.updated_at = new Date().toISOString();
  store.assignments.set(id, asg);

  store.refreshAllSync();
  return { success: true };
}
