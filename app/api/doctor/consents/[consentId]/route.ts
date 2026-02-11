/**
 * API Route: PATCH /api/doctor/consents/[consentId]
 *
 * Update a consent form — primarily for marking as SIGNED.
 *
 * Security:
 * - Requires authentication
 * - Only DOCTOR role
 * - Doctor must be primary surgeon of the linked case
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { ConsentStatus } from '@prisma/client';

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ consentId: string }> },
): Promise<NextResponse> {
    try {
        // 1. Auth
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (authResult.user.role !== 'DOCTOR') {
            return NextResponse.json({ success: false, error: 'Forbidden: Doctors only' }, { status: 403 });
        }

        const { consentId } = await context.params;
        const body = await request.json();

        // 2. Fetch consent with case ownership chain
        const consent = await db.consentForm.findUnique({
            where: { id: consentId },
            include: {
                case_plan: {
                    select: {
                        surgical_case: {
                            select: { primary_surgeon_id: true },
                        },
                    },
                },
            },
        });

        if (!consent) {
            return NextResponse.json({ success: false, error: 'Consent form not found' }, { status: 404 });
        }

        // 3. Verify ownership
        const doctorProfile = await db.doctor.findUnique({
            where: { user_id: authResult.user.userId },
            select: { id: true },
        });
        if (!doctorProfile) {
            return NextResponse.json({ success: false, error: 'Doctor profile not found' }, { status: 404 });
        }

        if (consent.case_plan?.surgical_case?.primary_surgeon_id !== doctorProfile.id) {
            return NextResponse.json({ success: false, error: 'Forbidden: Not the primary surgeon' }, { status: 403 });
        }

        // 4. Handle status update
        const updateData: Record<string, any> = {};

        if (body.status === 'SIGNED') {
            if (consent.status === ConsentStatus.SIGNED) {
                return NextResponse.json({ success: false, error: 'Consent is already signed' }, { status: 422 });
            }

            updateData.status = ConsentStatus.SIGNED;
            updateData.signed_at = new Date();
            updateData.signed_by_ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;

            if (body.patientSignature) {
                updateData.patient_signature = body.patientSignature;
            }
            if (body.witnessName) {
                updateData.witness_name = body.witnessName;
                updateData.witness_id = authResult.user.userId; // The doctor acts as witness
            }
            if (body.witnessSignature) {
                updateData.witness_signature = body.witnessSignature;
            }
        } else if (body.status === 'REVOKED') {
            updateData.status = ConsentStatus.REVOKED;
        } else if (body.title) {
            updateData.title = body.title;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ success: false, error: 'No valid updates provided' }, { status: 400 });
        }

        // 5. Update
        const updated = await db.consentForm.update({
            where: { id: consentId },
            data: updateData,
        });

        // 6. Audit
        const action = body.status === 'SIGNED' ? 'CONSENT_SIGNED' : 'UPDATE';
        await db.auditLog.create({
            data: {
                user_id: authResult.user.userId,
                record_id: consentId,
                action,
                model: 'ConsentForm',
                details: `Consent "${updated.title}" ${body.status === 'SIGNED' ? 'signed' : 'updated'}`,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                title: updated.title,
                type: updated.type,
                status: updated.status,
                signedAt: updated.signed_at,
                createdAt: updated.created_at,
            },
            message: body.status === 'SIGNED' ? 'Consent signed successfully' : 'Consent updated',
        });
    } catch (error) {
        console.error('[API] PATCH /api/doctor/consents/[consentId] - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
