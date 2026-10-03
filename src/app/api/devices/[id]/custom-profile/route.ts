import { requireAdmin } from '@/lib/auth/require-admin';
import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { createCustomProfileForDevice } from '@/lib/services/devices.service';

export const POST = withApi(async (req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const result = await createCustomProfileForDevice(params.id, body.name, body.from_profile_id);
  return jsonResponse(result, undefined, 201);
});
