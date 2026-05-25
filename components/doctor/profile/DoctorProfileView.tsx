'use client';

/**
 * Doctor Profile View
 *
 * Clean identity card + professional information.
 * Uses design tokens, no hardcoded colors.
 */

import { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    GraduationCap,
    Award,
    Building2,
    User,
    Globe,
    Mail,
    Phone,
    MapPin,
    Shield,
    Info,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { EditDoctorProfileSheet } from '@/components/doctor/EditDoctorProfileSheet';
import { useInvalidateDoctorProfile } from '@/hooks/doctor/useDoctorProfile';
import { ManageAvailabilitySheet } from './ManageAvailabilitySheet';
import { AccountSettingsSheet } from '@/components/settings/AccountSettingsSheet';
import { doctorApi } from '@/lib/api/doctor';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ─── Types ────────────────────────────────────────────────────

interface DoctorProfileViewProps {
    doctorData: DoctorResponseDto;
}

// ─── Component ────────────────────────────────────────────────

export function DoctorProfileView({ doctorData }: DoctorProfileViewProps) {
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showAccountSettings, setShowAccountSettings] = useState(false);
    const [showAvailabilitySheet, setShowAvailabilitySheet] = useState(false);
    const [currentData, setCurrentData] = useState(doctorData);
    const [availabilityData, setAvailabilityData] = useState<any>(null);
    const [slotConfig, setSlotConfig] = useState<{ defaultDuration: number; bufferTime: number; slotInterval: number } | null>(null);
    const [feeDraft, setFeeDraft] = useState<string>('');
    const [savingFee, setSavingFee] = useState(false);
    const feeInitRef = useRef<{ doctorId?: string; initialized: boolean }>({ initialized: false });
    const { invalidateProfile } = useInvalidateDoctorProfile();

    useEffect(() => {
        if (doctorData) setCurrentData(doctorData);
    }, [doctorData]);

    useEffect(() => {
        if (!doctorData) return;

        // Initialize once per doctor profile load.
        // Important: don't re-apply when the user clears the input (empty string).
        const currentDoctorId = doctorData.id;
        if (!feeInitRef.current.initialized || feeInitRef.current.doctorId !== currentDoctorId) {
            feeInitRef.current = { initialized: true, doctorId: currentDoctorId };
            setFeeDraft(String(doctorData.consultationFee ?? 0));
        }
    }, [doctorData]);

    const loadAvailability = () => {
        doctorApi.getMyAvailability()
            .then(res => { 
                if (res.success && res.data) {
                    const daysMap: Record<string, number> = {
                        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
                    };
                    
                    // Map WorkingDayDto to WorkingDay expected by AvailabilitySettings
                    const mappedWorkingDays = (res.data.workingDays || [])
                        .filter((wd: any) => wd.isAvailable)
                        .map((wd: any) => ({
                            dayOfWeek: daysMap[wd.day] ?? 0,
                            startTime: wd.startTime,
                            endTime: wd.endTime,
                            type: wd.type || 'CLINIC',
                        }));

                    setAvailabilityData({ ...res.data, workingDays: mappedWorkingDays });
                    setSlotConfig(res.data.slotConfiguration);
                }
            })
            .catch(() => {});
    };

    useEffect(() => {
        loadAvailability();
    }, []);

    if (!currentData) {
        return <div className="flex items-center justify-center h-[50vh]"><p className="text-muted-foreground">Profile not available.</p></div>;
    }

    const doctor = currentData;
    const initials = doctor.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? '';

    const parsedFee = (() => {
        const trimmed = feeDraft.trim();
        if (trimmed === '') return 0;
        const v = Number(trimmed);
        if (!Number.isFinite(v) || v < 0) return null;
        return v;
    })();

    const saveConsultationFee = async () => {
        if (parsedFee === null) {
            toast.error('Enter a valid consultation fee');
            return;
        }
        setSavingFee(true);
        try {
            const res = await doctorApi.updateProfile({ consultationFee: parsedFee });
            if (!res.success) {
                toast.error(res.error || 'Failed to update consultation fee');
                return;
            }
            toast.success('Consultation fee updated');
            await invalidateProfile();
        } finally {
            setSavingFee(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-base font-semibold text-stone-900">Profile</h1>
                    <p className="text-xs text-stone-500">Doctor account and billing settings</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs rounded-none" 
                        id="tour-schedule-link"
                        onClick={() => setShowAvailabilitySheet(true)}
                    >
                        Schedule
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs rounded-none"
                        onClick={() => setShowAccountSettings(true)}
                        id="tour-account-settings-btn"
                    >
                        Account
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs rounded-none"
                        onClick={() => setShowEditDialog(true)}
                        id="tour-edit-profile-btn"
                    >
                        Edit
                    </Button>
                </div>
            </div>

            {/* Onboarding (non-aggressive, profile-first) */}
            {doctor.onboardingStatus && doctor.onboardingStatus !== 'ACTIVE' ? (
                <TooltipProvider>
                    <Card className="border-stone-200">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <CardTitle className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                                        Complete onboarding
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-50"
                                                    aria-label="Onboarding help"
                                                >
                                                    <Info className="h-4 w-4" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="max-w-[280px]">
                                                Complete the required profile items on this page. When they’re done, we’ll automatically mark your profile as completed.
                                            </TooltipContent>
                                        </Tooltip>
                                    </CardTitle>
                                    <CardDescription className="text-xs text-stone-500 mt-1">
                                        Status: <span className="font-medium text-stone-700">{doctor.onboardingStatus.replaceAll('_', ' ')}</span>
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs rounded-none shrink-0"
                                    onClick={() => setShowEditDialog(true)}
                                >
                                    Edit Profile
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="rounded-md border border-stone-200 p-3">
                                    <div className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Clinic Location</div>
                                    <div className="text-xs mt-1 text-stone-700">{doctor.clinicLocation?.trim() ? 'Done' : 'Missing'}</div>
                                </div>
                                <div className="rounded-md border border-stone-200 p-3">
                                    <div className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Consultation Fee</div>
                                    <div className="text-xs mt-1 text-stone-700">{(doctor.consultationFee ?? 0) > 0 ? 'Done' : 'Missing'}</div>
                                </div>
                                <div className="rounded-md border border-stone-200 p-3">
                                    <div className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Bio / Education</div>
                                    <div className="text-xs mt-1 text-stone-700">
                                        {(doctor.bio?.trim() || doctor.education?.trim() || doctor.focusAreas?.trim() || doctor.professionalAffiliations?.trim())
                                            ? 'Done'
                                            : 'Missing'}
                                    </div>
                                </div>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-3">
                                You can configure availability later via the Schedule page.
                            </p>
                        </CardContent>
                    </Card>
                </TooltipProvider>
            ) : null}

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

            {/* Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Slot Settings */}
                <Card className="border-stone-200">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold">Appointment slots</CardTitle>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs rounded-none"
                                onClick={() => setShowAvailabilitySheet(true)}
                            >
                                {slotConfig ? "Manage" : "Set up schedule"}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {slotConfig ? (
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Duration', value: `${slotConfig.defaultDuration} min` },
                                    { label: 'Buffer', value: `${slotConfig.bufferTime} min` },
                                    { label: 'Interval', value: `${slotConfig.slotInterval} min` },
                                ].map(item => (
                                    <div key={item.label} className="border border-stone-200 p-3 text-center">
                                        <p className="text-base font-semibold text-stone-900 tabular-nums">{item.value}</p>
                                        <p className="text-[10px] text-stone-500 mt-0.5 uppercase tracking-wide">{item.label}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-stone-500 text-center py-3">
                                Not configured.{' '}
                                <button 
                                    type="button"
                                    onClick={() => setShowAvailabilitySheet(true)} 
                                    className="text-stone-700 underline hover:text-stone-900"
                                >
                                    Set up schedule
                                </button>
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Billing Settings (Consultation Fee) */}
                <Card className="border-stone-200" id="tour-billing-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Billing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <div className="text-xs text-stone-500">Default consultation fee (KSH)</div>
                            <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-end">
                                <div className="flex-1">
                                    <Input
                                        value={feeDraft}
                                        onChange={(e) => setFeeDraft(e.target.value)}
                                        inputMode="numeric"
                                        className="h-9 rounded-none border-stone-200"
                                        placeholder="0"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-none"
                                    onClick={saveConsultationFee}
                                    disabled={savingFee}
                                >
                                    {savingFee ? 'Saving…' : 'Save'}
                                </Button>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-2">
                                Applied automatically to the charge sheet when completing a consultation (unless itemized billing is provided).
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

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

            {/* Manage Availability */}
            <ManageAvailabilitySheet
                open={showAvailabilitySheet}
                onClose={() => setShowAvailabilitySheet(false)}
                onSuccess={() => {
                    loadAvailability();
                    invalidateProfile();
                }}
                userId={currentData.id}
                initialWorkingDays={availabilityData?.workingDays}
                initialSlotConfig={availabilityData?.slotConfiguration}
            />
        </div>
    );
}
