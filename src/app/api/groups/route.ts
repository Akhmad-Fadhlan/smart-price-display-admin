import { requireAdmin } from '@/lib/auth/require-admin';
import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { listGroupsOverview, createGroup } from '@/lib/services/groups.service';

export const GET = withApi(async () => {
  await requireAdmin();
  const list = await listGroupsOverview();
  return jsonResponse(list, { total: list.length });
});

export const POST = withApi(async (req: Request) => {
  await requireAdmin();
  const body = await req.json();
  const created = await createGroup(body);
  return jsonResponse(created, undefined, 201);
});
