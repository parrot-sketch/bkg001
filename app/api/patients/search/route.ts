import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { PatientMapper as InfrastructurePatientMapper } from '@/infrastructure/mappers/PatientMapper';
import { PatientMapper as ApplicationPatientMapper } from '@/application/mappers/PatientMapper';

export async function GET(request: NextRequest) {
    try {
        // 1. Authenticate (optional based on requirements, but usually required for patient data)
        const authResult = await authenticateRequest(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!query || query.length < 2) {
            return NextResponse.json({ success: true, data: [] });
        }

        // 2. Search patients using Prisma
        // We'll search by firstName, lastName, email, phone, or fileNumber
        const patients = await db.patient.findMany({
            where: {
                OR: [
                    { first_name: { contains: query, mode: 'insensitive' } },
                    { last_name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query, mode: 'insensitive' } },
                    { file_number: { contains: query, mode: 'insensitive' } },
                ],
            },
            take: 20, // Limit results
            orderBy: { created_at: 'desc' },
        });

        // 3. Map to DTO using centralized mappers
        const data: PatientResponseDto[] = patients.map(p => {
            try {
                const domainPatient = InfrastructurePatientMapper.fromPrisma(p);
                return ApplicationPatientMapper.toResponseDto(domainPatient);
            } catch (error) {
                console.warn(`[Search] Error mapping patient ${p.id}:`, error);
                // Return a simplified object or handle error as needed
                // For now, we'll continue and exclude invalid records or use a fallback
                // but generally infrastructure mapper handles fallbacks.
                throw error; // Let the catch block handle it if mapping fails completely
            }
        });

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('Search patients error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
