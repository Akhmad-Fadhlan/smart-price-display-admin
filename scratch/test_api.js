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

async function test() {
  console.log('=== TEST 1: Query Supabase REST API directly ===');
  const devRes = await fetch(`${url}/rest/v1/devices?device_uid=ilike.ALFA1-MINYAKKITA`, { headers });
  const dev = await devRes.json();
  console.log('1. Device in DB:', dev[0]);

  const credRes = await fetch(`${url}/rest/v1/device_credentials?device_id=eq.${dev[0].id}`, { headers });
  const creds = await credRes.json();
  console.log('2. Device Credentials in DB:', creds);

  const token = creds[0].token_hash;

  console.log('3. Calling verify_device_token RPC...');
  const rpcRes = await fetch(`${url}/rest/v1/rpc/verify_device_token`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_uid: 'ALFA1-MINYAKKITA', p_token: token })
  });
  const rpcData = await rpcRes.json();
  console.log('RPC Response:', rpcData);

  console.log('\n=== TEST 2: Calling Local / Production Next.js API as ESP32 ===');
  const siteUrl = env['NEXT_PUBLIC_SITE_URL'] || 'http://localhost:3000';
  console.log('Target Site URL:', siteUrl);

  const deviceHeaders = {
    'x-device-uid': 'ALFA1-MINYAKKITA',
    'authorization': `Bearer ${token}`,
    'content-type': 'application/json'
  };

  try {
    console.log('Calling GET /api/device/config ...');
    const cfgRes = await fetch(`${siteUrl}/api/device/config`, { headers: deviceHeaders });
    console.log('Config Response Status:', cfgRes.status);
    const cfgData = await cfgRes.json();
    console.log('Config Response Body:', JSON.stringify(cfgData, null, 2));
  } catch (e) {
    console.error('Config Request Failed:', e.message);
  }
}

test().catch(console.error);
