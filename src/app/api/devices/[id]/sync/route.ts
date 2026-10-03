import { requireAdmin } from '@/lib/auth/require-admin';
import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { store } from '@/lib/storage/store';
import { forceResyncDevice } from '@/lib/services/devices.service';
import { AppError } from '@/lib/http/errors';

export const GET = withApi(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const sync = store.syncStatuses.get(params.id);
  if (!sync) throw new AppError('NOT_FOUND', 404, 'Device sync status tidak ditemukan');
  return jsonResponse(sync);
});

export const POST = withApi(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const result = forceResyncDevice(params.id);
  return jsonResponse(result);
});
