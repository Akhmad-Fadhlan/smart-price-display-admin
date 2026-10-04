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

async function dump() {
  console.log('=== DUMPING ALL TABLES FROM SUPABASE ===');
  const prfRes = await fetch(`${url}/rest/v1/display_profiles?select=*`, { headers });
  const prfs = await prfRes.json();
  console.log('ALL Profiles:', prfs);

  const cfgRes = await fetch(`${url}/rest/v1/display_configs?select=*`, { headers });
  const cfgs = await cfgRes.json();
  console.log('ALL Configs:', cfgs);
}

dump().catch(console.error);
