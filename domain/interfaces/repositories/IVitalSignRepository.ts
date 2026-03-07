import { VitalSign } from '@prisma/client';

export interface RecordVitalSignsDto {
    patientId: string;
    appointmentId?: number;
    bodyTemperature?: number;
    systolic?: number;
    diastolic?: number;
    heartRate?: string;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
    recordedBy: string;
}

export interface IVitalSignRepository {
    save(vitals: any): Promise<any>;
    findByPatientId(patientId: string): Promise<any[]>;
    findByAppointmentId(appointmentId: number): Promise<any | null>;
}
