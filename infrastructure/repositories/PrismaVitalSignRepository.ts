import db from '@/lib/db';
import { IVitalSignRepository } from '../../domain/interfaces/repositories/IVitalSignRepository';

export class PrismaVitalSignRepository implements IVitalSignRepository {
    async save(data: any): Promise<any> {
        return db.vitalSign.create({
            data: {
                patient_id: data.patientId,
                appointment_id: data.appointmentId || null,
                body_temperature: data.bodyTemperature || null,
                systolic: data.systolic || null,
                diastolic: data.diastolic || null,
                heart_rate: data.heartRate || null,
                respiratory_rate: data.respiratoryRate || null,
                oxygen_saturation: data.oxygenSaturation || null,
                weight: data.weight || null,
                height: data.height || null,
                recorded_by: data.recordedBy,
                recorded_at: new Date(),
            },
        });
    }

    async findByPatientId(patientId: string): Promise<any[]> {
        return db.vitalSign.findMany({
            where: { patient_id: patientId },
            orderBy: { recorded_at: 'desc' },
        });
    }

    async findByAppointmentId(appointmentId: number): Promise<any | null> {
        return db.vitalSign.findFirst({
            where: { appointment_id: appointmentId },
            orderBy: { recorded_at: 'desc' },
        });
    }
}
