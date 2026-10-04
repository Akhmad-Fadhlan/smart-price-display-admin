const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

async function run() {
  const deviceId = '73bd4d7a-bc4f-4e3a-8db4-9add404ab03e';

  const resService = await fetch(`${url}/rest/v1/device_effective_assignments?device_id=eq.${deviceId}`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log('Service role effective:', await resService.json());

  const resAnon = await fetch(`${url}/rest/v1/device_effective_assignments?device_id=eq.${deviceId}`, {
    headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
  });
  console.log('Anon effective:', await resAnon.json());
}

run().catch(console.error);
