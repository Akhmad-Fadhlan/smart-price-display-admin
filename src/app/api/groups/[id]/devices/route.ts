import { requireAdmin } from '@/lib/auth/require-admin';
import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { addGroupMembers, removeGroupMembers } from '@/lib/services/groups.service';
import { AppError } from '@/lib/http/errors';

export const POST = withApi(async (req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const body = await req.json();
  if (!body.device_ids || !Array.isArray(body.device_ids)) {
    throw new AppError('VALIDATION_ERROR', 400, 'device_ids wajib berupa array string');
  }
  const result = addGroupMembers(params.id, body.device_ids);
  return jsonResponse(result);
});

export const DELETE = withApi(async (req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const body = await req.json();
  if (!body.device_ids || !Array.isArray(body.device_ids)) {
    throw new AppError('VALIDATION_ERROR', 400, 'device_ids wajib berupa array string');
  }
  const result = removeGroupMembers(params.id, body.device_ids);
  return jsonResponse(result);
});
