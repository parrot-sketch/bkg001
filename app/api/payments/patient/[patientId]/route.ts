/**
 * API Route: GET /api/payments/patient/[patientId]
 * 
 * Get all payments for a specific patient.
 * 
 * Security:
 * - Requires authentication
 * - Accessible to FRONTDESK, ADMIN roles
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaPaymentRepository } from '@/infrastructure/database/repositories/PrismaPaymentRepository';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

const paymentRepository = new PrismaPaymentRepository(db);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
): Promise<NextResponse> {
  try {
    // 1. Authenticate request
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Check permissions
    const allowedRoles = [Role.FRONTDESK, Role.ADMIN, Role.DOCTOR, Role.NURSE];
    if (!allowedRoles.includes(authResult.user.role as Role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // 3. Get patient ID from params
    const { patientId } = await params;
    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // 4. Fetch payments for the patient
    const payments = await paymentRepository.findByPatientId(patientId);

    // 5. Return response
    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('[API] /api/payments/patient/[patientId] - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
