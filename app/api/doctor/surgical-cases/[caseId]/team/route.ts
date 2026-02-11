/**
 * API Route: POST /api/doctor/surgical-cases/[caseId]/team
 *
 * Initialize procedure record and/or assign staff to a surgical case.
 *
 * POST with { action: 'init' } → creates SurgicalProcedureRecord if missing
 * POST with { action: 'assign', userId, role } → assigns a staff member
 * DELETE with { staffId } → removes a staff member
 *
 * Security:
 * - Requires authentication
 * - Only DOCTOR role
 * - Doctor must be primary surgeon
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { SurgicalRole, SurgicalUrgency } from '@prisma/client';

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
        const { action } = body;

        // 2. Resolve doctor
        const doctorProfile = await db.doctor.findUnique({
            where: { user_id: authResult.user.userId },
            select: { id: true },
        });
        if (!doctorProfile) {
            return NextResponse.json({ success: false, error: 'Doctor profile not found' }, { status: 404 });
        }

        // 3. Validate case + ownership
        const sc = await db.surgicalCase.findUnique({
            where: { id: caseId },
            select: {
                id: true,
                primary_surgeon_id: true,
                patient_id: true,
                diagnosis: true,
                procedure_name: true,
                urgency: true,
                case_plan: { select: { id: true } },
                procedure_record: { select: { id: true } },
            },
        });

        if (!sc) {
            return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
        }
        if (sc.primary_surgeon_id !== doctorProfile.id) {
            return NextResponse.json({ success: false, error: 'Forbidden: Not the primary surgeon' }, { status: 403 });
        }

        // ── Action: Initialize procedure record ──
        if (action === 'init') {
            if (sc.procedure_record) {
                return NextResponse.json({
                    success: true,
                    data: { procedureRecordId: sc.procedure_record.id },
                    message: 'Procedure record already exists',
                });
            }

            const record = await db.surgicalProcedureRecord.create({
                data: {
                    surgical_case_id: caseId,
                    case_plan_id: sc.case_plan?.id ?? null,
                    pre_op_diagnosis: sc.diagnosis || sc.procedure_name || 'Pending diagnosis',
                    urgency: (sc.urgency as SurgicalUrgency) || SurgicalUrgency.ELECTIVE,
                },
            });

            await db.auditLog.create({
                data: {
                    user_id: authResult.user.userId,
                    record_id: record.id.toString(),
                    action: 'CREATE',
                    model: 'SurgicalProcedureRecord',
                    details: `Procedure record initialized for case ${caseId}`,
                },
            });

            return NextResponse.json({
                success: true,
                data: { procedureRecordId: record.id },
                message: 'Procedure record created',
            });
        }

        // ── Action: Assign staff ──
        if (action === 'assign') {
            const { userId, role } = body as { userId?: string; role?: string };

            if (!userId || !role) {
                return NextResponse.json({ success: false, error: 'userId and role are required' }, { status: 400 });
            }

            // Validate role enum
            const validRoles = Object.values(SurgicalRole);
            if (!validRoles.includes(role as SurgicalRole)) {
                return NextResponse.json(
                    { success: false, error: `Invalid role. Valid: ${validRoles.join(', ')}` },
                    { status: 400 },
                );
            }

            // Ensure procedure record exists
            let procedureRecordId = sc.procedure_record?.id;
            if (!procedureRecordId) {
                const record = await db.surgicalProcedureRecord.create({
                    data: {
                        surgical_case_id: caseId,
                        case_plan_id: sc.case_plan?.id ?? null,
                        pre_op_diagnosis: sc.diagnosis || sc.procedure_name || 'Pending diagnosis',
                        urgency: (sc.urgency as SurgicalUrgency) || SurgicalUrgency.ELECTIVE,
                    },
                });
                procedureRecordId = record.id;
            }

            // Verify user exists
            const targetUser = await db.user.findUnique({
                where: { id: userId },
                select: { id: true, first_name: true, last_name: true, role: true },
            });
            if (!targetUser) {
                return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
            }

            // Check for duplicate assignment (same user + same role)
            const existing = await db.surgicalStaff.findFirst({
                where: {
                    procedure_record_id: procedureRecordId,
                    user_id: userId,
                    role: role as SurgicalRole,
                },
            });
            if (existing) {
                return NextResponse.json({ success: false, error: 'This user is already assigned with this role' }, { status: 409 });
            }

            const staff = await db.surgicalStaff.create({
                data: {
                    procedure_record_id: procedureRecordId,
                    user_id: userId,
                    role: role as SurgicalRole,
                },
                include: {
                    user: { select: { id: true, first_name: true, last_name: true, role: true } },
                },
            });

            await db.auditLog.create({
                data: {
                    user_id: authResult.user.userId,
                    record_id: staff.id.toString(),
                    action: 'CREATE',
                    model: 'SurgicalStaff',
                    details: `Staff ${targetUser.first_name} ${targetUser.last_name} assigned as ${role} to case ${caseId}`,
                },
            });

            return NextResponse.json({
                success: true,
                data: {
                    id: staff.id,
                    role: staff.role,
                    user: {
                        id: staff.user.id,
                        firstName: staff.user.first_name,
                        lastName: staff.user.last_name,
                        role: staff.user.role,
                    },
                },
                message: 'Staff assigned successfully',
            });
        }

        // ── Action: Remove staff ──
        if (action === 'remove') {
            const { staffId } = body as { staffId?: number };
            if (!staffId) {
                return NextResponse.json({ success: false, error: 'staffId is required' }, { status: 400 });
            }

            // Verify the staff record belongs to this case
            const staffRecord = await db.surgicalStaff.findUnique({
                where: { id: staffId },
                include: {
                    procedure_record: { select: { surgical_case_id: true } },
                },
            });

            if (!staffRecord || staffRecord.procedure_record?.surgical_case_id !== caseId) {
                return NextResponse.json({ success: false, error: 'Staff record not found for this case' }, { status: 404 });
            }

            await db.surgicalStaff.delete({ where: { id: staffId } });

            await db.auditLog.create({
                data: {
                    user_id: authResult.user.userId,
                    record_id: staffId.toString(),
                    action: 'DELETE',
                    model: 'SurgicalStaff',
                    details: `Staff removed from case ${caseId}`,
                },
            });

            return NextResponse.json({ success: true, message: 'Staff removed successfully' });
        }

        return NextResponse.json({ success: false, error: 'Invalid action. Use: init, assign, remove' }, { status: 400 });
    } catch (error) {
        console.error('[API] POST /api/doctor/surgical-cases/[caseId]/team - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
