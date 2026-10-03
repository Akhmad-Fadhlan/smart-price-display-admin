import { AppError } from '../http/errors';
import { store, DisplayProfileRecord, DisplayConfigRecord } from '../storage/store';
import { createProfileSchema, updateProfileSchema, displayConfigSchema } from '../validations';
import { z } from 'zod';
import { getSupabaseClient } from '../supabase/get-client';

export interface ProfileOverviewItem {
  id: string;
  name: string;
  description: string | null;
  version: number;
  is_custom: boolean;
  owner_device_id: string | null;
  product_name: string;
  price: number;
  unit: string | null;
  device_count: number;
  updated_at: string;
}

export async function listProfilesOverview(includeCustom = false): Promise<ProfileOverviewItem[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    let query = supabase.from('profiles_overview').select('*');
    if (!includeCustom) query = query.eq('is_custom', false);
    const { data, error } = await query;
    if (error) throw new AppError('DATABASE_ERROR', 500, error.message);

    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      version: p.version,
      is_custom: p.is_custom,
      owner_device_id: p.owner_device_id,
      product_name: p.product_name,
      price: p.price,
      unit: p.unit,
      device_count: Number(p.device_count || 0),
      updated_at: p.updated_at,
    })).sort((a: any, b: any) => b.updated_at.localeCompare(a.updated_at));
  }

  // Fallback
  const result: ProfileOverviewItem[] = [];

  for (const prf of Array.from(store.profiles.values())) {
    if (prf.is_custom && !includeCustom) continue;

    const cfg = Array.from(store.configs.values()).find((c) => c.display_profile_id === prf.id);
    if (!cfg) continue;

    let deviceCount = 0;
    for (const dev of Array.from(store.devices.values())) {
      if (store.getEffectiveProfileId(dev.id) === prf.id) {
        deviceCount++;
      }
    }

    result.push({
      id: prf.id,
      name: prf.name,
      description: prf.description,
      version: prf.version,
      is_custom: prf.is_custom,
      owner_device_id: prf.owner_device_id,
      product_name: cfg.product_name,
      price: cfg.price,
      unit: cfg.unit ?? null,
      device_count: deviceCount,
      updated_at: prf.updated_at,
    });
  }

  return result.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getProfileDetail(id: string) {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data: prf } = await supabase.from('display_profiles').select('*').eq('id', id).single();
    if (!prf) throw new AppError('NOT_FOUND', 404, 'Display Profile tidak ditemukan');

    const { data: cfg } = await supabase.from('display_configs').select('*').eq('display_profile_id', id).single();
    if (!cfg) throw new AppError('NOT_FOUND', 404, 'Display Config tidak ditemukan');

    const { data: assigned } = await supabase
      .from('device_effective_assignments')
      .select('device_id, devices(name, device_uid)')
      .eq('display_profile_id', id);

    const assignedDevices = (assigned || []).map((a: any) => ({
      id: a.device_id,
      name: a.devices?.name || '',
      device_uid: a.devices?.device_uid || '',
    }));

    return {
      ...prf,
      config: {
        product_name: cfg.product_name,
        price: cfg.price,
        unit: cfg.unit,
        promo_text: cfg.promo_text,
        font_size: cfg.font_size,
        font_weight: cfg.font_weight,
        alignment: cfg.alignment,
        brightness: cfg.brightness,
        rotation: cfg.rotation,
        layout_config: cfg.layout_config,
      },
      device_count: assignedDevices.length,
      assigned_devices: assignedDevices,
    };
  }

  // Fallback
  const prf = store.profiles.get(id);
  if (!prf) throw new AppError('NOT_FOUND', 404, 'Display Profile tidak ditemukan');

  const cfg = Array.from(store.configs.values()).find((c) => c.display_profile_id === prf.id);
  if (!cfg) throw new AppError('NOT_FOUND', 404, 'Display Config tidak ditemukan');

  let deviceCount = 0;
  const assignedDevices: { id: string; name: string; device_uid: string }[] = [];

  for (const dev of Array.from(store.devices.values())) {
    if (store.getEffectiveProfileId(dev.id) === prf.id) {
      deviceCount++;
      assignedDevices.push({ id: dev.id, name: dev.name, device_uid: dev.device_uid });
    }
  }

  return {
    ...prf,
    config: {
      product_name: cfg.product_name,
      price: cfg.price,
      unit: cfg.unit,
      promo_text: cfg.promo_text,
      font_size: cfg.font_size,
      font_weight: cfg.font_weight,
      alignment: cfg.alignment,
      brightness: cfg.brightness,
      rotation: cfg.rotation,
      layout_config: cfg.layout_config,
    },
    device_count: deviceCount,
    assigned_devices: assignedDevices,
  };
}

