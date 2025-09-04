import { NextRequest, NextResponse } from 'next/server';
import { sendPhantomPlayerInviteFirebase } from '@/lib/firebase-email-service';

export async function POST(request: NextRequest) {
  try {
    const { playerEmail, playerName } = await request.json();

    // Basic validation
    if (!playerEmail || !playerName) {
      return NextResponse.json(
        { success: false, error: 'playerEmail and playerName are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(playerEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Send the invitation email using Firebase
    const result = await sendPhantomPlayerInviteFirebase(playerEmail, playerName);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Invitation queued for sending to ${playerEmail} (Firebase Extension will process it)`
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API Error sending Firebase phantom invite:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}