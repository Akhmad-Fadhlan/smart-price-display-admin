import { requireAdmin } from '@/lib/auth/require-admin';
import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { listActiveAssignments, createAssignments } from '@/lib/services/assignments.service';

export const GET = withApi(async (req: Request) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const profile_id = searchParams.get('profile_id') || undefined;
  const device_id = searchParams.get('device_id') || undefined;
  const group_id = searchParams.get('group_id') || undefined;

  const list = await listActiveAssignments({ profile_id, device_id, group_id });
  return jsonResponse(list, { total: list.length });
});

export const POST = withApi(async (req: Request) => {
  await requireAdmin();
  const body = await req.json();
  const result = await createAssignments(body);
  return jsonResponse(result, undefined, 201);
});
