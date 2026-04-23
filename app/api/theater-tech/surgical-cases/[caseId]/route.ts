/**
 * DELETE /api/theater-tech/surgical-cases/[caseId]
 * 
 * Allows theater tech to delete DRAFT surgical cases.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { role } = authResult.user;
    if (role !== 'THEATER_TECHNICIAN' && role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden: Theater technician role required' }, { status: 403 });
    }

    const { caseId } = await params;

    // Validate the case exists and is in DRAFT status
    const sc = await db.surgicalCase.findUnique({
      where: { id: caseId },
      select: { id: true, status: true },
    });

    if (!sc) {
      return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
    }

    if (sc.status !== 'DRAFT') {
      return NextResponse.json({ success: false, error: 'Only draft cases can be deleted' }, { status: 400 });
    }

    // Delete the surgical case (cascade handles related records)
    await db.surgicalCase.delete({ where: { id: caseId } });

    return NextResponse.json({ success: true, msg: 'Case deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting surgical case:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete case' },
      { status: 500 }
    );
  }
}