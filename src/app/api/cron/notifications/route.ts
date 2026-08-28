import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decryptText } from '@/lib/crypto';
import { parseCanvasICalFeed } from '@/lib/ical-parser';
import { Resend } from 'resend';
import { CanvasAssignment } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ message: 'Resend API Key is not configured.' });
    }

    const resend = new Resend(resendApiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'auth@villageprep.net';

    const supabase = await createClient();

    // 1. Fetch all saved canvas credentials from Supabase
    const { data: credentialsList, error: credsErr } = await supabase
      .from('canvas_credentials')
      .select('user_id, user_email, encrypted_feed_url');

    if (credsErr) {
      console.error('Cron: Error fetching canvas_credentials:', credsErr);
      return NextResponse.json({ error: credsErr.message }, { status: 500 });
    }

    if (!credentialsList || credentialsList.length === 0) {
      return NextResponse.json({ message: 'No registered feeds found for background check.' });
    }

    let processedUsers = 0;
    let emailsSent = 0;
    const now = Date.now();

    for (const cred of credentialsList) {
      if (!cred.encrypted_feed_url) continue;

      let targetEmail = cred.user_email;

      // If user_email is not in canvas_credentials, check user_settings
      if (!targetEmail && cred.user_id) {
        const { data: userSet } = await supabase
          .from('user_settings')
          .select('user_email')
          .eq('user_id', cred.user_id)
          .maybeSingle();

        if (userSet?.user_email) {
          targetEmail = userSet.user_email;
        }
      }

      if (!targetEmail || !targetEmail.includes('@')) continue;

      // Decrypt feed URL
      let feedUrl = '';
      try {
        feedUrl = decryptText(cred.encrypted_feed_url);
      } catch (decErr) {
        console.error('Cron: Decrypt error for user:', targetEmail, decErr);
        continue;
      }

      if (!feedUrl || !feedUrl.startsWith('http')) continue;

      try {
        processedUsers++;

        // Fetch .ics file from Canvas / Kognity / Calendar
        const feedRes = await fetch(feedUrl, {
          headers: { 'User-Agent': 'Deadlnr-Background-Cron/1.0' },
          cache: 'no-store',
        });

        if (!feedRes.ok) {
          console.warn(`Cron: Failed to fetch feed for ${targetEmail} (HTTP ${feedRes.status})`);
          continue;
        }

        const icsText = await feedRes.text();
        const assignments: CanvasAssignment[] = await parseCanvasICalFeed(icsText);

        // Filter assignments due in the future and within 72 hours (3 days)
        const urgentAssignments = assignments.filter((a) => {
          const dueMs = new Date(a.dueDate).getTime();
          const hoursLeft = (dueMs - now) / (1000 * 60 * 60);
          return hoursLeft > 0 && hoursLeft <= 72;
        });

        for (const target of urgentAssignments) {
          const dueMs = new Date(target.dueDate).getTime();
          const hoursLeft = Math.max(1, Math.round((dueMs - now) / (1000 * 60 * 60)));

          let milestone = '3d';
          let subject = '';
          let headerText = '';
          let messageText = '';
          let badgeColor = '#F59E0B';

          if (hoursLeft <= 12) {
            milestone = '12h';
            subject = `🚨 EMERGENCY DEADLINE: "${target.title}" due in ${hoursLeft}h!`;
            headerText = `🚨 EMERGENCY DEADLINE WARNING`;
            messageText = `THIS IS NOT A DRILL! 😱 Your assignment <strong>"${target.title}"</strong> (${target.course}) is due in ONLY <strong>${hoursLeft} hours</strong>! Open Deadlnr now to triage it or launch your AI assistant!`;
            badgeColor = '#FF0055';
          } else if (hoursLeft <= 24) {
            milestone = '24h';
            subject = `😱 24 HOURS LEFT: "${target.title}" is due tomorrow!`;
            headerText = `😱 24 HOURS REMAINING`;
            messageText = `Your assignment <strong>"${target.title}"</strong> (${target.course}) is due in <strong>ONLY 24 HOURS</strong>! Don't wait until midnight!`;
            badgeColor = '#FF4D1C';
          } else {
            milestone = '3d';
            subject = `😰 Nervous Reminder: "${target.title}" due in ${Math.round(hoursLeft / 24)} days`;
            headerText = `😰 3 DAYS REMAINING`;
            messageText = `Just a nervous reminder that your assignment <strong>"${target.title}"</strong> (${target.course}) is due in ${Math.round(hoursLeft / 24)} days (${new Date(target.dueDate).toLocaleDateString()}). Should we get started?`;
            badgeColor = '#F59E0B';
          }

          // Check notification_logs in Supabase to guarantee no duplicate email spam
          const { data: existingLog } = await supabase
            .from('notification_logs')
            .select('id')
            .eq('user_email', targetEmail)
            .eq('assignment_id', target.id)
            .eq('milestone', milestone)
            .maybeSingle();

          if (!existingLog) {
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
                    <a href="https://deadlnr-v.vercel.app" style="display: inline-block; background-color: #FF4D1C; color: #ffffff; font-weight: 800; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 16px;">
                      Open Deadlnr & Launch AI
                    </a>
                  </div>
                `,
              });

              emailsSent++;

              // Record in Supabase notification_logs
              await supabase.from('notification_logs').insert({
                user_email: targetEmail,
                assignment_id: target.id,
                milestone,
                sent_at: new Date().toISOString(),
              });
            } catch (mailErr) {
              console.error(`Cron: Failed to send email to ${targetEmail}:`, mailErr);
            }
          }
        }
      } catch (userErr) {
        console.error(`Cron: Error processing user ${targetEmail}:`, userErr);
      }
    }

    return NextResponse.json({
      success: true,
      processedUsers,
      emailsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Cron notifications route exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
