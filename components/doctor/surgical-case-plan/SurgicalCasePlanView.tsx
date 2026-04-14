import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Clock, Stethoscope, FileText, User, Microscope } from 'lucide-react';
import { format } from 'date-fns';

interface Procedure {
    id: string;
    name: string;
    category?: string | null;
}

interface Surgeon {
    id: string;
    name: string;
}

interface SurgicalCasePlanViewProps {
    onEdit: () => void;
    data: {
        procedureDate?: Date | string | null;
        diagnosis?: string;
        procedureCategory?: string;
        primaryOrRevision?: string;
        anaesthesiaType?: string;
        skinToSkinMinutes?: number | null;
        totalTheatreMinutes?: number | null;
        admissionType?: string;
        deviceUsed?: string;
    };
    surgeons: Surgeon[];
    procedures: Procedure[];
}

export function SurgicalCasePlanView({ onEdit, data, surgeons, procedures }: SurgicalCasePlanViewProps) {
    const formatDate = (date: Date | string | null | undefined) => {
        if (!date) return '—';
        return format(new Date(date), 'MMMM d, yyyy');
    };

    const hasData = data.procedureCategory || data.diagnosis || procedures.length > 0;

    if (!hasData) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 bg-white border border-dashed border-slate-300 rounded-lg max-w-4xl mx-auto">
                <FileText className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700">No Case Plan Formulated</h3>
                <p className="mt-1 text-sm bg-transparent">A surgical case plan has not been outlined for this patient yet.</p>
                <Button onClick={onEdit} className="mt-6 shadow-sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Create Case Plan
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
            {/* Header Action Bar */}
            <div className="flex items-center justify-between mb-6">
                 <div>
                     <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="h-6 w-6 text-slate-500" />
                        Surgical Case Plan
                     </h2>
                     <p className="text-sm text-slate-500 mt-1">
                        Read-only administrative and logistics plan
                     </p>
                 </div>
                 <Button variant="outline" onClick={onEdit} className="bg-white">
                     <Edit className="h-4 w-4 mr-2 text-slate-500" />
                     Edit Plan
                 </Button>
            </div>

            <Card className="shadow-sm border-slate-200 overflow-hidden">
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
                     <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase flex items-center">
                         <User className="h-4 w-4 mr-2 text-slate-400" />
                         Operative Identification
                     </h3>
                </div>
                <CardContent className="p-6 md:p-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6">
                        <div className="space-y-1.5">
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Date</p>
                            <p className="text-sm font-semibold text-slate-800">{formatDate(data.procedureDate)}</p>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Team</p>
                            <p className="text-sm font-semibold text-slate-800">
                                {surgeons.length > 0 ? surgeons.map(s => s.name).join(', ') : 'Not assigned'}
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Category</p>
                            <p className="text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
                                {data.procedureCategory || '—'}
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Case Type</p>
                            <p className="text-sm font-medium text-slate-800 capitalize">
                                {data.primaryOrRevision?.toLowerCase() || '—'}
                            </p>
                        </div>

                        <div className="sm:col-span-2 md:col-span-4 border-t border-slate-100 pt-6 mt-2 space-y-1.5">
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Pre-Operative Diagnosis</p>
                            <p className="text-sm font-medium text-slate-800 bg-slate-50 p-4 rounded-md border border-slate-100">
                                {data.diagnosis || 'No diagnosis written'}
                            </p>
                        </div>

                        <div className="sm:col-span-2 md:col-span-4 space-y-2 pt-2">
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center">
                                <Microscope className="h-3.5 w-3.5 mr-1" />
                                Planned Procedures
                            </p>
                            <div className="space-y-2 mt-1">
                                {procedures.length > 0 ? (
                                    procedures.map((proc) => (
                                        <div key={proc.id} className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                            <span className="font-medium text-slate-800 text-sm">{proc.name}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-500 italic">None selected</p>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 mt-6 overflow-hidden">
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100">
                     <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase flex items-center">
                         <Stethoscope className="h-4 w-4 mr-2 text-slate-400" />
                         Anaesthesia & Logistics
                     </h3>
                </div>
                <CardContent className="p-6 md:p-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-1.5 border border-slate-100 rounded-md p-4">
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Anaesthesia</p>
                            <p className="text-sm font-semibold text-slate-800 capitalize">
                                {data.anaesthesiaType?.toLowerCase() || '—'}
                            </p>
                        </div>
                        <div className="space-y-1.5 border border-slate-100 rounded-md p-4">
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Admission</p>
                            <p className="text-sm font-semibold text-slate-800 capitalize">
                                {data.admissionType?.toLowerCase() || '—'}
                            </p>
                        </div>
                        <div className="space-y-1.5 border border-slate-100 rounded-md p-4">
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center">
                                <Clock className="h-3.5 w-3.5 mr-1" />
                                Skin-to-Skin
                            </p>
                            <p className="text-sm font-semibold text-slate-800">
                                {data.skinToSkinMinutes ? `${data.skinToSkinMinutes} mins` : '—'}
                            </p>
                        </div>
                        <div className="space-y-1.5 border border-slate-100 rounded-md p-4">
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center">
                                <Clock className="h-3.5 w-3.5 mr-1" />
                                Total Theatre
                            </p>
                            <p className="text-sm font-semibold text-slate-800">
                                {data.totalTheatreMinutes ? `${data.totalTheatreMinutes} mins` : '—'}
                            </p>
                        </div>

                        {data.deviceUsed && (
                            <div className="sm:col-span-2 lg:col-span-4 mt-2">
                                <div className="space-y-1.5 bg-orange-50/50 p-4 rounded-md border border-orange-100">
                                    <p className="text-[11px] text-orange-600 font-bold uppercase tracking-wider">
                                        Lipo Device Designation
                                    </p>
                                    <p className="text-sm font-semibold text-slate-800 capitalize inline-block">
                                        {data.deviceUsed.replace(/_/g, ' ').toLowerCase()}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}