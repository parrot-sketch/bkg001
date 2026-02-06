import { NextRequest, NextResponse } from 'next/server';
import { GetDoctorBySlugUseCase } from '@/application/use-cases/GetDoctorBySlugUseCase';
import { PrismaDoctorRepository } from '@/infrastructure/database/repositories/PrismaDoctorRepository';
import { db } from '@/lib/db';

const doctorRepository = new PrismaDoctorRepository(db);
const getDoctorBySlugUseCase = new GetDoctorBySlugUseCase(doctorRepository);

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        if (!slug) {
            return NextResponse.json(
                { success: false, error: 'Slug is required' },
                { status: 400 }
            );
        }

        const doctor = await getDoctorBySlugUseCase.execute(slug);

        return NextResponse.json({
            success: true,
            data: doctor,
        });
    } catch (error: any) {
        console.error('Error fetching doctor by slug:', error);

        if (error.message?.includes('not found')) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Failed to fetch doctor profile' },
            { status: 500 }
        );
    }
}
