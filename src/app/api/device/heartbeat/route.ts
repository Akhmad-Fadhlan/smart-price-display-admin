import { deviceAuth } from '@/lib/auth/device-auth';
import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { processDeviceHeartbeat } from '@/lib/services/firmware.service';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: Request) => {
  const { device } = await deviceAuth(req);
  const body = await req.json();
  const result = await processDeviceHeartbeat(device, body);
  return jsonResponse(result);
});
