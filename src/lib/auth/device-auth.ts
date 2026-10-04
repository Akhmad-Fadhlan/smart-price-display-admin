import { AppError } from '../http/errors';
import { store } from '../storage/store';
import { getSupabaseClient } from '../supabase/get-client';

export async function deviceAuth(req: Request) {
  const rawUid = req.headers.get('x-device-uid') || req.headers.get('X-Device-UID');
  const rawAuthHeader = req.headers.get('authorization') || req.headers.get('Authorization');

  const uid = rawUid?.trim();
  const token = rawAuthHeader?.replace(/^Bearer\s+/i, '')?.trim();

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

    if (!cred || cred.token_hash?.trim() !== token) {
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
  if (!cred || cred.token?.trim() !== token) {
    throw new AppError('UNAUTHENTICATED', 401, 'Token atau Device UID tidak valid');
  }

  return { device: targetDevice };
}
