import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * Test endpoint to verify Firebase Admin SDK is working
 * GET /api/calendar/test
 */
export async function GET() {
  try {
    // Try to read from Firestore
    const testQuery = await adminDb.collection('users').limit(1).get();

    return NextResponse.json({
      success: true,
      message: 'Firebase Admin SDK is working!',
      canReadFirestore: !testQuery.empty,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Firebase Admin SDK error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Firebase Admin SDK is NOT working',
    }, { status: 500 });
  }
}
