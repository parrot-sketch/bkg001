import { NextRequest, NextResponse } from 'next/server';
import { reinstateAppointment } from '@/app/actions/appointment';

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
    
    const result = await reinstateAppointment(appointmentId);
    
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('[API] Reinstate appointment error:', error);
    return NextResponse.json(
      { success: false, msg: 'Internal server error' },
      { status: 500 }
    );
  }
}
