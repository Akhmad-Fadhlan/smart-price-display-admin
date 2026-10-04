const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const headers = { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` };

async function compare() {
  const deviceId = '73bd4d7a-bc4f-4e3a-8db4-9add404ab03e';

  console.log('=== TEST WITH ANON KEY ===');
  const res1 = await fetch(`${url}/rest/v1/device_effective_assignments?device_id=eq.${deviceId}&limit=1`, { headers });
  console.log('Anon Key device_effective_assignments:', await res1.json());

  const res2 = await fetch(`${url}/rest/v1/device_sync_status?device_id=eq.${deviceId}`, { headers });
  console.log('Anon Key device_sync_status:', await res2.json());

  const res3 = await fetch(`${url}/rest/v1/display_profiles?id=eq.afcfad59-6ce0-4228-88cf-cf0bbe2fc3e3`, { headers });
  console.log('Anon Key display_profiles:', await res3.json());
}

compare().catch(console.error);
