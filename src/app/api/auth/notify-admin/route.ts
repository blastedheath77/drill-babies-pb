import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { name, email, clubName } = await request.json();

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json({ error: 'ADMIN_EMAIL not configured' }, { status: 500 });
  }

  await resend.emails.send({
    from: 'PBStats <onboarding@resend.dev>',
    to: adminEmail,
    subject: `New PBStats signup: ${name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">New user signed up</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 80px;">Name</td>
            <td style="padding: 8px 0; font-weight: bold;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Email</td>
            <td style="padding: 8px 0;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Club</td>
            <td style="padding: 8px 0;">${clubName || 'None selected'}</td>
          </tr>
        </table>
        <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">
          You may need to place them in the correct club via the admin dashboard.
        </p>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}
