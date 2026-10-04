const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const headers = {
  'apikey': key,
  'Authorization': `Bearer ${key}`,
  'Content-Type': 'application/json'
};

async function check() {
  const devId = '73bd4d7a-bc4f-4e3a-8db4-9add404ab03e';
  console.log('=== STEP 1: Query device_effective_assignments ===');
  const effRes = await fetch(`${url}/rest/v1/device_effective_assignments?device_id=eq.${devId}`, { headers });
  const effs = await effRes.json();
  console.log('device_effective_assignments:', effs);

  console.log('\n=== STEP 2: Query device_profile_assignments (is_active=true) ===');
  const asgRes = await fetch(`${url}/rest/v1/device_profile_assignments?device_id=eq.${devId}&is_active=eq.true&order=assigned_at.desc`, { headers });
  const asgs = await asgRes.json();
  console.log('device_profile_assignments:', asgs);

  console.log('\n=== STEP 3: Query device_sync_status ===');
  const syncRes = await fetch(`${url}/rest/v1/device_sync_status?device_id=eq.${devId}`, { headers });
  const syncs = await syncRes.json();
  console.log('device_sync_status:', syncs);

  console.log('\n=== STEP 4: Query ALL display_profiles ===');
  const prfRes = await fetch(`${url}/rest/v1/display_profiles?select=id,name,version,is_custom`, { headers });
  const prfs = await prfRes.json();
  console.log('display_profiles:', prfs);
}

check().catch(console.error);
