import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

const prisma = db;

/**
 * GET /api/frontdesk/schedule/today
 * 
 * Get all appointments for today, optionally filtered by doctor
 */
export async function GET(request: NextRequest) {
    try {
        // Verify authentication
        const authResult = await authenticateRequest(request);
        if (!authResult.success) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const doctorId = searchParams.get('doctorId');

        // Get today's date range (start to end of day)
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        // Build query filters
        const whereClause: any = {
            appointment_date: {
                gte: startOfDay,
                lte: endOfDay,
            },
        };

        if (doctorId) {
            whereClause.doctor_id = doctorId;
        }

        const appointments = await prisma.appointment.findMany({
            where: whereClause,
            include: {
                patient: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        img: true,
                        file_number: true,
                        phone: true,
                        email: true,
                    }
                },
                doctor: {
                    select: {
                        id: true,
                        name: true,
                        first_name: true,
                        last_name: true,
                        specialization: true,
                    }
                },
            },
            orderBy: {
                time: 'asc',
            },
        });

        // Transform to DTO
        const data = appointments.map(apt => ({
            id: apt.id,
            patientId: apt.patient_id,
            doctorId: apt.doctor_id,
            appointmentDate: apt.appointment_date,
            time: apt.time,
            status: apt.status,
            type: apt.type,
            note: apt.note,
            reason: apt.reason,
            checkedInAt: apt.checked_in_at,
            checkedInBy: apt.checked_in_by,
            consultationStartedAt: apt.consultation_started_at,
            consultationEndedAt: apt.consultation_ended_at,
            consultationDuration: apt.consultation_duration,
            createdAt: apt.created_at,
            updatedAt: apt.updated_at,
            patient: apt.patient ? {
                id: apt.patient.id,
                firstName: apt.patient.first_name,
                lastName: apt.patient.last_name,
                img: apt.patient.img,
                phone: apt.patient.phone,
                email: apt.patient.email,
                fileNumber: apt.patient.file_number || undefined,
            } : undefined,
            doctor: apt.doctor ? {
                id: apt.doctor.id,
                name: apt.doctor.name || `${apt.doctor.first_name} ${apt.doctor.last_name}`,
                specialization: apt.doctor.specialization || undefined,
            } : undefined,
        }));

        return NextResponse.json({
            success: true,
            data: data,
        });
    } catch (error) {
        console.error('Error fetching today schedule:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch schedule' },
            { status: 500 }
        );
    }
}
