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

        // 5. Execute DB Queries (Parallel Count + Data)
        const [totalRecords, prismaPatients] = await Promise.all([
            db.patient.count({ where: whereClause }),
            db.patient.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                select: {
                    id: true,
                    file_number: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    phone: true,
                    date_of_birth: true,
                    gender: true,
                    img: true,
                    colorCode: true,
                    created_at: true,
                    appointments: {
                        where: { status: 'COMPLETED' },
                        orderBy: { appointment_date: 'desc' },
                        take: 1,
                        select: { appointment_date: true },
                    },
                },
            }),
        ]);

        // 6. Map to DTOs - optimized for list view only
        const patientDtos = prismaPatients.map((p) => ({
            id: p.id,
            fileNumber: p.file_number,
            firstName: p.first_name,
            lastName: p.last_name,
            dateOfBirth: p.date_of_birth,
            gender: p.gender,
            email: p.email,
            phone: p.phone,
            profileImage: p.img,
            colorCode: p.colorCode,
            createdAt: p.created_at,
            lastVisit: p.appointments[0]?.appointment_date || null,
        }));

        const totalPages = Math.ceil(totalRecords / limit);

        return NextResponse.json({
            success: true,
            data: patientDtos,
            meta: {
                totalRecords,
                totalPages,
                currentPage: page,
                limit,
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
