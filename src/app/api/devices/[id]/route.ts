import { requireAdmin } from '@/lib/auth/require-admin';
import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { listDevicesOverview, updateDevice, deleteDevice } from '@/lib/services/devices.service';
import { AppError } from '@/lib/http/errors';

export const GET = withApi(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const all = await listDevicesOverview();
  const item = all.find((d) => d.id === params.id);
  if (!item) throw new AppError('NOT_FOUND', 404, 'Device tidak ditemukan');
  return jsonResponse(item);
});

export const PATCH = withApi(async (req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const body = await req.json();
  const updated = await updateDevice(params.id, body);
  return jsonResponse(updated);
});

export const DELETE = withApi(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const result = await deleteDevice(params.id);
  return jsonResponse(result);
});
