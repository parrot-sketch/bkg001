import { NextRequest, NextResponse } from 'next/server';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { PrismaPatientRepository } from '@/infrastructure/database/repositories/PrismaPatientRepository';
import { PrismaAvailabilityRepository } from '@/infrastructure/database/repositories/PrismaAvailabilityRepository';
import { emailNotificationService } from '@/infrastructure/services/EmailNotificationService';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import { SystemTimeService } from '@/infrastructure/services/SystemTimeService';
import { ValidateAppointmentAvailabilityUseCase } from '@/application/use-cases/ValidateAppointmentAvailabilityUseCase';
import { RescheduleAppointmentUseCase } from '@/application/use-cases/RescheduleAppointmentUseCase';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { DomainException } from '@/domain/exceptions/DomainException';

// Initialize dependencies
const appointmentRepository = new PrismaAppointmentRepository(db);
const patientRepository = new PrismaPatientRepository(db);
const availabilityRepository = new PrismaAvailabilityRepository(db);
const notificationService = emailNotificationService;
const auditService = new ConsoleAuditService();
const timeService = new SystemTimeService();

// Initialize use cases
const validateAvailabilityUseCase = new ValidateAppointmentAvailabilityUseCase(
    availabilityRepository,
    appointmentRepository,
    db
);

const rescheduleAppointmentUseCase = new RescheduleAppointmentUseCase(
    appointmentRepository,
    patientRepository,
    notificationService,
    auditService,
    timeService,
    validateAvailabilityUseCase
);

/**
 * POST /api/appointments/[id]/reschedule
 */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
    try {
        const { id } = await props.params;
        const appointmentId = parseInt(id, 10);

        if (isNaN(appointmentId)) {
            return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
        }

        // Authenticate
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, role } = authResult.user;

        // Only doctors (and admins/frontdesk) can reschedule using this endpoint
        // Ideally user checking is inside use case or here
        if (role === 'PATIENT') {
            return NextResponse.json({ success: false, error: 'Patients cannot use this endpoint' }, { status: 403 });
        }

        // Parse body
        const body = await request.json();
        if (!body.newDate || !body.newTime) {
            return NextResponse.json({ success: false, error: 'newDate and newTime are required' }, { status: 400 });
        }

        const result = await rescheduleAppointmentUseCase.execute({
            appointmentId,
            newDate: body.newDate,
            newTime: body.newTime,
            reason: body.reason,
        }, userId);

        return NextResponse.json({
            success: true,
            data: result,
            message: 'Appointment rescheduled successfully'
        });

    } catch (error) {
        if (error instanceof DomainException) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }
        console.error('Reschedule error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
