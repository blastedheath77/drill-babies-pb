import { NextRequest, NextResponse } from 'next/server';
import { verifyDuprPlayerId } from '@/lib/dupr-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const duprId = searchParams.get('duprId');

  if (!duprId || !duprId.trim()) {
    return NextResponse.json({ valid: false, error: 'duprId query parameter is required' }, { status: 400 });
  }

  const result = await verifyDuprPlayerId(duprId.trim());
  return NextResponse.json(result);
}
