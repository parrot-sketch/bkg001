'use client';

/**
 * Doctor Profile View
 *
 * Clean identity card + professional information.
 * Uses design tokens, no hardcoded colors.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Edit,
    GraduationCap,
    Award,
    Building2,
    User,
    Globe,
    Clock,
    UserCog,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    Hash,
    Timer,
    Hourglass,
    LayoutGrid,
    Settings,
    Shield,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { EditDoctorProfileSheet } from '@/components/doctor/EditDoctorProfileSheet';
import { useInvalidateDoctorProfile } from '@/hooks/doctor/useDoctorProfile';
import { AccountSettingsSheet } from '@/components/settings/AccountSettingsSheet';
import { doctorApi } from '@/lib/api/doctor';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

// ─── Types ────────────────────────────────────────────────────

interface DoctorProfileViewProps {
    doctorData: DoctorResponseDto;
}

// ─── Component ────────────────────────────────────────────────

export function DoctorProfileView({ doctorData }: DoctorProfileViewProps) {
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showAccountSettings, setShowAccountSettings] = useState(false);
    const [currentData, setCurrentData] = useState(doctorData);
    const [slotConfig, setSlotConfig] = useState<{ defaultDuration: number; bufferTime: number; slotInterval: number } | null>(null);
    const { invalidateProfile } = useInvalidateDoctorProfile();

    useEffect(() => {
        if (doctorData) setCurrentData(doctorData);
    }, [doctorData]);

    useEffect(() => {
        doctorApi.getMyAvailability()
            .then(res => { if (res.success && res.data?.slotConfiguration) setSlotConfig(res.data.slotConfiguration); })
            .catch(() => {});
    }, []);

    if (!currentData) {
        return <div className="flex items-center justify-center h-[50vh]"><p className="text-muted-foreground">Profile not available.</p></div>;
    }

    const doctor = currentData;
    const initials = doctor.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? '';

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Identity Card */}
            <div className="border border-stone-200 rounded-lg bg-white overflow-hidden">
                <div className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                        {/* Avatar */}
                        <div className="flex-shrink-0 flex justify-center sm:justify-start">
                            {doctor.profileImage ? (
                                <div className="relative w-16 h-16 rounded-full overflow-hidden border border-stone-200">
                                    <Image src={doctor.profileImage} alt={doctor.name} fill className="object-cover" sizes="64px" priority />
                                </div>
                            ) : (
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-bold"
                                    style={{ backgroundColor: doctor.colorCode || '#475569' }}
                                >
                                    {initials}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div>
                                    <h1 className="text-lg font-semibold text-stone-900">
                                        {doctor.title ? `${doctor.title} ` : ''}{doctor.name}
                                    </h1>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <Badge variant="outline" className="text-[10px] font-medium border-stone-200 text-stone-600">
                                            {doctor.specialization}
                                        </Badge>
                                        {doctor.onboardingStatus === 'ACTIVE' && (
                                            <Badge variant="outline" className="text-[10px] font-medium border-stone-200 text-stone-500">
                                                Active
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAccountSettings(true)}>
                                        <UserCog className="h-3.5 w-3.5 mr-1.5" />
                                        Account
                                    </Button>
                                    <Button size="sm" className="h-8 text-xs bg-stone-900 hover:bg-black" onClick={() => setShowEditDialog(true)}>
                                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                                        Edit
                                    </Button>
                                </div>
                            </div>

                            {/* Contact */}
                            <div className="flex items-center gap-4 mt-3 text-xs text-stone-500 flex-wrap">
                                {doctor.email && (
                                    <a href={`mailto:${doctor.email}`} className="flex items-center gap-1 hover:text-stone-700">
                                        <Mail className="h-3 w-3" />{doctor.email}
                                    </a>
                                )}
                                {doctor.phone && (
                                    <a href={`tel:${doctor.phone}`} className="flex items-center gap-1 hover:text-stone-700">
                                        <Phone className="h-3 w-3" />{doctor.phone}
                                    </a>
                                )}
                                {doctor.clinicLocation && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />{doctor.clinicLocation}
                                    </span>
                                )}
                                {doctor.licenseNumber && (
                                    <span className="flex items-center gap-1">
                                        <Shield className="h-3 w-3" />{doctor.licenseNumber}
                                    </span>
                                )}
                            </div>

                            {/* Summary */}
                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                                {doctor.yearsOfExperience != null && doctor.yearsOfExperience > 0 && (
                                    <span className="text-xs text-stone-500">
                                        <span className="font-semibold text-stone-700">{doctor.yearsOfExperience}</span> yrs exp
                                    </span>
                                )}
                                {doctor.languages && (
                                    <span className="text-xs text-stone-500">
                                        <Globe className="inline h-3 w-3 mr-0.5" />{doctor.languages}
                                    </span>
                                )}
                                {doctor.consultationFee != null && doctor.consultationFee > 0 && (
                                    <span className="text-xs text-stone-500">
                                        <span className="font-semibold text-stone-700">KES {doctor.consultationFee.toLocaleString()}</span> / visit
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Slot Settings */}
            <Card className="border-stone-200">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-stone-400" />
                            Appointment Slots
                        </CardTitle>
                        <Link href="/doctor/schedule">
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-stone-500">
                                <Settings className="h-3 w-3 mr-1" /> Schedule
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent>
                    {slotConfig ? (
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Duration', value: `${slotConfig.defaultDuration} min`, icon: Timer },
                                { label: 'Buffer', value: `${slotConfig.bufferTime} min`, icon: Hourglass },
                                { label: 'Interval', value: `${slotConfig.slotInterval} min`, icon: LayoutGrid },
                            ].map(item => (
                                <div key={item.label} className="border border-stone-200 rounded-lg p-3 text-center">
                                    <item.icon className="h-4 w-4 text-stone-400 mx-auto mb-1" />
                                    <p className="text-base font-bold text-stone-900 tabular-nums">{item.value}</p>
                                    <p className="text-[10px] text-stone-400 mt-0.5">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-stone-400 text-center py-3">
                            Not configured.{' '}
                            <Link href="/doctor/schedule" className="text-stone-600 underline">Set up schedule</Link>
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Professional Info */}
            {(doctor.bio || doctor.education || doctor.focusAreas || doctor.professionalAffiliations) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {doctor.bio && (
                        <Card className="border-stone-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <User className="h-4 w-4 text-stone-400" /> Biography
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{doctor.bio}</p>
                            </CardContent>
                        </Card>
                    )}

                    {doctor.education && (
                        <Card className="border-stone-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4 text-stone-400" /> Education
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{doctor.education}</p>
                            </CardContent>
                        </Card>
                    )}

                    {doctor.focusAreas && (
                        <Card className="border-stone-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Award className="h-4 w-4 text-stone-400" /> Focus Areas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-1.5">
                                    {doctor.focusAreas.split(',').map((area: string, i: number) => (
                                        <Badge key={i} variant="outline" className="text-[10px] font-medium border-stone-200 text-stone-600">
                                            {area.trim()}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {doctor.professionalAffiliations && (
                        <Card className="border-stone-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-stone-400" /> Affiliations
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-1.5">
                                    {doctor.professionalAffiliations.split(',').map((aff: string, i: number) => (
                                        <div key={i} className="flex items-start gap-2 text-sm text-stone-600">
                                            <div className="w-1.5 h-1.5 rounded-full bg-stone-300 mt-1.5 flex-shrink-0" />
                                            <span>{aff.trim()}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Edit Sheet */}
            {currentData && (
                <EditDoctorProfileSheet
                    open={showEditDialog}
                    onClose={() => setShowEditDialog(false)}
                    onSuccess={() => invalidateProfile()}
                    doctor={currentData}
                />
            )}

            {/* Account Settings */}
            <AccountSettingsSheet
                open={showAccountSettings}
                onClose={() => setShowAccountSettings(false)}
                currentEmail={currentData.email}
            />
        </div>
    );
}
