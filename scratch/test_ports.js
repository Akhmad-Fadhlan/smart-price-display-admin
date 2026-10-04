const token = 'dpt_d1b47933c587eda1008f4d6e3527636ce0e7890200e56901fb15c1c20d55eb39';

const deviceHeaders = {
  'x-device-uid': 'ALFA1-MINYAKKITA',
  'authorization': `Bearer ${token}`,
  'content-type': 'application/json'
};

async function testPorts() {
  for (let port = 3000; port <= 3010; port++) {
    const url = `http://localhost:${port}/api/device/config`;
    try {
      const res = await fetch(url, { headers: deviceHeaders });
      console.log(`Port ${port} Status:`, res.status);
      const data = await res.json();
      console.log(`Port ${port} Response:`, JSON.stringify(data, null, 2));
    } catch (e) {
      // not running on this port
    }
  }
}

testPorts().catch(console.error);
