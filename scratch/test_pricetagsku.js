const token = 'dpt_d1b47933c587eda1008f4d6e3527636ce0e7890200e56901fb15c1c20d55eb39';

const deviceHeaders = {
  'x-device-uid': 'ALFA1-MINYAKKITA',
  'authorization': `Bearer ${token}`,
  'content-type': 'application/json'
};

async function testVercel() {
  const domain = 'https://pricetagsku.vercel.app';
  console.log(`=== TESTING VERCEL DEPLOYMENT: ${domain} ===`);

  try {
    console.log('1. Testing GET /api/device/config ...');
    const cfgRes = await fetch(`${domain}/api/device/config`, { headers: deviceHeaders });
    console.log('Status Code:', cfgRes.status);
    console.log('Headers:', Object.fromEntries(cfgRes.headers.entries()));
    const cfgData = await cfgRes.json();
    console.log('GET /api/device/config Response:\n', JSON.stringify(cfgData, null, 2));
  } catch (e) {
    console.error('GET /api/device/config error:', e);
  }

  try {
    console.log('\n2. Testing POST /api/device/heartbeat ...');
    const hbRes = await fetch(`${domain}/api/device/heartbeat`, {
      method: 'POST',
      headers: deviceHeaders,
      body: JSON.stringify({
        firmware_version: 'v1.0.0',
        current_profile_id: 'afcfad59-6ce0-4228-88cf-cf0bbe2fc3e3',
        current_profile_version: 3,
        signal_strength: -40
      })
    });
    console.log('Heartbeat Status:', hbRes.status);
    const hbData = await hbRes.json();
    console.log('POST /api/device/heartbeat Response:\n', JSON.stringify(hbData, null, 2));
  } catch (e) {
    console.error('POST /api/device/heartbeat error:', e);
  }
}

testVercel().catch(console.error);
