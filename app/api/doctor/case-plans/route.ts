import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { CreateCasePlanDto } from '@/application/dtos/CreateCasePlanDto';
import { getCreateCasePlanUseCase } from '@/lib/use-cases';

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

        if (!body.appointmentId || !body.patientId || !body.doctorId) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // 4. Verify Doctor Ownership
        const doctorProfile = await db.doctor.findUnique({
            where: { user_id: userId },
        });

        if (!doctorProfile) {
            return NextResponse.json({ success: false, error: 'Doctor profile not found' }, { status: 404 });
        }

        // 5. Execute Use Case
        const useCase = getCreateCasePlanUseCase();
        const casePlan = await useCase.execute(body, userId);

        return NextResponse.json({
            success: true,
            data: casePlan,
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

        return NextResponse.json({ success: true, data: casePlan });

    } catch (error) {
        console.error('[API] /api/doctor/case-plans - GET Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
