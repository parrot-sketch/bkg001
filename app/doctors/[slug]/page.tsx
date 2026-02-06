import { notFound } from 'next/navigation';
import { PublicDoctorProfileView } from '@/components/doctor/PublicDoctorProfileView';
import { GetDoctorBySlugUseCase } from '@/application/use-cases/GetDoctorBySlugUseCase';
import { PrismaDoctorRepository } from '@/infrastructure/database/repositories/PrismaDoctorRepository';
import { db } from '@/lib/db';
import type { Metadata } from 'next';

const doctorRepository = new PrismaDoctorRepository(db);
const getDoctorBySlugUseCase = new GetDoctorBySlugUseCase(doctorRepository);

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    try {
        const { slug } = await params;
        const doctor = await getDoctorBySlugUseCase.execute(slug);

        return {
            title: `${doctor.title ? doctor.title + ' ' : ''}${doctor.name} - ${doctor.specialization}`,
            description: doctor.bio || `Book an appointment with ${doctor.name}, ${doctor.specialization}`,
        };
    } catch {
        return {
            title: 'Doctor Not Found',
            description: 'The requested doctor profile could not be found.',
        };
    }
}

export default async function PublicDoctorProfilePage({ params }: PageProps) {
    const { slug } = await params;

    let doctor;
    try {
        doctor = await getDoctorBySlugUseCase.execute(slug);
    } catch (error) {
        notFound();
    }

    return <PublicDoctorProfileView doctor={doctor} />;
}
