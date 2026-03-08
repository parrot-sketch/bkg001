'use client';

import { 
  Activity, 
  Heart, 
  FileText, 
  Phone, 
  Mail, 
  ExternalLink 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PatientSidebarProps {
    patient: any;
    appointmentId?: number;
    patientId?: string;
}

export function PatientSidebar({ patient, appointmentId, patientId }: PatientSidebarProps) {
    if (!patient) return null;

    const hasAllergies = !!patient.allergies && patient.allergies.trim().length > 0;
    const hasMedicalConditions = !!patient.medicalConditions && patient.medicalConditions.trim().length > 0;
    const hasMedicalHistory = !!patient.medicalHistory && patient.medicalHistory.trim().length > 0;

    return (
        <div className="space-y-4">
            {/* Medical Summary Card */}
            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4 text-slate-400" />
                        Medical Summary
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    {patient.bloodGroup && (
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Blood Group</span>
                            <Badge variant="outline" className="font-bold">
                                <Heart className="h-3 w-3 mr-1 text-red-500" />
                                {patient.bloodGroup}
                            </Badge>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Allergies</span>
                        {hasAllergies ? (
                            <Badge variant="destructive" className="text-xs">{patient.allergies}</Badge>
                        ) : (
                            <span className="text-emerald-600 text-xs font-medium">None known</span>
                        )}
                    </div>
                    {hasMedicalConditions && (
                        <div className="pt-2 border-t">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Conditions</p>
                            <p className="text-slate-700 text-sm line-clamp-3">{patient.medicalConditions}</p>
                        </div>
                    )}
                    {hasMedicalHistory && (
                        <div className="pt-2 border-t">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Medical History</p>
                            <p className="text-slate-700 text-sm line-clamp-4">{patient.medicalHistory}</p>
                        </div>
                    )}
                    {!hasMedicalConditions && !hasMedicalHistory && !patient.bloodGroup && !hasAllergies && (
                        <div className="text-center py-4">
                            <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-400 text-xs">No medical records</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Contact Information Card */}
            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                    {patient.phone && (
                        <div className="flex items-center gap-2.5 text-slate-600">
                            <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <a href={`tel:${patient.phone}`} className="hover:text-slate-900 transition-colors">
                                {patient.phone}
                            </a>
                        </div>
                    )}
                    {patient.email && (
                        <div className="flex items-center gap-2.5 text-slate-600">
                            <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <a href={`mailto:${patient.email}`} className="hover:text-slate-900 transition-colors truncate">
                                {patient.email}
                            </a>
                        </div>
                    )}
                    {patient.emergencyContactName && (
                        <div className="pt-2 border-t">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Emergency Contact</p>
                            <div className="p-2.5 rounded-lg bg-slate-50">
                                <p className="font-medium text-slate-900 text-sm">{patient.emergencyContactName}</p>
                                {patient.relation && (
                                    <p className="text-slate-500 text-xs capitalize">{patient.relation}</p>
                                )}
                                {patient.emergencyContactNumber && (
                                    <a href={`tel:${patient.emergencyContactNumber}`} className="text-blue-600 hover:text-blue-700 text-xs mt-1 inline-flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {patient.emergencyContactNumber}
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Link to Full Profile */}
            {patientId && (
                <Link href={`/doctor/patients/${patientId}`}>
                    <Button variant="outline" className="w-full gap-2 text-sm">
                        <ExternalLink className="h-4 w-4" />
                        View Full Patient Profile
                    </Button>
                </Link>
            )}
        </div>
    );
}
