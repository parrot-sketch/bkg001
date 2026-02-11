/**
 * API Route: POST /api/doctor/surgical-cases/[caseId]/consents
 *
 * Creates a consent form for a surgical case.
 *
 * Security:
 * - Requires authentication
 * - Only DOCTOR role
 * - Doctor must be primary surgeon
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { ConsentStatus, ConsentType } from '@prisma/client';

// ─── Consent Template System (MVP) ─────────────────────────────────────

interface ConsentTemplate {
    type: ConsentType;
    defaultTitle: string;
    contentTemplate: (fields: { patientName: string; procedureName: string; doctorName: string; date: string }) => string;
}

const CONSENT_TEMPLATES: Record<string, ConsentTemplate> = {
    GENERAL_PROCEDURE: {
        type: ConsentType.GENERAL_PROCEDURE,
        defaultTitle: 'Informed Consent for Surgical Procedure',
        contentTemplate: ({ patientName, procedureName, doctorName, date }) => `
# Informed Consent for Surgical Procedure

**Patient Name:** ${patientName}
**Procedure:** ${procedureName}
**Surgeon:** ${doctorName}
**Date:** ${date}

## Consent Statement

I, **${patientName}**, hereby consent to the performance of the following procedure: **${procedureName}**.

I have been informed about:
- The nature and purpose of the procedure
- The expected benefits and possible risks
- Alternative treatment options
- The risks of not having the procedure

I understand that no guarantee has been made regarding the results of the procedure.

I authorize the surgeon and their assistants to perform additional procedures deemed necessary during the surgery.

## Patient Acknowledgment

By signing below, I confirm that:
1. I have read and understood this consent form
2. My questions have been answered satisfactorily
3. I consent voluntarily to the procedure described above

---

**Patient Signature:** ___________________________

**Date:** ___________________________

**Witness:** ___________________________
`.trim(),
    },

    ANESTHESIA: {
        type: ConsentType.ANESTHESIA,
        defaultTitle: 'Consent for Anesthesia',
        contentTemplate: ({ patientName, procedureName, date }) => `
# Consent for Anesthesia

**Patient Name:** ${patientName}
**Procedure:** ${procedureName}
**Date:** ${date}

## Anesthesia Consent

I consent to the administration of anesthesia as determined by the anesthesiologist/anesthetist for the above procedure.

I have been informed about:
- The type of anesthesia planned
- Risks including allergic reactions, nerve damage, and other complications
- Alternative anesthesia options

I confirm I have disclosed all relevant medical history, medications, and allergies.

---

**Patient Signature:** ___________________________

**Date:** ___________________________
`.trim(),
    },

    PHOTOGRAPHY: {
        type: ConsentType.PHOTOGRAPHY,
        defaultTitle: 'Consent for Clinical Photography',
        contentTemplate: ({ patientName, procedureName, date }) => `
# Consent for Clinical Photography

**Patient Name:** ${patientName}
**Procedure:** ${procedureName}
**Date:** ${date}

## Photography Consent

I consent to clinical photographs being taken before, during, and after my procedure for:
- Medical records and documentation
- Treatment planning and evaluation

### Marketing Consent (Optional)
☐ I additionally consent to the use of my photographs for educational and marketing purposes. I understand these images will be anonymized.

---

**Patient Signature:** ___________________________

**Date:** ___________________________
`.trim(),
    },

    SPECIAL_PROCEDURE: {
        type: ConsentType.SPECIAL_PROCEDURE,
        defaultTitle: 'Special Procedure Consent',
        contentTemplate: ({ patientName, procedureName, doctorName, date }) => `
# Consent for Special Procedure

**Patient Name:** ${patientName}
**Procedure:** ${procedureName}
**Surgeon:** ${doctorName}
**Date:** ${date}

## Special Consent

This consent covers specific aspects of the planned procedure that require separate informed consent.

Details to be completed by the surgeon.

---

**Patient Signature:** ___________________________

**Date:** ___________________________
`.trim(),
    },

    BLOOD_TRANSFUSION: {
        type: ConsentType.BLOOD_TRANSFUSION,
        defaultTitle: 'Consent for Blood Transfusion',
        contentTemplate: ({ patientName, date }) => `
# Consent for Blood Transfusion

**Patient Name:** ${patientName}
**Date:** ${date}

## Transfusion Consent

I consent to receiving blood or blood products if deemed medically necessary during or after my procedure.

I have been informed about the risks including allergic reactions, infections, and transfusion reactions.

---

**Patient Signature:** ___________________________

**Date:** ___________________________
`.trim(),
    },
};

// ─── Route Handler ──────────────────────────────────────────────────────

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
        const { type, title } = body as { type?: string; title?: string };

        if (!type) {
            return NextResponse.json({ success: false, error: 'Consent type is required' }, { status: 400 });
        }

        // Validate type
        if (!Object.values(ConsentType).includes(type as ConsentType)) {
            return NextResponse.json(
                { success: false, error: `Invalid consent type. Valid: ${Object.values(ConsentType).join(', ')}` },
                { status: 400 },
            );
        }

        // 2. Resolve doctor
        const doctorProfile = await db.doctor.findUnique({
            where: { user_id: authResult.user.userId },
            select: { id: true, name: true },
        });
        if (!doctorProfile) {
            return NextResponse.json({ success: false, error: 'Doctor profile not found' }, { status: 404 });
        }

        // 3. Validate surgical case + ownership + get case plan
        const sc = await db.surgicalCase.findUnique({
            where: { id: caseId },
            select: {
                id: true,
                primary_surgeon_id: true,
                procedure_name: true,
                patient: { select: { first_name: true, last_name: true } },
                case_plan: { select: { id: true } },
            },
        });

        if (!sc) {
            return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
        }
        if (sc.primary_surgeon_id !== doctorProfile.id) {
            return NextResponse.json({ success: false, error: 'Forbidden: You are not the primary surgeon' }, { status: 403 });
        }
        if (!sc.case_plan) {
            return NextResponse.json(
                { success: false, error: 'No case plan exists. Save the clinical plan first.' },
                { status: 422 },
            );
        }

        // 4. Idempotency: prevent duplicate active consent of same type
        const existingConsent = await db.consentForm.findFirst({
            where: {
                case_plan_id: sc.case_plan.id,
                type: type as ConsentType,
                status: { not: ConsentStatus.REVOKED },
            },
            select: { id: true, status: true },
        });

        if (existingConsent) {
            return NextResponse.json(
                {
                    success: false,
                    error: `A ${type.replace(/_/g, ' ').toLowerCase()} consent already exists (status: ${existingConsent.status}). Revoke it before creating a new one.`,
                },
                { status: 409 },
            );
        }

        // 5. Generate content from template
        const template = CONSENT_TEMPLATES[type] ?? CONSENT_TEMPLATES.GENERAL_PROCEDURE;
        const patientName = sc.patient ? `${sc.patient.first_name} ${sc.patient.last_name}` : 'Patient';
        const contentSnapshot = template.contentTemplate({
            patientName,
            procedureName: sc.procedure_name ?? 'Surgical Procedure',
            doctorName: doctorProfile.name,
            date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        });

        // 6. Create consent form
        const consent = await db.consentForm.create({
            data: {
                case_plan_id: sc.case_plan.id,
                title: title || template.defaultTitle,
                type: type as ConsentType,
                content_snapshot: contentSnapshot,
                status: ConsentStatus.PENDING_SIGNATURE,
                version: 1,
            },
        });

        // 7. Audit
        await db.auditLog.create({
            data: {
                user_id: authResult.user.userId,
                record_id: consent.id,
                action: 'CREATE',
                model: 'ConsentForm',
                details: `Consent form "${consent.title}" created for case ${caseId}`,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: consent.id,
                title: consent.title,
                type: consent.type,
                status: consent.status,
                createdAt: consent.created_at,
            },
            message: 'Consent form created',
        });
    } catch (error) {
        console.error('[API] POST /api/doctor/surgical-cases/[caseId]/consents - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
