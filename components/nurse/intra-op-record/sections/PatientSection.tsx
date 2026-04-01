'use client';

/**
 * Patient Section — Read-only display
 *
 * Shows patient identity data from the surgical case.
 * No editable fields — data is sourced from the patient record.
 */

import { format } from 'date-fns';
import { formatDoctorName } from '../intraOpRecordConfig';

interface PatientSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
    patient?: {
        first_name: string;
        last_name: string;
        file_number: string;
        date_of_birth?: string | null;
        gender?: string | null;
    };
    surgeonName?: string | null;
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-0.5">
            <p className="text-[10px] text-stone-400 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-medium text-stone-800">{value}</p>
        </div>
    );
}

export function PatientSection({ patient, surgeonName }: PatientSectionProps) {
    if (!patient) {
        return <p className="text-sm text-stone-400 italic">No patient data available.</p>;
    }

    const age = patient.date_of_birth
        ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Field label="File No." value={patient.file_number || '—'} />
            <Field label="Name" value={`${patient.first_name} ${patient.last_name}`} />
            <Field label="Age" value={age != null ? `${age} years` : '—'} />
            <Field label="Sex" value={patient.gender || '—'} />
            <Field label="Date" value={format(new Date(), 'MMM d, yyyy')} />
            <Field label="Surgeon" value={formatDoctorName(surgeonName) || '—'} />
        </div>
    );
}
