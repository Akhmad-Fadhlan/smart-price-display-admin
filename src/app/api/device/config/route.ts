import { deviceAuth } from '@/lib/auth/device-auth';
import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { getDeviceConfig } from '@/lib/services/firmware.service';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: Request) => {
  const { device } = await deviceAuth(req);
  const result = await getDeviceConfig(device);

  if (!result) {
    return new NextResponse(null, { status: 204 });
  }

  const etag = `"${result.profile_id}:${result.version}"`;
  const ifNoneMatch = req.headers.get('if-none-match');

  if (ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304 });
  }

  const res = jsonResponse(result);
  res.headers.set('ETag', etag);
  return res;
});
