import { requireAdmin } from '@/lib/auth/require-admin';
import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { listProfilesOverview, createProfile } from '@/lib/services/profiles.service';

export const GET = withApi(async (req: Request) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const includeCustom = searchParams.get('include_custom') === 'true';

  const list = await listProfilesOverview(includeCustom);
  return jsonResponse(list, { total: list.length });
});

export const POST = withApi(async (req: Request) => {
  await requireAdmin();
  const body = await req.json();
  const created = await createProfile(body);
  return jsonResponse(created, undefined, 201);
});
