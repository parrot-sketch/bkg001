'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PatientSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
    patientInfo?: { first_name: string; last_name: string; file_number: string };
}

export function PatientSection({ data, onChange, disabled, patientInfo }: PatientSectionProps) {
    const d = data.patient ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, patient: { ...d, [field]: value } });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-sm">Patient File No.</Label>
                    <Input
                        value={d.patientFileNo || ''}
                        onChange={(e) => set('patientFileNo', e.target.value)}
                        placeholder="Enter file number"
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">Name</Label>
                    <Input
                        value={d.patientName || ''}
                        onChange={(e) => set('patientName', e.target.value)}
                        placeholder="Patient full name"
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">Age</Label>
                    <Input
                        type="number"
                        value={d.age || ''}
                        onChange={(e) => set('age', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="Years"
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">Sex</Label>
                    <Select value={d.sex || ''} onValueChange={(v) => set('sex', v as 'Male' | 'Female' | 'Other')} disabled={disabled}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select sex" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">Date</Label>
                    <Input
                        type="date"
                        value={d.date || ''}
                        onChange={(e) => set('date', e.target.value)}
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">Doctor</Label>
                    <Input
                        value={d.doctor || ''}
                        onChange={(e) => set('doctor', e.target.value)}
                        placeholder="Surgeon's name"
                        disabled={disabled}
                    />
                </div>
            </div>
        </div>
    );
}
