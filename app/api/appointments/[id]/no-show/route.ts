import { NextRequest, NextResponse } from 'next/server';
import { markNoShow } from '@/app/actions/appointment';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const appointmentId = parseInt(id, 10);
    
    if (isNaN(appointmentId)) {
      return NextResponse.json(
        { success: false, msg: 'Invalid appointment ID' },
        { status: 400 }
      );
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is ok
    }
    
    const { reason } = body as { reason?: string };
    
    const result = await markNoShow(appointmentId, reason);
    
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('[API] Mark no-show error:', error);
    return NextResponse.json(
      { success: false, msg: 'Internal server error' },
      { status: 500 }
    );
  }
}
