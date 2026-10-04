const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const headers = {
  'apikey': anonKey,
  'Authorization': `Bearer ${anonKey}`,
  'Content-Type': 'application/json'
};

async function testAnon() {
  console.log('=== TESTING ANON KEY READ ACCESS ===');
  const devId = '73bd4d7a-bc4f-4e3a-8db4-9add404ab03e';

  const effRes = await fetch(`${url}/rest/v1/device_effective_assignments?device_id=eq.${devId}`, { headers });
  console.log('device_effective_assignments status:', effRes.status);
  const effs = await effRes.json();
  console.log('device_effective_assignments content:', effs);

  const prfRes = await fetch(`${url}/rest/v1/display_profiles?select=*`, { headers });
  console.log('display_profiles status:', prfRes.status);
  const prfs = await prfRes.json();
  console.log('display_profiles content:', prfs);
}

testAnon().catch(console.error);
