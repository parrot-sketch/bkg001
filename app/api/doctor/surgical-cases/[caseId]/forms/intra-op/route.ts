/**
 * API Route: Doctor Intra-Operative Record
 * 
 * GET /api/doctor/surgical-cases/[caseId]/forms/intra-op
 * PUT /api/doctor/surgical-cases/[caseId]/forms/intra-op
 * POST /api/doctor/surgical-cases/[caseId]/forms/intra-op (finalize)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { ClinicalFormStatus } from '@prisma/client';

const TEMPLATE_KEY = 'DOCTOR_INTRA_OP';
const TEMPLATE_VERSION = 1;

async function getOrCreateTemplate(): Promise<number> {
    let template = await db.clinicalFormTemplate.findUnique({
        where: { key_version: { key: TEMPLATE_KEY, version: TEMPLATE_VERSION } }
    });

    if (!template) {
        template = await db.clinicalFormTemplate.create({
            data: {
                key: TEMPLATE_KEY,
                version: TEMPLATE_VERSION,
                title: 'Doctor Intra-Operative Record',
                role_owner: Role.DOCTOR,
                schema_json: '{}',
                ui_json: '{}',
                is_active: true,
            }
        });
    }

    return template.id;
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> }
) {
    try {
        const { caseId } = await context.params;
        const authResult = await JwtMiddleware.authenticate(request);
        
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const allowedRoles = [Role.DOCTOR, Role.NURSE, Role.ADMIN];
        if (!allowedRoles.includes(authResult.user.role as Role)) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }

        // Get surgical case
        const surgicalCase = await db.surgicalCase.findUnique({
            where: { id: caseId },
            include: {
                patient: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        file_number: true,
                        allergies: true,
                        date_of_birth: true,
                        gender: true,
                    }
                },
                primary_surgeon: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                    }
                },
            }
        });

        if (!surgicalCase) {
            return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
        }

        // Get or create form response
        const existingForm = await db.clinicalFormResponse.findFirst({
            where: {
                surgical_case_id: caseId,
                template_key: TEMPLATE_KEY,
            }
        });

        if (existingForm) {
            let parsedData = {};
            try {
                parsedData = existingForm.data_json ? JSON.parse(existingForm.data_json) : {};
            } catch (e) {
                console.error('Failed to parse data_json:', e);
            }

            return NextResponse.json({
                success: true,
                data: {
                    id: existingForm.id,
                    status: existingForm.status,
                    data: parsedData,
                    createdAt: existingForm.created_at,
                    updatedAt: existingForm.updated_at,
                    isFinalized: existingForm.status === ClinicalFormStatus.FINAL,
                    signedBy: existingForm.signed_by_user_id,
                    signedAt: existingForm.signed_at,
                }
            });
        }

        // Create new draft
        const templateId = await getOrCreateTemplate();
        const newForm = await db.clinicalFormResponse.create({
            data: {
                template_id: templateId,
                template_key: TEMPLATE_KEY,
                template_version: TEMPLATE_VERSION,
                surgical_case_id: caseId,
                patient_id: surgicalCase.patient_id,
                status: ClinicalFormStatus.DRAFT,
                data_json: JSON.stringify({}),
                created_by_user_id: authResult.user.userId,
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                id: newForm.id,
                status: newForm.status,
                data: newForm.data_json,
                createdAt: newForm.created_at,
                updatedAt: newForm.updated_at,
                isFinalized: false,
            }
        });
    } catch (error) {
        console.error('[API] GET doctor intra-op error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> }
) {
    try {
        const { caseId } = await context.params;
        const authResult = await JwtMiddleware.authenticate(request);
        
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        if (authResult.user.role !== Role.DOCTOR) {
            return NextResponse.json({ success: false, error: 'Only doctors can update this record' }, { status: 403 });
        }

        const body = await request.json();

        // Find existing form
        const existingForm = await db.clinicalFormResponse.findFirst({
            where: {
                surgical_case_id: caseId,
                template_key: TEMPLATE_KEY,
            }
        });

        if (!existingForm) {
            // Get patient_id from case
            const surgicalCase = await db.surgicalCase.findUnique({
                where: { id: caseId },
                select: { patient_id: true }
            });

            if (!surgicalCase) {
                return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
            }

            // Create new
            const templateId = await getOrCreateTemplate();
            const newForm = await db.clinicalFormResponse.create({
                data: {
                    template_id: templateId,
                    template_key: TEMPLATE_KEY,
                    template_version: TEMPLATE_VERSION,
                    surgical_case_id: caseId,
                    patient_id: surgicalCase.patient_id,
                    status: ClinicalFormStatus.DRAFT,
                    data_json: JSON.stringify(body),
                    created_by_user_id: authResult.user.userId,
                }
            });

            return NextResponse.json({
                success: true,
                data: {
                    id: newForm.id,
                    status: newForm.status,
                }
            });
        }

        // Check if already finalized
        if (existingForm.status === ClinicalFormStatus.FINAL) {
            return NextResponse.json({ success: false, error: 'Cannot update finalized record' }, { status: 400 });
        }

        // Update existing
        const updatedForm = await db.clinicalFormResponse.update({
            where: { id: existingForm.id },
            data: {
                data_json: body as any,
                updated_by_user_id: authResult.user.userId,
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                id: updatedForm.id,
                status: updatedForm.status,
            }
        });
    } catch (error) {
        console.error('[API] PUT doctor intra-op error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> }
) {
    try {
        const { caseId } = await context.params;
        const authResult = await JwtMiddleware.authenticate(request);
        
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        if (authResult.user.role !== Role.DOCTOR) {
            return NextResponse.json({ success: false, error: 'Only doctors can finalize this record' }, { status: 403 });
        }

        const body = await request.json();
        const { signature } = body;

        if (!signature) {
            return NextResponse.json({ success: false, error: 'Signature is required' }, { status: 400 });
        }

        const existingForm = await db.clinicalFormResponse.findFirst({
            where: {
                surgical_case_id: caseId,
                template_key: TEMPLATE_KEY,
            }
        });

        if (!existingForm) {
            return NextResponse.json({ success: false, error: 'Form not found' }, { status: 404 });
        }

        if (existingForm.status === ClinicalFormStatus.FINAL) {
            return NextResponse.json({ success: false, error: 'Form already finalized' }, { status: 400 });
        }

        const finalizedForm = await db.clinicalFormResponse.update({
            where: { id: existingForm.id },
            data: {
                status: ClinicalFormStatus.FINAL,
                signed_by_user_id: authResult.user.userId,
                signed_at: new Date(),
                updated_by_user_id: authResult.user.userId,
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                id: finalizedForm.id,
                status: finalizedForm.status,
                signedAt: finalizedForm.signed_at,
            }
        });
    } catch (error) {
        console.error('[API] POST doctor intra-op error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
