import { requireAdmin } from '@/lib/auth/require-admin';
import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { removeAssignment } from '@/lib/services/assignments.service';

export const DELETE = withApi(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const result = removeAssignment(params.id);
  return jsonResponse(result);
});
