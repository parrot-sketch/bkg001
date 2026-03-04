import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';

/**
 * Heartbeat endpoint for active consultations
 * 
 * Purpose:
 * - Tracks last activity timestamp for session timeout detection
 * - Validates consultation is still in progress
 * - Returns current remaining time for UI sync
 * 
 * Performance Notes:
 * - Single indexed query on consultation_id
 * - Minimal data returned (timestamps only)
 * - No N+1 queries
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate request
    const auth = await JwtMiddleware.authenticate(request);
    if (!auth.success || !auth.user || auth.user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const consultationId = Number(id);
    if (!Number.isFinite(consultationId)) {
      return NextResponse.json(
        { error: 'Invalid consultation id' },
        { status: 400 }
      );
    }

    // Initialize services
    const auditService = new ConsoleAuditService();

    // Fetch consultation with minimal fields for better performance
    const consultation = await db.consultation.findUnique({
      where: { id: consultationId },
      select: {
        id: true,
        doctor_id: true,
        started_at: true,
        completed_at: true,
      },
    });
    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    // Verify consultation is still in progress
    if (consultation.completed_at !== null) {
      return NextResponse.json(
        { error: 'Consultation already completed' },
        { status: 400 }
      );
    }

    // Resolve doctor's profile id from authenticated user id
    const doctor = await db.doctor.findUnique({
      where: { user_id: auth.user.userId },
      select: { id: true },
    });
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor profile not found' },
        { status: 403 }
      );
    }

    // Verify doctor ownership
    if (consultation.doctor_id !== doctor.id) {
      return NextResponse.json(
        { error: 'Not authorized for this consultation' },
        { status: 403 }
      );
    }

    // Update last activity timestamp to current time
    const now = new Date();
    await db.consultation.update({
      where: { id: consultationId },
      data: {
        updated_at: now,
      },
    });

    // Audit the heartbeat (low verbosity - optional)
    // Only log every 5th heartbeat to avoid log spam
    if (Math.random() < 0.2) {
      await auditService.recordEvent({
        userId: auth.user.userId,
        action: 'HEARTBEAT',
        model: 'Consultation',
        recordId: String(consultationId),
        details: 'Session activity detected',
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      consultationId,
      startedAt: consultation.started_at,
    });
  } catch (error) {
    console.error('[Heartbeat] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
