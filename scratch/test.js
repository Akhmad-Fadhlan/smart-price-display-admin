const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(url, key);

async function main() {
  console.log('=== CHECKING ALFA1-MINYAKKITA ===');
  const { data: dev } = await supabase.from('devices').select('*').ilike('device_uid', 'ALFA1-MINYAKKITA').single();
  console.log('Device:', dev);

  const { data: sync } = await supabase.from('device_sync_status').select('*').eq('device_id', dev.id);
  console.log('Sync Status:', sync);

  const { data: eff } = await supabase.from('device_effective_assignments').select('*').eq('device_id', dev.id);
  console.log('Effective Assignments:', eff);

  const { data: asg } = await supabase.from('device_profile_assignments').select('*').eq('device_id', dev.id);
  console.log('All Device Assignments:', asg);

  if (eff && eff.length > 0) {
    const pId = eff[0].display_profile_id;
    const { data: prf } = await supabase.from('display_profiles').select('*').eq('id', pId).single();
    console.log('Effective Profile:', prf);

    const { data: cfg } = await supabase.from('display_configs').select('*').eq('display_profile_id', pId).single();
    console.log('Effective Config:', cfg);
  }
}

main().catch(console.error);
