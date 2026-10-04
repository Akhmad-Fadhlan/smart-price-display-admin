const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const token = 'dpt_d1b47933c587eda1008f4d6e3527636ce0e7890200e56901fb15c1c20d55eb39';

const deviceHeaders = {
  'x-device-uid': 'ALFA1-MINYAKKITA',
  'authorization': `Bearer ${token}`,
  'content-type': 'application/json'
};

const domains = [
  'https://smart-price-display-admin.vercel.app',
  'https://smart-price-display-admin-git-main-akhmad-fadhlan.vercel.app',
  'https://admin-lcd.vercel.app'
];

async function testVercel() {
  for (const domain of domains) {
    try {
      console.log(`Testing ${domain}/api/device/config ...`);
      const cfgRes = await fetch(`${domain}/api/device/config`, { headers: deviceHeaders });
      console.log(`[${domain}] Status:`, cfgRes.status);
      const text = await cfgRes.text();
      console.log(`[${domain}] Body:`, text.slice(0, 300));
    } catch (e) {
      console.log(`[${domain}] Error:`, e.message);
    }
  }
}

testVercel().catch(console.error);
