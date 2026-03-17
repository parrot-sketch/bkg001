'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, FileText, Calendar, UserCog } from 'lucide-react';

interface PatientSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled?: boolean;
}

export function PatientSection({ data, onChange, disabled }: PatientSectionProps) {
    const d = data.patient ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, patient: { ...d, [field]: value } });

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-700 border-b pb-2">
                <User className="h-4 w-4" />
                <span className="font-semibold">Patient & Administrative Information</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Patient File No.</Label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            className="pl-9"
                            value={d.patientFileNo || ''}
                            onChange={(e) => set('patientFileNo', e.target.value)}
                            placeholder="Enter file number"
                            disabled={disabled}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Patient Name</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            className="pl-9"
                            value={d.patientName || ''}
                            onChange={(e) => set('patientName', e.target.value)}
                            placeholder="Patient full name"
                            disabled={disabled}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Age</Label>
                    <Input
                        type="number"
                        value={d.age || ''}
                        onChange={(e) => set('age', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="Years"
                        disabled={disabled}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Sex</Label>
                    <Select value={d.sex || ''} onValueChange={(v) => set('sex', v as 'Male' | 'Female' | 'Other')} disabled={disabled}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select sex" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Date</Label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            type="date"
                            className="pl-9"
                            value={d.date || ''}
                            onChange={(e) => set('date', e.target.value)}
                            disabled={disabled}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Doctor / Surgeon</Label>
                    <div className="relative">
                        <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            className="pl-9"
                            value={d.doctor || ''}
                            onChange={(e) => set('doctor', e.target.value)}
                            placeholder="Surgeon's name"
                            disabled={disabled}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
