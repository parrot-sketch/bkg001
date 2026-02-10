/**
 * API Route: GET /api/frontdesk/patients
 * 
 * Optimized endpoint for fetching/searching patients for Frontdesk.
 * Supports server-side pagination and search.
 * 
 * Query Params:
 * - page: number (default 1)
 * - limit: number (default 10)
 * - q: string (search query)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { Role } from '@/domain/enums/Role';
import { PatientMapper } from '@/infrastructure/mappers/PatientMapper';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        // 1. Authenticate request
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { role } = authResult.user;

        // 2. Check permissions (FRONTDESK or ADMIN)
        if (role !== Role.FRONTDESK && role !== Role.ADMIN) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        // 3. Parse query params
        const searchParams = request.nextUrl.searchParams;
        const page = Math.max(1, Number(searchParams.get('page')) || 1);
        const limit = Math.max(1, Number(searchParams.get('limit')) || 10);
        const search = searchParams.get('q')?.trim() || '';

        const skip = (page - 1) * limit;

        // 4. Build Filter
        const whereClause: Prisma.PatientWhereInput = search
            ? {
                OR: [
                    { first_name: { contains: search, mode: 'insensitive' } },
                    { last_name: { contains: search, mode: 'insensitive' } },
                    { file_number: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ],
            }
            : {};

        // 5. Execute DB Queries (Parallel Count + Data + Stats)
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [totalRecords, prismaPatients, newToday, newThisMonth] = await Promise.all([
            db.patient.count({ where: whereClause }),
            db.patient.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                // Select optimization: only fetch needed fields + efficient last visit calc
                select: {
                    id: true,
                    file_number: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    phone: true,
                    date_of_birth: true,
                    gender: true,
                    address: true,
                    img: true,
                    colorCode: true,
                    created_at: true,
                    updated_at: true,
                    // Relation mappings for Mapper (can be null/undefined which Mapper handles)
                    whatsapp_phone: true,
                    occupation: true,
                    marital_status: true,
                    emergency_contact_name: true,
                    emergency_contact_number: true,
                    relation: true,
                    privacy_consent: true,
                    service_consent: true,
                    medical_consent: true,
                    blood_group: true,
                    allergies: true,
                    medical_conditions: true,
                    medical_history: true,
                    insurance_provider: true,
                    insurance_number: true,

                    // Efficient Last Visit calculation
                    // "Last Visit" = Last COMPLETED appointment
                    appointments: {
                        where: { status: 'COMPLETED' },
                        orderBy: { appointment_date: 'desc' },
                        take: 1,
                        select: { appointment_date: true },
                    },
                },
            }),
            // Stats: new patients registered today
            db.patient.count({ where: { created_at: { gte: startOfToday } } }),
            // Stats: new patients registered this month
            db.patient.count({ where: { created_at: { gte: startOfMonth } } }),
        ]);

        // 6. Map to DTOs
        const patientDtos = prismaPatients.map((p) => {
            // Create Domain Entity first to ensure consistent business logic (age, name formatting)
            const entity = PatientMapper.fromPrisma(p as any);
            // Note: 'as any' used because we selected specific fields, but Mapper expects full Prisma model.
            // However, we selected ALL fields required by Mapper.toPrismaCreateInput -> Entity.
            // Wait, Mapper.fromPrisma expects full PrismaPatient. 
            // We selected all fields used in Mapper.fromPrisma (checked in previous step).

            const dto = {
                id: entity.getId(),
                fileNumber: entity.getFileNumber(),
                firstName: entity.getFirstName(),
                lastName: entity.getLastName(),
                fullName: entity.getFullName(),
                dateOfBirth: entity.getDateOfBirth(),
                age: entity.getAge(),
                gender: entity.getGender(),
                email: entity.getEmail().getValue(),
                phone: entity.getPhone().getValue(),
                address: entity.getAddress(),
                profileImage: entity.getImg(),
                colorCode: entity.getColorCode(),
                createdAt: entity.getCreatedAt(),
                // Add lastVisit to DTO (might need to extend DTO interface or just return as extra field)
                // For UI consistency, we attach it here.
                lastVisit: p.appointments[0]?.appointment_date || null,

                // Include other fields for detailed view if needed, but table mostly needs above.
                // We stick to what PatientTable needs.
            };

            return dto;
        });

        const totalPages = Math.ceil(totalRecords / limit);

        return NextResponse.json({
            success: true,
            data: patientDtos,
            meta: {
                totalRecords,
                totalPages,
                currentPage: page,
                limit,
                newToday,
                newThisMonth,
            },
        });

    } catch (error) {
        console.error('[API] /api/frontdesk/patients GET - Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch patients' },
            { status: 500 }
        );
    }
}
