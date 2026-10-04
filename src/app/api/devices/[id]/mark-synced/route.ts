import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { markDeviceSynced } from '@/lib/services/devices.service';

export const POST = withApi(async (req: Request, { params }: { params: { id: string } }) => {
  const result = await markDeviceSynced(params.id);
  return jsonResponse(result);
});
