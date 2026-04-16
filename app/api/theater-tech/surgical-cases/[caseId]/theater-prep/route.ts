/**
 * API Route: GET/PUT /api/theater-tech/surgical-cases/[caseId]/theater-prep
 * 
 * Theater Tech prepares cases by adding:
 * - Team members (surgeon, anaesthesiologist, assistants, nurses)
 * - Planned items from inventory
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const { caseId } = await context.params;

        const surgicalCase = await db.surgicalCase.findUnique({
            where: { id: caseId },
            include: {
                patient: { select: { first_name: true, last_name: true, file_number: true } },
                primary_surgeon: { select: { name: true, title: true } },
                case_plan: {
                    include: {
                        planned_items: {
                            include: { inventory_item: true, service: true },
                        },
                    },
                },
                team_members: true,
            },
        });

        if (!surgicalCase) {
            return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                case: {
                    id: surgicalCase.id,
                    status: surgicalCase.status,
                    procedureName: surgicalCase.procedure_name,
                    patient: surgicalCase.patient,
                    surgeon: surgicalCase.primary_surgeon,
                },
                teamMembers: surgicalCase.team_members,
                plannedItems: surgicalCase.case_plan?.planned_items || [],
                isReadyForTheaterBooking: surgicalCase.status === 'READY_FOR_THEATER_BOOKING',
                isEditable: surgicalCase.status !== 'COMPLETED' && surgicalCase.status !== 'CANCELLED',
            },
        });

    } catch (error) {
        console.error('[API] GET theater-prep - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        if (authResult.user.role !== Role.THEATER_TECHNICIAN && authResult.user.role !== Role.ADMIN) {
            return NextResponse.json({ success: false, error: 'Forbidden: Theater Tech only' }, { status: 403 });
        }

        const { caseId } = await context.params;
        const body = await request.json();
        
        const { teamMembers, action } = body;

        const surgicalCase = await db.surgicalCase.findUnique({
            where: { id: caseId },
            select: { id: true, status: true, patient_id: true },
        });

        if (!surgicalCase) {
            return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
        }

        // Allow theater tech to edit cases in any status (including WARD_PREP)
        // This ensures theater tech can always modify the case even after nurse pre-op
        if (surgicalCase.status === 'COMPLETED' || surgicalCase.status === 'CANCELLED') {
            return NextResponse.json(
                { success: false, error: `Cannot modify theater prep for case in status: ${surgicalCase.status}` },
                { status: 422 }
            );
        }

        // Update team members if provided
        if (teamMembers && Array.isArray(teamMembers)) {
            for (const member of teamMembers) {
                if (member.name) {
                    await db.surgicalCaseTeamMember.upsert({
                        where: {
                            id: member.id || 'new-' + Math.random().toString(36),
                        },
                        create: {
                            surgical_case_id: caseId,
                            role: member.role,
                            name: member.name,
                            user_id: member.userId || null,
                        },
                        update: {
                            name: member.name,
                            user_id: member.userId || null,
                        },
                    });
                }
            }
        }

        // If action is "complete", transition to the booking-ready state and notify downstream teams
        if (action === 'complete') {
            // Transition to READY_FOR_THEATER_BOOKING
            await db.surgicalCase.update({
                where: { id: caseId },
                data: { status: 'READY_FOR_THEATER_BOOKING' },
            });

            // Notify Nurse for pre-op
            const patient = await db.patient.findUnique({
                where: { id: surgicalCase.patient_id },
                select: { first_name: true, last_name: true },
            });

            const nurseUsers = await db.user.findMany({
                where: { role: Role.NURSE },
                select: { id: true },
            });

            for (const nurse of nurseUsers) {
                await db.notification.create({
                    data: {
                        user_id: nurse.id,
                        type: 'IN_APP',
                        status: 'PENDING',
                        subject: 'Pre-Op Checklist Required',
                        message: `Case for ${patient?.first_name} ${patient?.last_name} is ready for pre-op preparation.`,
                        metadata: JSON.stringify({
                            event: 'PREOP_CHECKLIST_REQUIRED',
                            surgicalCaseId: caseId,
                            navigateTo: '/nurse/ward-prep',
                        }),
                    },
                });
            }

            // Notify Admin (oversight) — scheduling is handled by theater tech
            const adminUsers = await db.user.findMany({
                where: { role: Role.ADMIN },
                select: { id: true },
            });

            for (const admin of adminUsers) {
                await db.notification.create({
                    data: {
                        user_id: admin.id,
                        type: 'IN_APP',
                        status: 'PENDING',
                        subject: 'Case Ready for Theater Booking',
                        message: `Case for ${patient?.first_name} ${patient?.last_name} is ready for theater booking. Scheduling is handled by Theater Tech.`,
                        metadata: JSON.stringify({
                            event: 'CASE_READY_FOR_THEATER_BOOKING',
                            surgicalCaseId: caseId,
                            navigateTo: '/theater-tech/theater-scheduling',
                        }),
                    },
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: action === 'complete' ? 'Case marked ready for theater booking' : 'Team members updated',
        });

    } catch (error) {
        console.error('[API] PUT theater-prep - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
