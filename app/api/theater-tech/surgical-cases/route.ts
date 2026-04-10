/**
 * POST /api/theater-tech/surgical-cases
 * 
 * Create a new surgical case for a patient (without consultation).
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { patientId, surgeonId } = await request.json();

    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Patient ID required' }, { status: 400 });
    }

    // Verify patient exists
    const patient = await db.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    // Theater tech can create cases without assigning a surgeon immediately
    // Surgeon(s) will be selected during case planning
    const primarySurgeonId: string | undefined = surgeonId || undefined;

    // Create surgical case
    const surgicalCase = await db.surgicalCase.create({
      data: {
        patient_id: patientId,
        primary_surgeon_id: primarySurgeonId,
        status: 'DRAFT',
        created_by: authResult.user.userId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      surgicalCaseId: surgicalCase.id 
    });
  } catch (error) {
    console.error('Error creating surgical case:', error);
    return NextResponse.json({ success: false, error: 'Failed to create case' }, { status: 500 });
  }
}