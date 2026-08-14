const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = 'https://ttannnhcvoybjuqbdinn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0YW5ubmhjdm95Ymp1cWJkaW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MTI4ODYsImV4cCI6MjEwMTI4ODg4Nn0.2jw2eoC_ga3I58ZA_jAkQAeBIQqbztQpT3SGLrZLOmc';

const supabase = createClient(supabaseUrl, supabaseKey);

function emailToDeterministicUuid(email) {
  const hash = crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  // Format as standard UUID: 8-4-4-4-12
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

async function testWithUuid() {
  const testEmail = 'test_user_deterministic@example.com';
  const derivedUserId = emailToDeterministicUuid(testEmail);
  console.log('Derived UUID for test email:', derivedUserId);

  console.log('Testing insert on canvas_credentials with derived user_id...');
  const res1 = await supabase
    .from('canvas_credentials')
    .upsert({
      user_id: derivedUserId,
      user_email: testEmail,
      encrypted_feed_url: 'mock_encrypted_feed_abc',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  console.log('canvas_credentials upsert with user_id onConflict:', res1);

  console.log('Testing insert on user_settings with derived user_id...');
  const res2 = await supabase
    .from('user_settings')
    .upsert({
      user_id: derivedUserId,
      user_email: testEmail,
      preferred_ai: 'gemini',
      theme: 'default',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  console.log('user_settings upsert with user_id onConflict:', res2);

  // Verify fetch
  const { data: fetchedCreds } = await supabase
    .from('canvas_credentials')
    .select('*')
    .eq('user_id', derivedUserId);
  console.log('Fetched canvas_credentials:', fetchedCreds);

  // Clean up
  await supabase.from('canvas_credentials').delete().eq('user_id', derivedUserId);
  await supabase.from('user_settings').delete().eq('user_id', derivedUserId);
  console.log('Cleaned up test rows.');
}

testWithUuid();