export async function createProfile(input: z.infer<typeof createProfileSchema>) {
  const data = createProfileSchema.parse(input);
  const supabase = getSupabaseClient();

  if (data.duplicate_from) {
    return duplicateProfile(data.duplicate_from, data.name);
  }

  if (supabase) {
    const parsedConfig = displayConfigSchema.parse(data.config || {});
    const { data: profileId, error } = await supabase.rpc('create_display_profile', {
      p_name: data.name,
      p_description: data.description || null,
      p_config: parsedConfig,
      p_created_by: null,
    });

    if (error) throw new AppError('CONFLICT', 409, error.message);
    return { id: profileId, version: 1 };
  }

  // Fallback
  for (const p of Array.from(store.profiles.values())) {
    if (!p.is_custom && p.name.toLowerCase() === data.name.toLowerCase()) {
      throw new AppError('CONFLICT', 409, `Profile dengan nama "${data.name}" sudah ada`);
    }
  }

  const parsedConfig = displayConfigSchema.parse(data.config || {});
  const now = new Date().toISOString();
  const profileId = `prf-${Date.now()}`;
  const configId = `cfg-${Date.now()}`;

  const newProfile: DisplayProfileRecord = {
    id: profileId,
    name: data.name,
    description: data.description || null,
    version: 1,
    is_custom: false,
    owner_device_id: null,
    created_by: 'usr-admin-1',
    created_at: now,
    updated_at: now,
  };

  const newConfig: DisplayConfigRecord = {
    id: configId,
    display_profile_id: profileId,
    ...parsedConfig,
    created_at: now,
    updated_at: now,
  };

  store.profiles.set(profileId, newProfile);
  store.configs.set(configId, newConfig);

  return { id: profileId, version: 1 };
}

export async function duplicateProfile(sourceProfileId: string, newName: string) {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data: sourceCfg } = await supabase
      .from('display_configs')
      .select('*')
      .eq('display_profile_id', sourceProfileId)
      .single();

    if (!sourceCfg) throw new AppError('NOT_FOUND', 404, 'Config sumber tidak ditemukan');

    const config = {
      product_name: sourceCfg.product_name,
      price: sourceCfg.price,
      unit: sourceCfg.unit,
      promo_text: sourceCfg.promo_text,
      font_size: sourceCfg.font_size,
      font_weight: sourceCfg.font_weight,
      alignment: sourceCfg.alignment,
      brightness: sourceCfg.brightness,
      rotation: sourceCfg.rotation,
      layout_config: sourceCfg.layout_config,
    };

    const { data: profileId, error } = await supabase.rpc('create_display_profile', {
      p_name: newName,
      p_description: `Hasil duplikat`,
      p_config: config,
      p_created_by: null,
    });

    if (error) throw new AppError('CONFLICT', 409, error.message);
    return { id: profileId, version: 1 };
  }

  // Fallback
  const source = store.profiles.get(sourceProfileId);
  if (!source) throw new AppError('NOT_FOUND', 404, 'Profile sumber tidak ditemukan');

  const sourceCfg = Array.from(store.configs.values()).find((c) => c.display_profile_id === source.id);
  if (!sourceCfg) throw new AppError('NOT_FOUND', 404, 'Config sumber tidak ditemukan');

  for (const p of Array.from(store.profiles.values())) {
    if (!p.is_custom && p.name.toLowerCase() === newName.toLowerCase()) {
      throw new AppError('CONFLICT', 409, `Profile dengan nama "${newName}" sudah ada`);
    }
  }

  const now = new Date().toISOString();
  const profileId = `prf-${Date.now()}`;
  const configId = `cfg-${Date.now()}`;

  const newProfile: DisplayProfileRecord = {
    id: profileId,
    name: newName,
    description: `Hasil duplikat dari ${source.name}`,
    version: 1,
    is_custom: false,
    owner_device_id: null,
    created_by: 'usr-admin-1',
    created_at: now,
    updated_at: now,
  };

  const newConfig: DisplayConfigRecord = {
    id: configId,
    display_profile_id: profileId,
    product_name: sourceCfg.product_name,
    price: sourceCfg.price,
    unit: sourceCfg.unit ?? null,
    promo_text: sourceCfg.promo_text ?? null,
    font_size: sourceCfg.font_size,
    font_weight: sourceCfg.font_weight,
    alignment: sourceCfg.alignment,
    brightness: sourceCfg.brightness,
    rotation: sourceCfg.rotation,
    layout_config: JSON.parse(JSON.stringify(sourceCfg.layout_config)),
    created_at: now,
    updated_at: now,
  };

  store.profiles.set(profileId, newProfile);
  store.configs.set(configId, newConfig);

  return { id: profileId, version: 1 };
}

