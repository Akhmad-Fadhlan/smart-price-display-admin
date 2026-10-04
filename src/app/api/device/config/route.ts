import { deviceAuth } from '@/lib/auth/device-auth';
import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { getDeviceConfig } from '@/lib/services/firmware.service';
import { getSupabaseClient } from '@/lib/supabase/get-client';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withApi(async (req: Request) => {
  const { device } = await deviceAuth(req);
  const result = await getDeviceConfig(device);

  if (!result) {
    return new NextResponse(null, { status: 204 });
  }

  const rawIfNoneMatch = req.headers.get('if-none-match');
  const cleanIfNoneMatch = rawIfNoneMatch?.replace(/^"|"$/g, '').trim().toLowerCase();
  const targetTag = `${result.profile_id}:${result.version}`.toLowerCase();

  if (!result.force_resync && cleanIfNoneMatch && cleanIfNoneMatch === targetTag) {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('device_sync_status').upsert({
        device_id: device.id,
        profile_id: result.profile_id,
        profile_version: result.version,
        synced_profile_id: result.profile_id,
        synced_version: result.version,
        sync_status: 'synced',
        force_resync: false,
        last_sync: new Date().toISOString(),
        last_error: null,
      }, { onConflict: 'device_id' });
    }
    return new NextResponse(null, { status: 304 });
  }

  const res = jsonResponse(result);
  res.headers.set('ETag', `"${result.profile_id}:${result.version}"`);
  res.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      res.headers.set('X-Supabase-Url-Host', new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname);
    } catch (e) {}
  }
  return res;
});
