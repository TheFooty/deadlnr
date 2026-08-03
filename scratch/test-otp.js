const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      env[key] = val;
    }
  });
  return env;
}

async function testSignInWithOtp() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('Testing Supabase signInWithOtp directly...');
  console.log('URL:', url);

  const supabase = createClient(url, key);
  const testEmail = 'vedanth_mydur@s.thevillageschool.com';

  const res = await supabase.auth.signInWithOtp({
    email: testEmail,
    options: {
      shouldCreateUser: true,
    },
  });

  console.log('\n--- signInWithOtp Result ---');
  console.log('Data:', JSON.stringify(res.data, null, 2));
  console.log('Error:', JSON.stringify(res.error, null, 2));
}

testSignInWithOtp();