export async function updateProfile(id: string, input: z.infer<typeof updateProfileSchema>) {
  const data = updateProfileSchema.parse(input);
  const supabase = getSupabaseClient();

  if (supabase) {
    if (data.name || data.description !== undefined) {
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;

      await supabase.from('display_profiles').update(updateData).eq('id', id);
    }

    if (data.config) {
      if (data.expected_version === undefined) {
        throw new AppError('VALIDATION_ERROR', 400, 'expected_version wajib diisi saat merubah config');
      }

      const { data: newVer, error } = await supabase.rpc('update_display_config', {
        p_profile_id: id,
        p_expected_version: data.expected_version,
        p_config: data.config,
      });

      if (error) {
        if (error.message.includes('VERSION_CONFLICT')) {
          const { data: currentPrf } = await supabase.from('display_profiles').select('version').eq('id', id).single();
          throw new AppError(
            'VERSION_CONFLICT',
            409,
            `Profile telah diubah oleh admin lain (versi server: v${currentPrf?.version || '?'}, versi request: v${data.expected_version}). Silakan muat ulang.`,
            { current_version: currentPrf?.version }
          );
        }
        throw new AppError('VALIDATION_ERROR', 400, error.message);
      }

      return { id, version: newVer };
    }

    const { data: prf } = await supabase.from('display_profiles').select('version').eq('id', id).single();
    return { id, version: prf?.version || 1 };
  }

  // Fallback
  const prf = store.profiles.get(id);
  if (!prf) throw new AppError('NOT_FOUND', 404, 'Display Profile tidak ditemukan');

  const cfg = Array.from(store.configs.values()).find((c) => c.display_profile_id === prf.id);
  if (!cfg) throw new AppError('NOT_FOUND', 404, 'Display Config tidak ditemukan');

  const now = new Date().toISOString();

  if (data.name && data.name.toLowerCase() !== prf.name.toLowerCase()) {
    if (!prf.is_custom) {
      for (const p of Array.from(store.profiles.values())) {
        if (p.id !== id && !p.is_custom && p.name.toLowerCase() === data.name.toLowerCase()) {
          throw new AppError('CONFLICT', 409, `Profile dengan nama "${data.name}" sudah ada`);
        }
      }
    }
    prf.name = data.name;
  }

  if (data.description !== undefined) {
    prf.description = data.description;
  }

  if (data.config) {
    if (data.expected_version === undefined) {
      throw new AppError('VALIDATION_ERROR', 400, 'expected_version wajib diisi saat merubah config');
    }

    if (prf.version !== data.expected_version) {
      throw new AppError(
        'VERSION_CONFLICT',
        409,
        `Profile telah diubah oleh admin lain (versi server: v${prf.version}, versi request: v${data.expected_version}). Silakan muat ulang.`,
        { current_version: prf.version }
      );
    }

    const mergedConfig = {
      product_name: data.config.product_name !== undefined ? data.config.product_name : cfg.product_name,
      price: data.config.price !== undefined ? data.config.price : cfg.price,
      unit: data.config.unit !== undefined ? data.config.unit : cfg.unit,
      promo_text: data.config.promo_text !== undefined ? data.config.promo_text : cfg.promo_text,
      font_size: data.config.font_size !== undefined ? data.config.font_size : cfg.font_size,
      font_weight: data.config.font_weight !== undefined ? data.config.font_weight : cfg.font_weight,
      alignment: data.config.alignment !== undefined ? data.config.alignment : cfg.alignment,
      brightness: data.config.brightness !== undefined ? data.config.brightness : cfg.brightness,
      rotation: data.config.rotation !== undefined ? data.config.rotation : cfg.rotation,
      layout_config: data.config.layout_config !== undefined ? data.config.layout_config : cfg.layout_config,
    };

    const hasChanged =
      mergedConfig.product_name !== cfg.product_name ||
      mergedConfig.price !== cfg.price ||
      mergedConfig.unit !== cfg.unit ||
      mergedConfig.promo_text !== cfg.promo_text ||
      mergedConfig.font_size !== cfg.font_size ||
      mergedConfig.font_weight !== cfg.font_weight ||
      mergedConfig.alignment !== cfg.alignment ||
      mergedConfig.brightness !== cfg.brightness ||
      mergedConfig.rotation !== cfg.rotation ||
      JSON.stringify(mergedConfig.layout_config) !== JSON.stringify(cfg.layout_config);

    if (hasChanged) {
      cfg.product_name = mergedConfig.product_name;
      cfg.price = mergedConfig.price;
      cfg.unit = mergedConfig.unit;
      cfg.promo_text = mergedConfig.promo_text;
      cfg.font_size = mergedConfig.font_size;
      cfg.font_weight = mergedConfig.font_weight;
      cfg.alignment = mergedConfig.alignment;
      cfg.brightness = mergedConfig.brightness;
      cfg.rotation = mergedConfig.rotation;
      cfg.layout_config = mergedConfig.layout_config;
      cfg.updated_at = now;

      prf.version += 1;
    }
  }

  prf.updated_at = now;
  store.profiles.set(id, prf);
  store.configs.set(cfg.id, cfg);

  store.refreshAllSync();

  return { id: prf.id, version: prf.version };
}

export async function deleteProfile(id: string, force = false) {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase.from('display_profiles').delete().eq('id', id);
    if (error) throw new AppError('IN_USE', 409, 'Profile sedang digunakan oleh device/group');
    return { success: true };
  }

  // Fallback
  const prf = store.profiles.get(id);
  if (!prf) throw new AppError('NOT_FOUND', 404, 'Display Profile tidak ditemukan');

  let activeUsageCount = 0;
  for (const dev of Array.from(store.devices.values())) {
    if (store.getEffectiveProfileId(dev.id) === id) {
      activeUsageCount++;
    }
  }

  if (activeUsageCount > 0 && !force) {
    throw new AppError(
      'IN_USE',
      409,
      `Profile ini sedang digunakan oleh ${activeUsageCount} device. Gunakan force=true untuk menghapus.`
    );
  }

  for (const [asgId, asg] of Array.from(store.assignments.entries())) {
    if (asg.display_profile_id === id) {
      store.assignments.delete(asgId);
    }
  }

  store.profiles.delete(id);
  for (const [cfgId, cfg] of Array.from(store.configs.entries())) {
    if (cfg.display_profile_id === id) {
      store.configs.delete(cfgId);
    }
  }

  store.refreshAllSync();
  return { success: true };
}
