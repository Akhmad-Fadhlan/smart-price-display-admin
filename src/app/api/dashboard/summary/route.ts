import { requireAdmin } from '@/lib/auth/require-admin';
import { jsonResponse } from '@/lib/http/response';
import { withApi } from '@/lib/http/with-api';
import { store } from '@/lib/storage/store';
import { getSupabaseClient } from '@/lib/supabase/get-client';

export const GET = withApi(async () => {
  await requireAdmin();

  const supabase = getSupabaseClient();

  if (supabase) {
    const { data: devices } = await supabase.from('devices_overview').select('*');
    const { count: groupsCount } = await supabase.from('device_groups').select('*', { count: 'exact', head: true });

    const totalDevices = devices?.length || 0;
    const onlineCount = devices?.filter((d) => d.is_online).length || 0;
    const offlineCount = totalDevices - onlineCount;
    const pendingSync = devices?.filter((d) => d.profile_id && ['pending', 'syncing', 'failed'].includes(d.sync_status)).length || 0;

    return jsonResponse({
      total_devices: totalDevices,
      online: onlineCount,
      offline: offlineCount,
      groups: groupsCount || 0,
      pending_sync: pendingSync,
    });
  }

  // Standalone / Fallback Mode
  let totalDevices = 0;
  let onlineCount = 0;
  let offlineCount = 0;
  let pendingSync = 0;

  for (const dev of Array.from(store.devices.values())) {
    totalDevices++;
    const isOnline = store.isOnline(dev.last_seen);
    if (isOnline) onlineCount++;
    else offlineCount++;

    const sync = store.syncStatuses.get(dev.id);
    if (sync && sync.profile_id && ['pending', 'syncing', 'failed'].includes(sync.sync_status)) {
      pendingSync++;
    }
  }

  const groupsCount = store.groups.size;

  return jsonResponse({
    total_devices: totalDevices,
    online: onlineCount,
    offline: offlineCount,
    groups: groupsCount,
    pending_sync: pendingSync,
  });
});
