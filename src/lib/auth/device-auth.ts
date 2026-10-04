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
    // --- Coba RPC verify_device_token (Security Definer, bypass RLS) ---
    try {
      const { data: rpcDev, error: rpcErr } = await supabase.rpc('verify_device_token', {
        p_uid: uid,
        p_token: token,
      });

      if (!rpcErr && rpcDev && Array.isArray(rpcDev) && rpcDev.length > 0) {
        return { device: rpcDev[0] };
      }

      if (!rpcErr && rpcDev !== null) {
        // RPC berhasil tapi array kosong = token/uid salah
        throw new AppError('UNAUTHENTICATED', 401, 'Token atau Device UID tidak valid');
      }
      // Jika rpcErr (fungsi belum ada), lanjut ke fallback query
    } catch (e: unknown) {
      if (e instanceof AppError) throw e;
      // RPC belum ada di DB, gunakan fallback direct query
    }

    // --- Fallback: query langsung (butuh service role key di Vercel env) ---
    const { data: dev } = await supabase
      .from('devices')
      .select('id, device_uid, name, device_type, group_id, firmware_version, last_seen, ip_address, battery, signal_strength, created_at, updated_at')
      .ilike('device_uid', uid)
      .maybeSingle();

    if (!dev) {
      throw new AppError('UNAUTHENTICATED', 401, 'Token atau Device UID tidak valid');
    }

    const { data: cred, error: credErr } = await supabase
      .from('device_credentials')
      .select('token_hash')
      .eq('device_id', dev.id)
      .limit(1);

    // Jika RLS memblokir (error atau cred null), tolak dengan 401
    if (credErr || !cred || cred.length === 0) {
      console.error('[device-auth] Error saat mengambil credentials:', credErr?.message);
      throw new AppError('UNAUTHENTICATED', 401, 'Token atau Device UID tidak valid');
    }

    if (cred[0].token_hash?.trim() !== token) {
      throw new AppError('UNAUTHENTICATED', 401, 'Token atau Device UID tidak valid');
    }

    return { device: dev };
  }

  // Fallback to InMemStore (development only)
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
