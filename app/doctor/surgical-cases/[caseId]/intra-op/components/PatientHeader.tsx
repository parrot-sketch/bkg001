'use client';

import { User, FileText, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface PatientHeaderProps {
    surgicalCase: {
        id: string;
        status: string;
        diagnosis: string;
        procedure_name: string;
        side: string;
        patient: {
            id: string;
            first_name: string;
            last_name: string;
            file_number: string;
            allergies: string;
        } | null;
    } | null;
}

export function PatientHeader({ surgicalCase }: PatientHeaderProps) {
    if (!surgicalCase?.patient) return null;

    const { patient } = surgicalCase;
    const fullName = `${patient.first_name} ${patient.last_name}`.trim();
    const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();

    return (
        <div className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {initials}
                </div>

                {/* Patient Info */}
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-stone-900">{fullName}</h2>
                        {patient.allergies && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                                <AlertTriangle className="h-3 w-3 text-amber-600" />
                                <span className="text-[10px] font-medium text-amber-700">Allergies</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1.5 text-xs text-stone-500">
                            <FileText className="h-3.5 w-3.5" />
                            <span className="font-mono">{patient.file_number}</span>
                        </div>
                        <span className="text-xs text-stone-400">•</span>
                        <span className="text-sm text-stone-600 font-medium">{surgicalCase.procedure_name}</span>
                        {surgicalCase.side && (
                            <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-medium">
                                {surgicalCase.side}
                            </span>
                        )}
                    </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500 uppercase tracking-wider">Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        surgicalCase.status === 'IN_THEATER' 
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : surgicalCase.status === 'RECOVERY'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}>
                        {surgicalCase.status.replace(/_/g, ' ')}
                    </span>
                </div>
            </div>
        </div>
    );
}
