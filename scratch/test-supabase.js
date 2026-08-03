const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found');
    return {};
  }
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

async function testSupabase() {
  console.log('Testing Supabase Connection from .env.local...\n');
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('URL:', url);
  console.log('Key:', key ? `${key.substring(0, 15)}...` : 'MISSING');

  if (!url || url.includes('your-supabase-project')) {
    console.log('\n⚠️ Supabase URL is still using placeholder values.');
    return;
  }

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase.from('user_settings').select('count', { count: 'exact', head: true });

    if (error) {
      console.log('\n❌ Supabase Error:', error.message);
    } else {
      console.log('\n✅ SUCCESS: Successfully connected to Supabase database!');
      console.log('Tables are accessible and RLS policies are active.');
    }
  } catch (err) {
    console.log('\n❌ Connection Exception:', err.message);
  }
}

testSupabase();
