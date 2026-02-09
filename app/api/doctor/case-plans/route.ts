import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { CreateCasePlanDto } from '@/application/dtos/CreateCasePlanDto';
import { getCreateCasePlanUseCase } from '@/lib/use-cases';

/**
 * Maps a raw Prisma CasePlan (snake_case) to the client-expected DTO (camelCase).
 */
function mapCasePlanToDto(casePlan: any) {
    return {
        id: casePlan.id,
        appointmentId: casePlan.appointment_id,
        patientId: casePlan.patient_id,
        doctorId: casePlan.doctor_id,
        surgicalCaseId: casePlan.surgical_case_id ?? null,
        procedurePlan: casePlan.procedure_plan ?? null,
        riskFactors: casePlan.risk_factors ?? null,
        preOpNotes: casePlan.pre_op_notes ?? null,
        implantDetails: casePlan.implant_details ?? null,
        anesthesiaPlan: casePlan.planned_anesthesia ?? null,
        specialInstructions: casePlan.special_instructions ?? null,
        markingDiagram: casePlan.marking_diagram ?? null,
        readinessStatus: casePlan.readiness_status,
        readyForSurgery: casePlan.ready_for_surgery,
        createdAt: casePlan.created_at,
        updatedAt: casePlan.updated_at,
        consents: casePlan.consents?.map((c: any) => ({
            id: c.id,
            title: c.title,
            type: c.type,
            status: c.status,
            createdAt: c.created_at,
        })),
        images: casePlan.images?.map((img: any) => ({
            id: img.id,
            imageUrl: img.image_url,
            timepoint: img.timepoint,
            description: img.description,
        })),
        surgicalCase: casePlan.surgical_case
            ? {
                id: casePlan.surgical_case.id,
                status: casePlan.surgical_case.status,
                urgency: casePlan.surgical_case.urgency,
            }
            : undefined,
        procedure_record: casePlan.procedure_record
            ? {
                urgency: casePlan.procedure_record.urgency,
                anesthesia_type: casePlan.procedure_record.anesthesia_type,
                staff: casePlan.procedure_record.staff?.map((s: any) => ({
                    role: s.role,
                    user: s.user
                        ? {
                            firstName: s.user.first_name,
                            lastName: s.user.last_name,
                            role: s.user.role,
                        }
                        : undefined,
                })),
            }
            : undefined,
    };
}

/**
 * POST /api/doctor/case-plans
 * 
 * Create or update a Case Plan for an appointment.
 * Restricted to Doctors.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // 1. Authenticate request
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const { role, userId } = authResult.user;

        // 2. Authorization (Doctor only)
        if (role !== 'DOCTOR') {
            return NextResponse.json({ success: false, error: 'Unauthorized: Doctors only' }, { status: 403 });
        }

        // 3. Parse and Validate Body
        const body: CreateCasePlanDto = await request.json();

        if (!body.appointmentId || !body.patientId) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // 4. Resolve Doctor profile from authenticated user
        const doctorProfile = await db.doctor.findUnique({
            where: { user_id: userId },
        });

        if (!doctorProfile) {
            return NextResponse.json({ success: false, error: 'Doctor profile not found' }, { status: 404 });
        }

        // 5. Override doctorId with the resolved doctor profile ID (not user ID)
        const dto: CreateCasePlanDto = {
            ...body,
            doctorId: doctorProfile.id,
        };

        // 6. Execute Use Case
        const useCase = getCreateCasePlanUseCase();
        const casePlan = await useCase.execute(dto, userId);

        return NextResponse.json({
            success: true,
            data: mapCasePlanToDto(casePlan),
            message: 'Case plan saved successfully',
        });

    } catch (error) {
        console.error('[API] /api/doctor/case-plans - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * GET /api/doctor/case-plans
 * 
 * Get Case Plan by Appointment ID.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const appointmentId = searchParams.get('appointmentId');

        if (!appointmentId) {
            return NextResponse.json({ success: false, error: 'Appointment ID required' }, { status: 400 });
        }

        const casePlan = await db.casePlan.findUnique({
            where: {
                appointment_id: parseInt(appointmentId),
            },
            include: {
                surgical_case: {
                    select: {
                        id: true,
                        status: true,
                        urgency: true,
                    },
                },
                procedure_record: {
                    include: {
                        staff: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        first_name: true,
                                        last_name: true,
                                        role: true
                                    }
                                }
                            }
                        }
                    }
                },
                consents: {
                    orderBy: { created_at: 'desc' }
                },
                images: {
                    where: { timepoint: 'PRE_OP' },
                    orderBy: { taken_at: 'desc' }
                }
            }
        });

        if (!casePlan) {
            return NextResponse.json({ success: true, data: null }); // No plan yet
        }

        // Map snake_case Prisma data to camelCase DTO
        return NextResponse.json({ success: true, data: mapCasePlanToDto(casePlan) });

    } catch (error) {
        console.error('[API] /api/doctor/case-plans - GET Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
