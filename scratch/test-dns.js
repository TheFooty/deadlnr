const https = require('https');

const url = 'https://ttannnhcvoybjuqbdinn.supabase.co';

console.log('Inspecting connection to:', url);

const req = https.get(url, (res) => {
  console.log('HTTP Status Code:', res.statusCode);
});

req.on('error', (err) => {
  console.error('❌ Network Connection Error:', err);
});
