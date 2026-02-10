'use client';

/**
 * Doctor Profile View Component
 * 
 * Premium profile page for doctors. Shows identity hero, professional
 * credentials, and quick navigation links.
 * 
 * Schedule and appointment data live on their dedicated pages
 * (Dashboard, Availability) — this page focuses purely on identity.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Edit,
    Settings,
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
    Calendar,
    Users,
    Stethoscope,
    ChevronRight,
    Shield,
    Briefcase,
    Hash,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { EditDoctorProfileSheet } from '@/components/doctor/EditDoctorProfileSheet';
import { useInvalidateDoctorProfile } from '@/hooks/doctor/useDoctorProfile';
import { AccountSettingsSheet } from '@/components/settings/AccountSettingsSheet';

// ============================================================================
// TYPES
// ============================================================================

interface DoctorProfileViewProps {
    doctorData: any;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DoctorProfileView({
    doctorData,
}: DoctorProfileViewProps) {
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showAccountSettings, setShowAccountSettings] = useState(false);
    const [currentDoctorData, setCurrentDoctorData] = useState(doctorData);
    const { invalidateProfile } = useInvalidateDoctorProfile();

    // Sync props → local state when React Query delivers fresh data
    useEffect(() => {
        if (doctorData) setCurrentDoctorData(doctorData);
    }, [doctorData]);

    const handleProfileUpdate = () => {
        // Invalidate React Query cache → triggers background refetch.
        // The updated data flows in via props and the useEffect above syncs it.
        invalidateProfile();
    };

    if (!currentDoctorData) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <p className="text-muted-foreground">Profile data not available.</p>
            </div>
        );
    }

    const doctor = currentDoctorData;
    const initials = doctor.name
        ?.split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) ?? '';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ================================================================ */}
            {/* HERO SECTION — Identity + Quick Actions                          */}
            {/* ================================================================ */}
            <div className="relative rounded-2xl overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/15 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <div className="relative p-6 lg:p-8">
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Profile Image */}
                        <div className="flex-shrink-0 flex justify-center lg:justify-start">
                            {doctor.profileImage ? (
                                <div className="relative w-28 h-28 lg:w-36 lg:h-36 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-white/5 backdrop-blur-sm">
                                    <Image
                                        src={doctor.profileImage}
                                        alt={doctor.name}
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 768px) 112px, 144px"
                                        priority
                                    />
                                </div>
                            ) : (
                                <div
                                    className="w-28 h-28 lg:w-36 lg:h-36 rounded-2xl flex items-center justify-center text-white text-3xl lg:text-4xl font-bold border-2 border-white/20 shadow-2xl"
                                    style={{ backgroundColor: doctor.colorCode || '#4F46E5' }}
                                >
                                    {initials}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 text-white">
                            {/* Name + Specialization */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                                        {doctor.title ? `${doctor.title} ` : ''}{doctor.name}
                                    </h1>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <Badge className="bg-white/15 text-white border border-white/20 backdrop-blur-sm font-medium">
                                            <Award className="h-3.5 w-3.5 mr-1.5" />
                                            {doctor.specialization}
                                        </Badge>
                                        {doctor.licenseNumber && (
                                            <Badge variant="outline" className="text-white/70 border-white/20 text-xs">
                                                <Shield className="h-3 w-3 mr-1" />
                                                {doctor.licenseNumber}
                                            </Badge>
                                        )}
                                        {doctor.onboardingStatus === 'ACTIVE' && (
                                            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs">
                                                Active
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
                                        onClick={() => setShowAccountSettings(true)}
                                    >
                                        <UserCog className="h-4 w-4 mr-1.5" />
                                        Account
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => setShowEditDialog(true)}
                                        className="bg-white text-slate-900 hover:bg-white/90 font-semibold shadow-lg"
                                    >
                                        <Edit className="h-4 w-4 mr-1.5" />
                                        Edit Profile
                                    </Button>
                                </div>
                            </div>

                            {/* Contact Row */}
                            <div className="flex items-center gap-5 mt-4 text-sm text-white/60 flex-wrap">
                                {doctor.email && (
                                    <a href={`mailto:${doctor.email}`} className="flex items-center gap-1.5 hover:text-white/90 transition-colors">
                                        <Mail className="h-3.5 w-3.5" />
                                        {doctor.email}
                                    </a>
                                )}
                                {doctor.phone && (
                                    <a href={`tel:${doctor.phone}`} className="flex items-center gap-1.5 hover:text-white/90 transition-colors">
                                        <Phone className="h-3.5 w-3.5" />
                                        {doctor.phone}
                                    </a>
                                )}
                                {doctor.clinicLocation && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {doctor.clinicLocation}
                                    </span>
                                )}
                            </div>

                            {/* Profile Chips */}
                            <div className="flex items-center gap-3 mt-5 flex-wrap">
                                {doctor.yearsOfExperience && (
                                    <div className="px-3 py-1.5 rounded-lg border text-xs font-medium bg-white/10 text-white/80 border-white/20">
                                        <span className="font-bold text-sm mr-1">{doctor.yearsOfExperience}</span>
                                        Years Experience
                                    </div>
                                )}
                                {doctor.languages && (
                                    <div className="px-3 py-1.5 rounded-lg border text-xs font-medium bg-indigo-500/20 text-indigo-300 border-indigo-400/30">
                                        <Globe className="inline h-3 w-3 mr-1" />
                                        {doctor.languages}
                                    </div>
                                )}
                                {doctor.consultationFee != null && doctor.consultationFee > 0 && (
                                    <div className="px-3 py-1.5 rounded-lg border text-xs font-medium bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                                        <span className="font-bold text-sm mr-1">KSh {doctor.consultationFee.toLocaleString()}</span>
                                        Consultation
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================================================================ */}
            {/* QUICK NAVIGATION STRIP                                           */}
            {/* ================================================================ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Manage Schedule', icon: Settings, href: '/doctor/schedule', desc: 'Hours & availability' },
                    { label: 'Appointments', icon: Calendar, href: '/doctor/appointments', desc: 'View all appointments' },
                    { label: 'My Patients', icon: Users, href: '/doctor/patients', desc: 'Patient directory' },
                    { label: 'Dashboard', icon: Stethoscope, href: '/doctor/dashboard', desc: 'Clinical overview' },
                ].map((action) => (
                    <Link key={action.label} href={action.href}>
                        <div className="group flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer">
                            <div className="h-10 w-10 rounded-lg bg-slate-100 group-hover:bg-indigo-50 flex items-center justify-center transition-colors flex-shrink-0">
                                <action.icon className="h-5 w-5 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">{action.label}</p>
                                <p className="text-xs text-slate-400 truncate">{action.desc}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* ================================================================ */}
            {/* PROFESSIONAL INFORMATION                                          */}
            {/* ================================================================ */}
            {(doctor.bio || doctor.education || doctor.focusAreas || doctor.professionalAffiliations || doctor.yearsOfExperience || doctor.languages) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column — Bio & Education */}
                    <div className="space-y-5">
                        {doctor.bio && (
                            <Card className="border-slate-200">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <User className="h-4 w-4 text-slate-400" />
                                        Biography
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{doctor.bio}</p>
                                </CardContent>
                            </Card>
                        )}

                        {doctor.education && (
                            <Card className="border-slate-200">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4 text-slate-400" />
                                        Education & Training
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{doctor.education}</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right Column — Focus Areas, Affiliations, Quick Facts */}
                    <div className="space-y-5">
                        {/* Quick Facts */}
                        {(doctor.yearsOfExperience || doctor.languages || doctor.consultationFee) && (
                            <Card className="border-slate-200">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Briefcase className="h-4 w-4 text-slate-400" />
                                        Quick Facts
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {doctor.yearsOfExperience && (
                                        <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                            <span className="text-sm text-slate-500 flex items-center gap-2">
                                                <Clock className="h-4 w-4" />
                                                Experience
                                            </span>
                                            <span className="text-sm font-semibold text-slate-900">
                                                {doctor.yearsOfExperience} years
                                            </span>
                                        </div>
                                    )}
                                    {doctor.languages && (
                                        <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                            <span className="text-sm text-slate-500 flex items-center gap-2">
                                                <Globe className="h-4 w-4" />
                                                Languages
                                            </span>
                                            <span className="text-sm font-semibold text-slate-900">
                                                {doctor.languages}
                                            </span>
                                        </div>
                                    )}
                                    {doctor.consultationFee != null && doctor.consultationFee > 0 && (
                                        <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                            <span className="text-sm text-slate-500 flex items-center gap-2">
                                                <Hash className="h-4 w-4" />
                                                Consultation Fee
                                            </span>
                                            <span className="text-sm font-semibold text-slate-900">
                                                KSh {doctor.consultationFee.toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {doctor.focusAreas && (
                            <Card className="border-slate-200">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Award className="h-4 w-4 text-slate-400" />
                                        Focus Areas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {doctor.focusAreas.split(',').map((area: string, i: number) => (
                                            <Badge
                                                key={i}
                                                variant="outline"
                                                className="bg-indigo-50 text-indigo-700 border-indigo-200 font-medium"
                                            >
                                                {area.trim()}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {doctor.professionalAffiliations && (
                            <Card className="border-slate-200">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-slate-400" />
                                        Professional Affiliations
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {doctor.professionalAffiliations.split(',').map((aff: string, i: number) => (
                                            <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                                                <span>{aff.trim()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Profile Sheet */}
            {currentDoctorData && (
                <EditDoctorProfileSheet
                    open={showEditDialog}
                    onClose={() => setShowEditDialog(false)}
                    onSuccess={handleProfileUpdate}
                    doctor={currentDoctorData}
                />
            )}

            {/* Account Settings Sheet */}
            <AccountSettingsSheet
                open={showAccountSettings}
                onClose={() => setShowAccountSettings(false)}
                currentEmail={currentDoctorData.email}
            />
        </div>
    );
}

