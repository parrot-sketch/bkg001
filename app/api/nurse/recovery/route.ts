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
import db from '@/lib/db';
import { SurgicalCaseStatus } from '@prisma/client';

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        if (authResult.user.role !== Role.NURSE) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
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
