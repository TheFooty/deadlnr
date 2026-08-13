const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ttannnhcvoybjuqbdinn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0YW5ubmhjdm95Ymp1cWJkaW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MTI4ODYsImV4cCI6MjEwMTI4ODg4Nn0.2jw2eoC_ga3I58ZA_jAkQAeBIQqbztQpT3SGLrZLOmc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing Supabase queries...');
  
  const { data: set, error: setErr } = await supabase.from('user_settings').select('*').limit(5);
  console.log('user_settings query:', { data: set, error: setErr });

  const { data: cred, error: credErr } = await supabase.from('canvas_credentials').select('*').limit(5);
  console.log('canvas_credentials query:', { data: cred, error: credErr });
}

test();
