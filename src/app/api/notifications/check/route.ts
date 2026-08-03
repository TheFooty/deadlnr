import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { CanvasAssignment } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { assignments, userEmail } = await request.json();

    // Determine target recipient email (from body or login cookie)
    const targetEmail = userEmail || request.cookies.get('deadlnr_user_email')?.value;

    if (!targetEmail || !targetEmail.includes('@')) {
      return NextResponse.json({ message: 'No target email provided or logged in.' });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ message: 'Resend API Key not configured.' });
    }

    const resend = new Resend(resendApiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'auth@villageprep.net';

    const now = Date.now();
    const urgentAssignments: CanvasAssignment[] = (assignments || []).filter((a: CanvasAssignment) => {
      const dueMs = new Date(a.dueDate).getTime();
      const hoursLeft = (dueMs - now) / (1000 * 60 * 60);
      return hoursLeft > 0 && hoursLeft <= 72; // Due within 3 days
    });

    if (urgentAssignments.length === 0) {
      return NextResponse.json({ message: 'No urgent deadlines within 3 days.' });
    }

    let emailsSent = 0;

    for (const target of urgentAssignments) {
      const dueMs = new Date(target.dueDate).getTime();
      const hoursLeft = Math.max(1, Math.round((dueMs - now) / (1000 * 60 * 60)));

      let stage = '3d';
      let subject = '';
      let headerText = '';
      let messageText = '';
      let badgeColor = '#F59E0B';

      if (hoursLeft <= 12) {
        stage = '12h';
        subject = `🚨 EMERGENCY DEADLINE WARNING: "${target.title}" due in ${hoursLeft}h!`;
        headerText = `🚨 EMERGENCY DEADLINE WARNING`;
        messageText = `THIS IS NOT A DRILL! 😱 Your assignment <strong>"${target.title}"</strong> (${target.course}) is due in ONLY <strong>${hoursLeft} hours</strong>! Open Deadlnr now to launch your AI assistant!`;
        badgeColor = '#FF0055';
      } else if (hoursLeft <= 24) {
        stage = '24h';
        subject = `😱 24 HOURS LEFT: "${target.title}" is due tomorrow!`;
        headerText = `😱 24 HOURS REMAINING`;
        messageText = `Your assignment <strong>"${target.title}"</strong> (${target.course}) is due in <strong>ONLY 24 HOURS</strong>! Don't wait until the last minute!`;
        badgeColor = '#FF3B00';
      } else {
        stage = '3d';
        subject = `😰 Nervous Reminder: "${target.title}" due in ${Math.round(hoursLeft / 24)} days`;
        headerText = `😰 3 DAYS REMAINING`;
        messageText = `Just a nervous reminder that your assignment <strong>"${target.title}"</strong> (${target.course}) is due in ${Math.round(hoursLeft / 24)} days (${new Date(target.dueDate).toLocaleDateString()}). Should we get started?`;
        badgeColor = '#F59E0B';
      }

      // Check cookie marker to avoid duplicate email spamming for the same stage
      const trackingCookieName = `notified_${target.id.replace(/[^a-zA-Z0-9]/g, '_')}_${stage}`;
      const alreadySent = request.cookies.get(trackingCookieName)?.value;

      if (!alreadySent) {
        try {
          await resend.emails.send({
            from: `Deadlnr Alert <${fromEmail}>`,
            to: [targetEmail],
            subject,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background-color: #080a0f; color: #ffffff; border-radius: 24px; border: 1px solid #1e293b; text-align: center;">
                <h2 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 8px 0;">Deadlnr</h2>
                <div style="display: inline-block; background-color: ${badgeColor}20; color: ${badgeColor}; border: 1px solid ${badgeColor}40; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 99px; margin-bottom: 20px; text-transform: uppercase;">
                  ${headerText}
                </div>
                <div style="background-color: #111622; border: 1px solid #1e293b; border-radius: 20px; padding: 24px; text-align: left; margin-bottom: 24px;">
                  <span style="color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; font-family: monospace;">${target.course}</span>
                  <h3 style="color: #ffffff; font-size: 18px; font-weight: 800; margin: 6px 0 12px 0;">${target.title}</h3>
                  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0;">${messageText}</p>
                </div>
                <a href="https://deadlnr-v.vercel.app" style="display: inline-block; background-color: #FF3B00; color: #ffffff; font-weight: 800; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 16px;">
                  Open Deadlnr & Launch AI
                </a>
              </div>
            `,
          });

          emailsSent++;
        } catch (emailErr) {
          console.error('Failed to send scared deadline email:', emailErr);
        }
      }
    }

    const response = NextResponse.json({ success: true, emailsSent });

    // Set tracking cookie markers for sent emails (expires in 12 hours)
    for (const target of urgentAssignments) {
      const dueMs = new Date(target.dueDate).getTime();
      const hoursLeft = Math.max(1, Math.round((dueMs - now) / (1000 * 60 * 60)));
      const stage = hoursLeft <= 12 ? '12h' : hoursLeft <= 24 ? '24h' : '3d';
      const trackingCookieName = `notified_${target.id.replace(/[^a-zA-Z0-9]/g, '_')}_${stage}`;

      response.cookies.set(trackingCookieName, 'true', {
        path: '/',
        maxAge: 43200, // 12 hours
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    return response;
  } catch (err: any) {
    console.error('Notification check route exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
