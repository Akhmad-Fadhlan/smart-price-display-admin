import { requireAdmin } from '@/lib/auth/require-admin';
import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { rotateDeviceToken } from '@/lib/services/devices.service';

export const POST = withApi(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const result = await rotateDeviceToken(params.id);
  return jsonResponse(result);
});
