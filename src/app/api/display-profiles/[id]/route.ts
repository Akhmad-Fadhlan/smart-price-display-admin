import { requireAdmin } from '@/lib/auth/require-admin';
import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { getProfileDetail, updateProfile, deleteProfile } from '@/lib/services/profiles.service';

export const GET = withApi(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const detail = await getProfileDetail(params.id);
  return jsonResponse(detail);
});

export const PATCH = withApi(async (req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const body = await req.json();
  const result = await updateProfile(params.id, body);
  return jsonResponse(result);
});

export const DELETE = withApi(async (req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const force = searchParams.get('force') === 'true';
  const result = await deleteProfile(params.id, force);
  return jsonResponse(result);
});
