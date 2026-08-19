import ical from 'node-ical';
import { CanvasAssignment } from './types';

/**
 * Clean HTML string into clean plain text for assignment description
 */
function cleanDescription(rawDesc?: string): string {
  if (!rawDesc) return '';

  // Remove HTML tags
  let text = rawDesc.replace(/<[^>]*>/g, ' ');
  // Unescape common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Collapse multiple spaces/newlines
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Checks if an event is completed, submitted, or cancelled on Canvas LMS
 */
function isAssignmentCompletedOrCancelled(item: any, rawDesc: string, summary: string): boolean {
  // Check standard iCal STATUS
  const status = (item.status || '').toString().toUpperCase();
  if (status === 'COMPLETED' || status === 'CANCELLED' || status === 'TENTATIVE') {
    return true;
  }

  // Check summary indicators
  const upperSummary = (summary || '').toUpperCase();
  if (
    upperSummary.includes('[COMPLETED]') ||
    upperSummary.includes('[SUBMITTED]') ||
    upperSummary.includes('(SUBMITTED)') ||
    upperSummary.includes('(COMPLETED)') ||
    upperSummary.includes('[TURNED IN]')
  ) {
    return true;
  }

  // Check description indicators
  const upperDesc = (rawDesc || '').toUpperCase();
  if (
    upperDesc.includes('STATUS: SUBMITTED') ||
    upperDesc.includes('STATUS: COMPLETED') ||
    upperDesc.includes('SUBMISSION: SUBMITTED') ||
    upperDesc.includes('ALREADY SUBMITTED')
  ) {
    return true;
  }

  return false;
}

/**
 * Splits Canvas VEVENT SUMMARY into title and course.
 * Canvas usually encodes course like: "Essay Draft [ENGL 201]" or "Quiz 2 (CS 101)"
 */
function parseTitleAndCourse(summary?: string): { title: string; course: string } {
  if (!summary) return { title: 'Untitled Assignment', course: 'Canvas' };

  let title = summary.trim();
  let course = 'Canvas';

  // Pattern 1: Title [COURSE CODE]
  const bracketMatch = summary.match(/^(.*?)\s*\[(.*?)\]\s*$/);
  if (bracketMatch) {
    title = bracketMatch[1].trim();
    course = bracketMatch[2].trim();
    return { title, course };
  }

  // Pattern 2: Title (COURSE CODE)
  const parenMatch = summary.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (parenMatch) {
    title = parenMatch[1].trim();
    course = parenMatch[2].trim();
    return { title, course };
  }

  // Pattern 3: COURSE CODE: Title or COURSE CODE - Title
  const prefixMatch = summary.match(/^([A-Z]{2,6}\s*\d{2,4}[A-Z]?)\s*[:-]\s*(.*)$/i);
  if (prefixMatch) {
    course = prefixMatch[1].trim();
    title = prefixMatch[2].trim();
    return { title, course };
  }

  return { title, course };
}

/**
 * Extracts a Canvas direct URL from event URL property or description text
 */
function extractCanvasUrl(eventUrl?: string | { val?: string }, rawDescription?: string): string {
  // Check direct URL property
  if (eventUrl) {
    const urlStr = typeof eventUrl === 'string' ? eventUrl : eventUrl.val;
    if (urlStr && urlStr.startsWith('http')) {
      return urlStr;
    }
  }

  // Search description for http links to canvas/instructure/courses
  if (rawDescription) {
    const urlMatch =
      rawDescription.match(/https?:\/\/[^\s"<>]+\/courses\/\d+\/assignments\/\d+/i) ||
      rawDescription.match(/https?:\/\/[^\s"<>]+/i);
    if (urlMatch) {
      return urlMatch[0];
    }
  }

  return '';
}

/**
 * Parses raw iCal ICS string into normalized CanvasAssignment objects
 */
export async function parseCanvasICalFeed(icsContent: string): Promise<CanvasAssignment[]> {
  try {
    const parsedData = await ical.async.parseICS(icsContent);
    const assignments: CanvasAssignment[] = [];
    const now = new Date().getTime();

    for (const key in parsedData) {
      const item = parsedData[key];
      if (!item || item.type !== 'VEVENT') continue;

      const summary = item.summary ? String(item.summary) : '';
      const rawDesc = item.description ? String(item.description) : '';

      // Skip completed, submitted, or cancelled assignments
      if (isAssignmentCompletedOrCancelled(item, rawDesc, summary)) {
        continue;
      }

      const { title, course } = parseTitleAndCourse(summary);
      const description = cleanDescription(rawDesc);
      const canvasUrl = extractCanvasUrl(item.url, rawDesc);

      // Determine due date (DTEND or DTSTART)
      let dueDateObj: Date | null = null;
      if (item.end) {
        dueDateObj = new Date(item.end);
      } else if (item.start) {
        dueDateObj = new Date(item.start);
      }

      const dueDate = dueDateObj ? dueDateObj.toISOString() : new Date().toISOString();

      // Skip assignments that are way past due (> 3 days ago)
      const dueTime = new Date(dueDate).getTime();
      const diffHours = (dueTime - now) / (1000 * 60 * 60);
      if (diffHours < -72) {
        // Skip ancient assignments older than 3 days past due
        continue;
      }

      const id = item.uid || `canvas-${key}-${Date.now()}`;

      assignments.push({
        id,
        title,
        course,
        dueDate,
        description,
        canvasUrl,
        uid: item.uid || '',
      });
    }

    // Sort by due date ascending (soonest due first)
    assignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return assignments;
  } catch (error) {
    console.error('Error parsing Canvas iCal feed:', error);
    throw new Error('Failed to parse iCal feed');
  }
}
