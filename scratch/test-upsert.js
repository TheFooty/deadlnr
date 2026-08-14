const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ttannnhcvoybjuqbdinn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0YW5ubmhjdm95Ymp1cWJkaW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MTI4ODYsImV4cCI6MjEwMTI4ODg4Nn0.2jw2eoC_ga3I58ZA_jAkQAeBIQqbztQpT3SGLrZLOmc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function safeUpsert(table, matchColumn, matchValue, payload) {
  const { data: existing, error: selectErr } = await supabase
    .from(table)
    .select('id')
    .ilike(matchColumn, matchValue)
    .maybeSingle();

  if (selectErr) {
    console.error(`Select error on ${table}:`, selectErr);
  }

  if (existing?.id) {
    const { error: updateErr } = await supabase
      .from(table)
      .update(payload)
      .eq('id', existing.id);
    if (updateErr) console.error(`Update error on ${table}:`, updateErr);
    return { success: !updateErr, action: 'updated' };
  } else {
    const { error: insertErr } = await supabase
      .from(table)
      .insert({ ...payload, [matchColumn]: matchValue });
    if (insertErr) console.error(`Insert error on ${table}:`, insertErr);
    return { success: !insertErr, action: 'inserted' };
  }
}

async function testSafeUpsert() {
  console.log('Testing safeUpsert...');

  const testEmail = 'test_user@example.com';

  const res1 = await safeUpsert('canvas_credentials', 'user_email', testEmail, {
    encrypted_feed_url: 'mock_encrypted_feed_123',
    updated_at: new Date().toISOString(),
  });
  console.log('canvas_credentials safeUpsert (1st call):', res1);

  const res1Again = await safeUpsert('canvas_credentials', 'user_email', testEmail, {
    encrypted_feed_url: 'mock_encrypted_feed_updated_456',
    updated_at: new Date().toISOString(),
  });
  console.log('canvas_credentials safeUpsert (2nd call):', res1Again);

  const res2 = await safeUpsert('user_settings', 'user_email', testEmail, {
    preferred_ai: 'gemini',
    theme: 'default',
    updated_at: new Date().toISOString(),
  });
  console.log('user_settings safeUpsert:', res2);

  // Verify data in table
  const { data: verifyCreds } = await supabase.from('canvas_credentials').select('*').ilike('user_email', testEmail);
  console.log('Verified canvas_credentials:', verifyCreds);

  // Clean up
  await supabase.from('canvas_credentials').delete().ilike('user_email', testEmail);
  await supabase.from('user_settings').delete().ilike('user_email', testEmail);
  console.log('Cleanup done.');
}

testSafeUpsert();
