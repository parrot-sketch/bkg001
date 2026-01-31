/**
 * API Route: GET /api/doctors/me/patients
 *
 * Optimized endpoint to fetch unique patients for the current doctor.
 *
 * REPLACES: Client-side N+1 fetching logic in DoctorPatientsPage.
 *
 * Optimization:
 * - Single database query to fetch all unique patients
 * - Uses nested relation filtering (appointments -> some -> doctor_id)
 * - Eliminates N+1 API calls
 * - Returns minimal required DTOs
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { Role } from '@/domain/enums/Role';
import { PatientMapper } from '@/infrastructure/mappers/PatientMapper';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        // 1. Authenticate request
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Authentication required',
                },
                { status: 401 }
            );
        }

        const { userId, role } = authResult.user;

        // 2. Check permissions (only DOCTOR role)
        if (role !== Role.DOCTOR) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Access denied: Only doctors can access this endpoint',
                },
                { status: 403 }
            );
        }

        // 3. Find doctor profile to get doctor ID
        const doctor = await db.doctor.findUnique({
            where: { user_id: userId },
            select: { id: true },
        });

        if (!doctor) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Doctor profile not found',
                },
                { status: 404 }
            );
        }

        // 4. Efficiently fetch unique patients
        // Find patients who have at least one appointment with this doctor
        const prismaPatients = await db.patient.findMany({
            where: {
                appointments: {
                    some: {
                        doctor_id: doctor.id,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        // 5. Map to DTOs
        // Use Mapper -> Entity -> DTO pattern to ensure domain rules (like age calc) are consistent
        const patientDtos: PatientResponseDto[] = prismaPatients.map((prismaPatient) => {
            // Convert to Domain Entity (handles validation, value objects)
            const patientEntity = PatientMapper.fromPrisma(prismaPatient);

            // Map Entity to DTO
            return {
                id: patientEntity.getId(),
                fileNumber: patientEntity.getFileNumber(),
                firstName: patientEntity.getFirstName(),
                lastName: patientEntity.getLastName(),
                fullName: patientEntity.getFullName(),
                dateOfBirth: patientEntity.getDateOfBirth(),
                age: patientEntity.getAge(),
                gender: patientEntity.getGender(),
                email: patientEntity.getEmail().getValue(),
                phone: patientEntity.getPhone().getValue(),
                whatsappPhone: patientEntity.getWhatsappPhone(),
                address: patientEntity.getAddress(),
                occupation: patientEntity.getOccupation(),
                maritalStatus: patientEntity.getMaritalStatus(),
                emergencyContactName: patientEntity.getEmergencyContactName(),
                emergencyContactNumber: patientEntity.getEmergencyContactNumber().getValue(),
                relation: patientEntity.getRelation(),
                hasPrivacyConsent: patientEntity.hasPrivacyConsent(),
                hasServiceConsent: patientEntity.hasServiceConsent(),
                hasMedicalConsent: patientEntity.hasMedicalConsent(),
                bloodGroup: patientEntity.getBloodGroup(),
                allergies: patientEntity.getAllergies(),
                medicalConditions: patientEntity.getMedicalConditions(),
                medicalHistory: patientEntity.getMedicalHistory(),
                insuranceProvider: patientEntity.getInsuranceProvider(),
                insuranceNumber: patientEntity.getInsuranceNumber(),
                createdAt: patientEntity.getCreatedAt(),
                updatedAt: patientEntity.getUpdatedAt(),
                profileImage: patientEntity.getImg(), // mapped to profileImage in DTO usually? DTO says profileImage, Entity says img. Check DTO again.
                colorCode: patientEntity.getColorCode(),
            };
        });

        // Note: DTO has profileImage, Entity has img. 
        // Checking DTO definition again: readonly profileImage?: string;
        // Checking Patient Entity: getImg(): string | undefined

        return NextResponse.json(
            {
                success: true,
                data: patientDtos,
                count: patientDtos.length,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('[API] /api/doctors/me/patients GET - Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch patients',
            },
            { status: 500 }
        );
    }
}
