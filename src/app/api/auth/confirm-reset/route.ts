import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  const { token, password } = await request.json();

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const resetDoc = await adminDb.collection('passwordResets').doc(token).get();

  if (!resetDoc.exists) {
    return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
  }

  const { email, expiresAt } = resetDoc.data()!;

  if (new Date() > new Date(expiresAt.toDate())) {
    await resetDoc.ref.delete();
    return NextResponse.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 });
  }

  try {
    const user = await adminAuth.getUserByEmail(email);
    await adminAuth.updateUser(user.uid, { password });
    await resetDoc.ref.delete();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update password. Please try again.' }, { status: 500 });
  }
}
