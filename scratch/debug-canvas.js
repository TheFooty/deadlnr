const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
function getKey() { return crypto.createHash('sha256').update('deadlnr-secret-encryption-key-32b!').digest(); }
function decrypt(enc) {
  const [ivH, authH, encH] = enc.split(':');
  const key = getKey();
  const iv = Buffer.from(ivH, 'hex');
  const authTag = Buffer.from(authH, 'hex');
  const d = crypto.createDecipheriv(ALGORITHM, key, iv);
  d.setAuthTag(authTag);
  let r = d.update(encH, 'hex', 'utf8');
  r += d.final('utf8');
  return r;
}

const s = createClient(
  'https://ttannnhcvoybjuqbdinn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0YW5ubmhjdm95Ymp1cWJkaW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MTI4ODYsImV4cCI6MjEwMTI4ODg4Nn0.2jw2eoC_ga3I58ZA_jAkQAeBIQqbztQpT3SGLrZLOmc'
);

(async () => {
  const { data } = await s.from('canvas_credentials').select('*').eq('user_email', 'vedanth_mydur@s.thevillageschool.com').single();
  const feedUrl = decrypt(data.encrypted_feed_url);
  const token = decrypt(data.encrypted_api_token);
  const domain = data.canvas_domain;

  // Fetch iCal
  console.log('=== iCal Feed Assignments ===');
  const r = await fetch(feedUrl);
  const ics = await r.text();
  const lines = ics.split('\n');
  const summaries = lines.filter(l => l.startsWith('SUMMARY'));
  summaries.forEach(s => console.log('  iCal:', s.trim()));

  const uids = lines.filter(l => l.startsWith('UID'));
  console.log('\n=== iCal UIDs ===');
  uids.forEach(u => console.log('  ', u.trim()));

  // Fetch Canvas API submitted
  console.log('\n=== Canvas API Submitted/Graded ===');
  const cr = await fetch(`https://${domain}/api/v1/courses?enrollment_state=active&per_page=50`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const courses = await cr.json();
  let submitted = [];
  for (const c of courses) {
    const ar = await fetch(`https://${domain}/api/v1/courses/${c.id}/assignments?include[]=submission&per_page=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (ar.ok) {
      const assigns = await ar.json();
      for (const a of assigns) {
        const state = a.submission?.workflow_state;
        if (state === 'submitted' || state === 'graded') {
          submitted.push({ id: String(a.id), name: a.name, state });
        }
      }
    }
  }
  console.log(`Total submitted/graded: ${submitted.length}`);
  submitted.forEach(s => console.log(`  [${s.state}] ID:${s.id} "${s.name}"`));

  // Now check matching
  console.log('\n=== Title Matching Test ===');
  const submittedTitles = new Set(submitted.map(s => s.name.trim().toLowerCase()));
  for (const sumLine of summaries) {
    const rawTitle = sumLine.replace('SUMMARY:', '').trim();
    // Parse like the app does: extract title from "Title [Course]"
    let title = rawTitle;
    const bracketMatch = rawTitle.match(/^(.*?)\s*\[(.*?)\]\s*$/);
    if (bracketMatch) title = bracketMatch[1].trim();
    const parenMatch = rawTitle.match(/^(.*?)\s*\((.*?)\)\s*$/);
    if (!bracketMatch && parenMatch) title = parenMatch[1].trim();

    const isSubmitted = submittedTitles.has(title.toLowerCase());
    console.log(`  ${isSubmitted ? 'HIDE' : 'SHOW'}: "${title}" (raw: "${rawTitle}")`);
  }
})();
