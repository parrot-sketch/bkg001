'use client';

import { MedicationAdministration } from '@/lib/api/nurse-forms';
import { format } from 'date-fns';
import Image from 'next/image';

interface MedicationChartPrintProps {
    patient: {
        first_name: string;
        last_name: string;
        file_number: string;
    };
    administrations: MedicationAdministration[];
}

export function MedicationChartPrint({ patient, administrations }: MedicationChartPrintProps) {
    const activeAdmins = administrations.filter(a => a.status === 'ADMINISTERED')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
        <div className="bg-white p-8 max-w-4xl mx-auto text-slate-900 font-sans" id="medication-chart-print">
            {/* Header / Branding */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-white flex items-center justify-center border border-slate-200 rounded-lg">
                        <img
                            src="https://res.cloudinary.com/dcngzaxlv/image/upload/v1768807323/logo_tw2voz.png"
                            alt="Logo"
                            className="h-12 w-auto object-contain"
                        />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-tight">Nairobi Sculpt</h1>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Specialist Surgical Clinic</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-slate-400 uppercase">Medication Administration Chart</h2>
                    <p className="text-sm">Generated: {format(new Date(), 'dd MMM yyyy HH:mm')}</p>
                </div>
            </div>

            {/* Patient Info */}
            <div className="grid grid-cols-2 gap-8 mb-10 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Patient Name</label>
                    <p className="text-lg font-semibold">{patient.first_name} {patient.last_name}</p>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">File Number</label>
                    <p className="text-lg font-semibold">{patient.file_number}</p>
                </div>
            </div>

            {/* Admin Table */}
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-900 text-left text-[10px] uppercase font-bold text-slate-500">
                        <th className="py-2 px-1">Date/Time</th>
                        <th className="py-2 px-1">Medication Name</th>
                        <th className="py-2 px-1">Dose</th>
                        <th className="py-2 px-1">Route</th>
                        <th className="py-2 px-1">Administered By</th>
                        <th className="py-2 px-1">Status</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {activeAdmins.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 italic">No medication administrations recorded.</td>
                        </tr>
                    ) : (
                        activeAdmins.map((admin) => (
                            <tr key={admin.id} className="border-b border-slate-100">
                                <td className="py-4 px-1">{admin.administered_at ? format(new Date(admin.administered_at), 'dd/MM HH:mm') : '-'}</td>
                                <td className="py-4 px-1 font-bold">{admin.name}</td>
                                <td className="py-4 px-1">{admin.dose_value} {admin.dose_unit}</td>
                                <td className="py-4 px-1">{admin.route}</td>
                                <td className="py-4 px-1 font-mono text-[10px]">{admin.administered_by || 'Unknown'}</td>
                                <td className="py-4 px-1">
                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Given</span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Footer */}
            <div className="mt-20 pt-8 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400">Electronic Clinical Record - Confidentially handled</p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">Ref: {format(new Date(), 'yyyy-MM-dd')}/MED/CHART</p>
            </div>

            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #medication-chart-print, #medication-chart-print * {
                        visibility: visible;
                    }
                    #medication-chart-print {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
