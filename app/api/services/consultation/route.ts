/**
 * API Route: GET /api/services/consultation
 *
 * Returns the service ID used for consultation billing, creating it if missing.
 *
 * Purpose:
 * - Allows the consultation workspace Billing tab to reference the correct service record
 *   without hardcoding service IDs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { resolveConsultationServiceId } from '@/application/services/billing/resolveConsultationServiceId';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await JwtMiddleware.authenticate(request);
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  const role = authResult.user.role as Role;
  const allowed = [Role.DOCTOR, Role.ADMIN, Role.FRONTDESK];
  if (!allowed.includes(role)) {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
  }

  const serviceId = await resolveConsultationServiceId();
  return NextResponse.json({ success: true, data: { serviceId } });
}

