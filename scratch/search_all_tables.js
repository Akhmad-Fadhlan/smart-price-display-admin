const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };

async function searchAll() {
  const target = '13e566d4-0c2e-4755-bf8d-fbc7dde9aeac';
  console.log('=== SEARCHING FOR 13e566d4-0c2e-4755-bf8d-fbc7dde9aeac IN ALL TABLES ===');

  const tables = ['devices', 'device_groups', 'display_profiles', 'display_configs', 'device_profile_assignments', 'device_sync_status', 'audit_logs'];

  for (const t of tables) {
    const res = await fetch(`${url}/rest/v1/${t}?select=*`, { headers });
    const data = await res.json();
    const matches = (data || []).filter(row => JSON.stringify(row).includes(target));
    console.log(`Table [${t}]: total ${data?.length} rows, matches with target:`, matches.length);
    if (matches.length > 0) {
      console.log(`Matching rows in [${t}]:`, matches);
    }
  }
}

searchAll().catch(console.error);
