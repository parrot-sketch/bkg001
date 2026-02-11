/**
 * API Route: POST /api/doctor/surgical-cases/[caseId]/photos
 *
 * Adds a patient image to a surgical case's plan.
 *
 * MVP: Accepts an image URL (assumes file upload is handled separately
 * via a dedicated upload service or direct-to-S3 flow).
 *
 * Security:
 * - Requires authentication
 * - Only DOCTOR role
 * - Doctor must be primary surgeon
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { ImageAngle, ImageTimepoint } from '@prisma/client';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> },
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

        const { caseId } = await context.params;
        const body = await request.json();
        const { imageUrl, angle, timepoint, description, consentForMarketing } = body;

        if (!imageUrl) {
            return NextResponse.json({ success: false, error: 'imageUrl is required' }, { status: 400 });
        }

        // Validate angle enum
        const validAngles = Object.values(ImageAngle);
        if (angle && !validAngles.includes(angle)) {
            return NextResponse.json(
                { success: false, error: `Invalid angle. Valid: ${validAngles.join(', ')}` },
                { status: 400 },
            );
        }

        // Validate timepoint enum
        const validTimepoints = Object.values(ImageTimepoint);
        const resolvedTimepoint = timepoint && validTimepoints.includes(timepoint) ? timepoint : ImageTimepoint.PRE_OP;

        // 2. Resolve doctor
        const doctorProfile = await db.doctor.findUnique({
            where: { user_id: authResult.user.userId },
            select: { id: true },
        });
        if (!doctorProfile) {
            return NextResponse.json({ success: false, error: 'Doctor profile not found' }, { status: 404 });
        }

        // 3. Validate case + ownership + get plan
        const sc = await db.surgicalCase.findUnique({
            where: { id: caseId },
            select: {
                id: true,
                primary_surgeon_id: true,
                patient_id: true,
                case_plan: { select: { id: true, appointment_id: true } },
            },
        });

        if (!sc) {
            return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
        }
        if (sc.primary_surgeon_id !== doctorProfile.id) {
            return NextResponse.json({ success: false, error: 'Forbidden: Not the primary surgeon' }, { status: 403 });
        }
        if (!sc.case_plan) {
            return NextResponse.json(
                { success: false, error: 'No case plan exists. Save the clinical plan first.' },
                { status: 422 },
            );
        }

        // 4. Create patient image
        const image = await db.patientImage.create({
            data: {
                patient_id: sc.patient_id,
                appointment_id: sc.case_plan.appointment_id ?? null,
                case_plan_id: sc.case_plan.id,
                image_url: imageUrl,
                angle: angle || ImageAngle.FRONT,
                timepoint: resolvedTimepoint,
                description: description || null,
                consent_for_marketing: consentForMarketing ?? false,
                taken_by: authResult.user.userId,
                taken_at: new Date(),
            },
        });

        // 5. Audit
        await db.auditLog.create({
            data: {
                user_id: authResult.user.userId,
                record_id: image.id.toString(),
                action: 'CREATE',
                model: 'PatientImage',
                details: `Pre-op photo added for case ${caseId}. Angle: ${image.angle}, Timepoint: ${image.timepoint}`,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: image.id,
                imageUrl: image.image_url,
                angle: image.angle,
                timepoint: image.timepoint,
                description: image.description,
                consentForMarketing: image.consent_for_marketing,
                takenAt: image.taken_at,
            },
            message: 'Photo added successfully',
        });
    } catch (error) {
        console.error('[API] POST /api/doctor/surgical-cases/[caseId]/photos - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
