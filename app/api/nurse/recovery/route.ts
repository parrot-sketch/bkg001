/**
 * API Route: GET /api/nurse/recovery
 *
 * Nurse Recovery / PACU Dashboard endpoint.
 *
 * Returns surgical cases currently in recovery.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { authorizeApiRequest } from '@/lib/auth/require-role';
import db from '@/lib/db';
import { SurgicalCaseStatus } from '@prisma/client';
import { INTRAOP_TEMPLATE_KEY, INTRAOP_TEMPLATE_VERSION } from '@/domain/clinical-forms/NurseIntraOpRecord';

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authorizeApiRequest(authResult, [Role.NURSE, Role.ADMIN])) {
            return !authResult.user
                ? NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
                : NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }

        // Default to RECOVERY
        const statusWhere = {
            status: SurgicalCaseStatus.RECOVERY,
        };

        const surgicalCases = await db.surgicalCase.findMany({
            where: statusWhere,
            orderBy: [{ updated_at: 'desc' }],
            include: {
                patient: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        file_number: true,
                        date_of_birth: true,
                    },
                },
                primary_surgeon: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                // We might want to include recovery record status here if needed
            },
        });

        const caseIds = surgicalCases.map((c) => c.id);
        const intraOpForms = caseIds.length
            ? await db.clinicalFormResponse.findMany({
                where: {
                    surgical_case_id: { in: caseIds },
                    template_key: INTRAOP_TEMPLATE_KEY,
                    template_version: INTRAOP_TEMPLATE_VERSION,
                },
                select: { surgical_case_id: true, status: true },
            })
            : [];

        const intraOpByCaseId = new Map<string, { status: string }>();
        for (const f of intraOpForms) intraOpByCaseId.set(f.surgical_case_id, { status: f.status });

        const cases = surgicalCases.map((c) => ({
            id: c.id,
            status: c.status,
            urgency: c.urgency,
            procedureName: c.procedure_name,
            patient: c.patient
                ? {
                    id: c.patient.id,
                    fullName: `${c.patient.first_name} ${c.patient.last_name}`,
                    fileNumber: c.patient.file_number,
                    dateOfBirth: c.patient.date_of_birth,
                }
                : null,
            primarySurgeon: c.primary_surgeon
                ? { id: c.primary_surgeon.id, name: c.primary_surgeon.name }
                : null,
            hasIntraOpRecord: intraOpByCaseId.has(c.id),
            intraOpRecordStatus: intraOpByCaseId.get(c.id)?.status,
        }));

        return NextResponse.json({
            success: true,
            data: {
                cases,
                summary: {
                    total: cases.length,
                },
            },
        });
    } catch (error) {
        console.error('[API] /api/nurse/recovery - Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
