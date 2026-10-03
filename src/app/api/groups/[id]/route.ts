import { requireAdmin } from '@/lib/auth/require-admin';
import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { getGroupDetail, updateGroup, deleteGroup } from '@/lib/services/groups.service';

export const GET = withApi(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const detail = await getGroupDetail(params.id);
  return jsonResponse(detail);
});

export const PATCH = withApi(async (req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const body = await req.json();
  const updated = await updateGroup(params.id, body);
  return jsonResponse(updated);
});

export const DELETE = withApi(async (req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const force = searchParams.get('force') === 'true';
  const result = await deleteGroup(params.id, force);
  return jsonResponse(result);
});
