import { AppError } from '../http/errors';
import { store } from '../storage/store';
import { getSupabaseClient } from '../supabase/get-client';

export async function deviceAuth(req: Request) {
  const uid = req.headers.get('x-device-uid') || req.headers.get('X-Device-UID');
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!uid || !token) {
    throw new AppError('UNAUTHENTICATED', 401, 'Kredensial perangkat tidak lengkap');
  }

  const supabase = getSupabaseClient();

  if (supabase) {
    const { data: dev } = await supabase
      .from('devices')
      .select('*')
      .ilike('device_uid', uid)
      .maybeSingle();

    if (!dev) {
      throw new AppError('UNAUTHENTICATED', 401, 'Token atau Device UID tidak valid');
    }

    const { data: cred } = await supabase
      .from('device_credentials')
      .select('*')
      .eq('device_id', dev.id)
      .maybeSingle();

    if (!cred || cred.token_hash !== token) {
      throw new AppError('UNAUTHENTICATED', 401, 'Token atau Device UID tidak valid');
    }

    return { device: dev };
  }

  // Fallback to InMemStore
  let targetDevice = null;
  for (const dev of Array.from(store.devices.values())) {
    if (dev.device_uid.toUpperCase() === uid.toUpperCase()) {
      targetDevice = dev;
      break;
    }
  }

  if (!targetDevice) {
    throw new AppError('UNAUTHENTICATED', 401, 'Token atau Device UID tidak valid');
  }

  const cred = store.credentials.get(targetDevice.id);
  if (!cred || cred.token !== token) {
    throw new AppError('UNAUTHENTICATED', 401, 'Token atau Device UID tidak valid');
  }

  return { device: targetDevice };
}
