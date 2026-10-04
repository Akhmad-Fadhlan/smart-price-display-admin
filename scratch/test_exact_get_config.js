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

const { createClient } = require('@supabase/supabase-js');

const serviceClient = createClient(url, key, { auth: { persistSession: false } });
const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

async function run() {
  const deviceId = '73bd4d7a-bc4f-4e3a-8db4-9add404ab03e';

  console.log('=== SERVICE ROLE CLIENT ===');
  const { data: effService, error: errService } = await serviceClient
    .from('device_effective_assignments')
    .select('display_profile_id')
    .eq('device_id', deviceId)
    .limit(1);
  console.log('Service Role effective assignment:', effService, errService);

  console.log('\n=== ANON CLIENT ===');
  const { data: effAnon, error: errAnon } = await anonClient
    .from('device_effective_assignments')
    .select('display_profile_id')
    .eq('device_id', deviceId)
    .limit(1);
  console.log('Anon Client effective assignment:', effAnon, errAnon);
}

run().catch(console.error);
