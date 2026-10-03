import { requireAdmin } from '@/lib/auth/require-admin';
import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { listDevicesOverview, registerDevice } from '@/lib/services/devices.service';

export const GET = withApi(async (req: Request) => {
  await requireAdmin();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || undefined;
  const group_id = searchParams.get('group_id') || undefined;
  const onlineParam = searchParams.get('online');
  const online = onlineParam !== null ? onlineParam === 'true' : undefined;
  const sync_status = searchParams.get('sync_status') || undefined;
  const q = searchParams.get('q') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '20', 10));

  const items = await listDevicesOverview({ type, group_id, online, sync_status, q });
  const total = items.length;
  const start = (page - 1) * pageSize;
  const paginated = items.slice(start, start + pageSize);

  return jsonResponse(paginated, { page, pageSize, total });
});

export const POST = withApi(async (req: Request) => {
  await requireAdmin();
  const body = await req.json();
  const result = await registerDevice(body);
  return jsonResponse(result, undefined, 201);
});
