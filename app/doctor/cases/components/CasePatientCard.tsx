'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { User, FileText, Stethoscope, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProfileImage } from '@/components/profile-image';
import { cn } from '@/lib/utils';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

interface CasePatientCardProps {
    patient: PatientResponseDto | null;
    appointment: AppointmentResponseDto;
}

export function CasePatientCard({ patient, appointment }: CasePatientCardProps) {
    const patientName = patient
        ? `${patient.firstName} ${patient.lastName}`
        : `Patient ${appointment.patientId}`;

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <ProfileImage name={patientName} className="h-16 w-16 text-lg" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{patientName}</h2>
                        <p className="text-sm text-slate-500">
                            {patient?.gender} • {patient?.dateOfBirth ? format(new Date(patient.dateOfBirth), 'yyyy') : 'Unknown'}
                        </p>
                    </div>
                </div>
                <Link href={`/doctor/patients/${appointment.patientId}`}>
                    <Button variant="outline" size="sm">View Profile</Button>
                </Link>
            </div>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoItem icon={FileText} label="File Number" value={patient?.fileNumber || "N/A"} />
                <InfoItem icon={Stethoscope} label="Visit Type" value={appointment.type || "General Consultation"} />
                {patient?.phone && <InfoItem icon={User} label="Contact" value={patient.phone} />}
                {patient?.allergies && <InfoItem icon={AlertCircle} label="Allergies" value={patient.allergies} highlight />}
            </CardContent>
        </Card>
    );
}

function InfoItem({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
    return (
        <div className="flex items-start gap-3">
            <div className={cn("mt-1 p-1.5 rounded-lg", highlight ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500")}>
                <Icon className="h-4 w-4" />
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                <p className={cn("font-medium", highlight ? "text-rose-700" : "text-slate-900")}>{value}</p>
            </div>
        </div>
    );
}
