'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
import { Activity, FileText, User, MoreHorizontal, Phone, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { doctorApi } from '@/lib/api/doctor';
import { DoctorProfileModal } from '@/components/patient/DoctorProfileModal';
import { format } from 'date-fns';

interface PatientTableRowProps {
    patient: PatientResponseDto;
    appointment?: AppointmentResponseDto | null;
    onRecordVitals: (patient: PatientResponseDto) => void;
    onAddCareNote: (patient: PatientResponseDto) => void;
}

export function PatientTableRow({
    patient,
    appointment,
    onRecordVitals,
    onAddCareNote,
}: PatientTableRowProps) {
    const [doctor, setDoctor] = useState<DoctorResponseDto | null>(null);
    const [loadingDoctor, setLoadingDoctor] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);

    useEffect(() => {
        if (appointment?.doctorId) {
            loadDoctorInfo();
        }
    }, [appointment?.doctorId]);

    const loadDoctorInfo = async () => {
        if (!appointment?.doctorId) return;
        setLoadingDoctor(true);
        try {
            const response = await doctorApi.getDoctor(appointment.doctorId);
            if (response.success && response.data) {
                setDoctor(response.data);
            }
        } catch (error) {
            console.error('Error loading doctor info:', error);
        } finally {
            setLoadingDoctor(false);
        }
    };

    const handleViewDoctorProfile = () => {
        if (doctor) {
            setShowProfileModal(true);
        }
    };

    return (
        <>
            <TableRow className="hover:bg-slate-50/50">
                <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-slate-100">
                            <AvatarImage src="" /> {/* Add patient image if available */}
                            <AvatarFallback className="bg-purple-50 text-purple-700 text-xs font-bold">
                                {patient.firstName[0]}{patient.lastName[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">{patient.firstName} {patient.lastName}</span>
                            <span className="text-[11px] text-slate-500">#{patient.fileNumber || patient.id.substring(0, 6)}</span>
                        </div>
                    </div>
                </TableCell>

                <TableCell>
                    <div className="flex flex-col text-xs text-slate-600 gap-1">
                        {patient.dateOfBirth && (
                            <span>{patient.age} yrs • {patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase() : 'N/A'}</span>
                        )}
                        {appointment?.time && (
                            <Badge variant="outline" className="w-fit text-[10px] font-normal px-1.5 py-0 border-slate-200 text-slate-500 bg-slate-50">
                                {appointment.time}
                            </Badge>
                        )}
                    </div>
                </TableCell>

                <TableCell>
                    <div className="flex flex-col gap-1">
                        {doctor ? (
                            <button
                                onClick={handleViewDoctorProfile}
                                className="text-xs font-medium text-slate-700 hover:text-blue-600 text-left flex items-center gap-1.5 transition-colors"
                            >
                                <User className="h-3 w-3 text-slate-400" />
                                Dr. {doctor.firstName} {doctor.lastName}
                            </button>
                        ) : loadingDoctor ? (
                            <span className="text-[10px] text-slate-400">Loading doctor...</span>
                        ) : (
                            <span className="text-[10px] text-slate-400 italic">No assigned doctor</span>
                        )}
                        <span className="text-[10px] text-slate-500">{appointment?.type || 'General Visit'}</span>
                    </div>
                </TableCell>

                <TableCell>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {patient.phone || '--'}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span className="truncate max-w-[120px]" title={patient.email || ''}>{patient.email || '--'}</span>
                        </div>
                    </div>
                </TableCell>

                <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => onRecordVitals(patient)} title="Record Vitals">
                            <Activity className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => onAddCareNote(patient)} title="Add Note">
                            <FileText className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => onRecordVitals(patient)}>
                                    <Activity className="mr-2 h-4 w-4" /> Record Vitals
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAddCareNote(patient)}>
                                    <FileText className="mr-2 h-4 w-4" /> Add Care Note
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleViewDoctorProfile} disabled={!doctor}>
                                    <User className="mr-2 h-4 w-4" /> View Doctor Profile
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </TableCell>
            </TableRow>

            {/* Doctor Profile Modal */}
            {doctor && (
                <DoctorProfileModal
                    open={showProfileModal}
                    onClose={() => setShowProfileModal(false)}
                    doctor={doctor}
                />
            )}
        </>
    );
}
