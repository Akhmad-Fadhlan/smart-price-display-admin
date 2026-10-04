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

async function main() {
  console.log('=== REST FETCH FOR ALFA1-MINYAKKITA ===');
  const devRes = await fetch(`${url}/rest/v1/devices?device_uid=ilike.ALFA1-MINYAKKITA`, { headers });
  const dev = await devRes.json();
  console.log('Device:', dev);

  if (!dev || dev.length === 0) return;
  const devId = dev[0].id;

  const credRes = await fetch(`${url}/rest/v1/device_credentials?device_id=eq.${devId}`, { headers });
  const creds = await credRes.json();
  console.log('Credentials:', creds);

  const syncRes = await fetch(`${url}/rest/v1/device_sync_status?device_id=eq.${devId}`, { headers });
  const syncs = await syncRes.json();
  console.log('Sync Status:', syncs);

  const effRes = await fetch(`${url}/rest/v1/device_effective_assignments?device_id=eq.${devId}`, { headers });
  const effs = await effRes.json();
  console.log('Effective Assignments:', effs);

  if (creds && creds.length > 0) {
    const token = creds[0].token_hash;
    const rpcRes = await fetch(`${url}/rest/v1/rpc/verify_device_token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_uid: 'ALFA1-MINYAKKITA', p_token: token })
    });
    const rpcData = await rpcRes.json();
    console.log('RPC verify_device_token result:', rpcData);
  }
}

main().catch(console.error);
