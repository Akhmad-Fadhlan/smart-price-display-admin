const token = 'dpt_d1b47933c587eda1008f4d6e3527636ce0e7890200e56901fb15c1c20d55eb39';

const deviceHeaders = {
  'x-device-uid': 'ALFA1-MINYAKKITA',
  'authorization': `Bearer ${token}`,
  'content-type': 'application/json'
};

const domain = 'https://pricetagsku.vercel.app';

async function simulateESP32() {
  console.log('=== SIMULATING ESP32 FULL SYNC FLOW ON VERCEL ===');

  console.log('1. ESP32 sends Heartbeat ...');
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
  const hbData = await hbRes.json();
  console.log('Heartbeat response:', JSON.stringify(hbData, null, 2));

  if (hbData?.data?.config_outdated) {
    console.log('\n2. Heartbeat says config_outdated=true. ESP32 calls GET /api/device/config ...');
    const cfgRes = await fetch(`${domain}/api/device/config`, { headers: deviceHeaders });
    console.log('GET /api/device/config status:', cfgRes.status);
    const cfgData = await cfgRes.json();
    console.log('GET /api/device/config JSON:', JSON.stringify(cfgData, null, 2));

    const newProfileId = cfgData?.data?.profile_id;
    const newVersion = cfgData?.data?.version;

    if (newProfileId && newVersion) {
      console.log(`\n3. ESP32 rendered ${cfgData?.data?.config?.product_name}. ESP32 calls POST /api/device/sync-ack ...`);
      const ackRes = await fetch(`${domain}/api/device/sync-ack`, {
        method: 'POST',
        headers: deviceHeaders,
        body: JSON.stringify({
          profile_id: newProfileId,
          version: newVersion,
          success: true
        })
      });
      console.log('Sync-ACK status:', ackRes.status);
      const ackData = await ackRes.json();
      console.log('Sync-ACK response:', JSON.stringify(ackData, null, 2));
    }
  }
}

simulateESP32().catch(console.error);
