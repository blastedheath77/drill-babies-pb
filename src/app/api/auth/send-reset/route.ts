import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Check user exists — but don't reveal whether they do or not
  try {
    await adminAuth().getUserByEmail(email);
  } catch {
    // Return success anyway to prevent email enumeration
    return NextResponse.json({ success: true });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await adminDb().collection('passwordResets').doc(token).set({
    email,
    expiresAt,
    createdAt: new Date(),
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  await resend.emails.send({
    from: 'PBStats <onboarding@resend.dev>',
    to: email,
    subject: 'Reset your PBStats password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">Reset your PBStats password</h2>
        <p>We received a request to reset the password for your account.</p>
        <p>Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}"
           style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #1d4ed8; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Reset Password
        </a>
        <p style="color: #6b7280; font-size: 14px;">
          If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          Or copy and paste this link into your browser:<br/>
          <a href="${resetUrl}" style="color: #1d4ed8;">${resetUrl}</a>
        </p>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}
