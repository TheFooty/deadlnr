const ical = require('node-ical');

// Realistic Canvas LMS iCal ICS Feed Sample
const sampleCanvasICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Instructure//Canvas//EN
CALSCALE:GREGORIAN-[#METHOD:PUBLISH]
X-WR-CALNAME:Canvas Calendar Feed
BEGIN:VEVENT
UID:event-assignment-98402
DTSTART:20260803T180000Z
DTEND:20260803T235900Z
SUMMARY:Final Essay Draft [ENGL 201: Rhetoric & Composition]
DESCRIPTION:<p>Please submit your 1,500 word final essay draft on Canvas. Make sure to include 5 peer-reviewed citations.</p><p><a href="https://canvas.university.edu/courses/1042/assignments/98402">View assignment details</a></p>
URL:https://canvas.university.edu/courses/1042/assignments/98402
END:VEVENT
BEGIN:VEVENT
UID:event-assignment-10492
DTSTART:20260804T120000Z
DTEND:20260804T170000Z
SUMMARY:CS 350 - Distributed Key-Value Store Implementation
DESCRIPTION:Implement node joining, finger table routing, and data replication across virtual nodes in Go.
URL:https://canvas.university.edu/courses/1201/assignments/10492
END:VEVENT
END:VCALENDAR`;

async function testParser() {
  console.log('Testing node-ical parser on Canvas LMS sample feed...\n');
  const parsedData = await ical.async.parseICS(sampleCanvasICS);
  const events = [];

  for (const key in parsedData) {
    const item = parsedData[key];
    if (!item || item.type !== 'VEVENT') continue;

    const summary = item.summary ? String(item.summary) : '';

    // Split title and course
    let title = summary.trim();
    let course = 'Canvas';
    const bracketMatch = summary.match(/^(.*?)\s*\[(.*?)\]\s*$/);
    if (bracketMatch) {
      title = bracketMatch[1].trim();
      course = bracketMatch[2].trim();
    } else {
      const dashMatch = summary.match(/^([A-Z]{2,6}\s*\d{2,4}[A-Z]?)\s*[:-]\s*(.*)$/i);
      if (dashMatch) {
        course = dashMatch[1].trim();
        title = dashMatch[2].trim();
      }
    }

    // Clean description
    let rawDesc = item.description ? String(item.description) : '';
    let description = rawDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    events.push({
      id: item.uid,
      title,
      course,
      dueDate: item.end ? new Date(item.end).toISOString() : new Date().toISOString(),
      description,
      canvasUrl: item.url ? (typeof item.url === 'string' ? item.url : item.url.val) : '',
    });
  }

  console.log('Parsed Events Result:');
  console.log(JSON.stringify(events, null, 2));

  if (events.length === 2 && events[0].course === 'ENGL 201: Rhetoric & Composition') {
    console.log('\n✅ SUCCESS: node-ical parsed the Canvas iCal feed cleanly!');
  } else {
    console.log('\n❌ FAILED: iCal parsing test failed.');
  }
}

testParser();
