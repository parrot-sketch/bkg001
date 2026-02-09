'use client';

/**
 * Doctor Profile View Component
 * 
 * Premium profile page for doctors. Shows identity hero, professional
 * credentials, weekly schedule, and activity snapshot.
 * 
 * Receives server-fetched data via props (no client-side data fetching).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    ExternalLink,
    Shield,
    ArrowRight,
    Briefcase,
    Hash,
    Camera,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { EditDoctorProfileSheet } from '@/components/doctor/EditDoctorProfileSheet';
import { AccountSettingsSheet } from '@/components/settings/AccountSettingsSheet';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

// ============================================================================
// TYPES
// ============================================================================

interface DoctorProfileViewProps {
    doctorData: any;
    availability: any;
    appointments: any[];
    todayAppointments: any[];
    upcomingAppointments: any[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DoctorProfileView({
    doctorData,
    availability,
    appointments = [],
    todayAppointments = [],
    upcomingAppointments = []
}: DoctorProfileViewProps) {
    const router = useRouter();
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showAccountSettings, setShowAccountSettings] = useState(false);
    const [currentDoctorData, setCurrentDoctorData] = useState(doctorData);

    const handleProfileUpdate = () => {
        // router.refresh() re-fetches Server Component data WITHOUT a full page reload.
        // This avoids destroying all client state, is faster, and re-runs only
        // the server-side queries (not the entire JS bundle).
        router.refresh();
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

    const workingDays = doctor.workingDays || [];
    const availabilityDays = availability?.workingDays || [];

    // Stats
    const todayCount = todayAppointments.length;
    const upcomingCount = upcomingAppointments.length;
    const totalAppointments = appointments.length;
    const workingDaysCount = availabilityDays.filter((d: any) => d.isAvailable).length;

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

                            {/* Stat Chips */}
                            <div className="flex items-center gap-3 mt-5 flex-wrap">
                                {[
                                    { label: 'Today', value: todayCount, color: 'bg-blue-500/20 text-blue-300 border-blue-400/30' },
                                    { label: 'Upcoming', value: upcomingCount, color: 'bg-amber-500/20 text-amber-300 border-amber-400/30' },
                                    { label: 'Total Appts', value: totalAppointments, color: 'bg-white/10 text-white/80 border-white/20' },
                                    { label: 'Working Days', value: `${workingDaysCount}/7`, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' },
                                ].map((stat) => (
                                    <div
                                        key={stat.label}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${stat.color}`}
                                    >
                                        <span className="font-bold text-sm mr-1">{stat.value}</span>
                                        {stat.label}
                                    </div>
                                ))}
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

            {/* ================================================================ */}
            {/* SCHEDULE OVERVIEW — Weekly Availability                           */}
            {/* ================================================================ */}
            <Card className="border-slate-200">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                Weekly Schedule
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">Your availability and appointment load</p>
                        </div>
                        <Link href="/doctor/schedule">
                            <Button variant="outline" size="sm" className="text-xs">
                                <Settings className="h-3.5 w-3.5 mr-1.5" />
                                Manage
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent>
                    <WeeklyScheduleStrip
                        availabilityDays={availabilityDays}
                        appointments={appointments}
                    />
                </CardContent>
            </Card>

            {/* ================================================================ */}
            {/* ACTIVITY SNAPSHOT — Today + Upcoming                              */}
            {/* ================================================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Today */}
                <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                Today&apos;s Appointments
                            </CardTitle>
                            <Badge variant="outline" className="text-xs">{todayCount}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {todayAppointments.length > 0 ? (
                            <div className="space-y-2">
                                {todayAppointments.slice(0, 4).map((apt: AppointmentResponseDto) => (
                                    <AppointmentMiniCard key={apt.id} appointment={apt} />
                                ))}
                                {todayAppointments.length > 4 && (
                                    <p className="text-xs text-center text-slate-400 pt-1">
                                        +{todayAppointments.length - 4} more
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Calendar className="h-8 w-8 text-slate-300 mb-2" />
                                <p className="text-sm text-slate-400">No appointments today</p>
                            </div>
                        )}
                        <Link href="/doctor/appointments" className="block mt-4">
                            <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500 hover:text-slate-900">
                                View All Appointments
                                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* Upcoming */}
                <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-400" />
                                Upcoming (Next 7 Days)
                            </CardTitle>
                            <Badge variant="outline" className="text-xs">{upcomingCount}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {upcomingAppointments.length > 0 ? (
                            <div className="space-y-2">
                                {upcomingAppointments.slice(0, 4).map((apt: AppointmentResponseDto) => (
                                    <AppointmentMiniCard key={apt.id} appointment={apt} showDate />
                                ))}
                                {upcomingAppointments.length > 4 && (
                                    <p className="text-xs text-center text-slate-400 pt-1">
                                        +{upcomingAppointments.length - 4} more
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Clock className="h-8 w-8 text-slate-300 mb-2" />
                                <p className="text-sm text-slate-400">No upcoming appointments</p>
                            </div>
                        )}
                        <Link href="/doctor/appointments" className="block mt-4">
                            <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500 hover:text-slate-900">
                                View All Appointments
                                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

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

// ============================================================================
// INLINE SUB-COMPONENTS
// ============================================================================

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBREV = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function WeeklyScheduleStrip({
    availabilityDays,
    appointments,
}: {
    availabilityDays: any[];
    appointments: AppointmentResponseDto[];
}) {
    const getWorkingDayInfo = (dayName: string) => {
        return availabilityDays.find((wd: any) => {
            const wdDay = wd.day || wd.day_of_week;
            return wdDay?.toLowerCase() === dayName.toLowerCase();
        });
    };

    const getAppointmentsForDay = (dayName: string) => {
        const today = new Date();
        const dayIndex = DAYS_OF_WEEK.indexOf(dayName);
        if (dayIndex === -1) return 0;
        const jsDay = (dayIndex + 1) % 7; // Monday=1 ... Sunday=0
        const daysUntil = (jsDay - today.getDay() + 7) % 7 || 7;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysUntil);
        const dateStr = format(targetDate, 'yyyy-MM-dd');
        return appointments.filter((apt) => format(new Date(apt.appointmentDate), 'yyyy-MM-dd') === dateStr).length;
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((dayName, index) => {
                    const wd = getWorkingDayInfo(dayName);
                    const isAvailable = wd?.isAvailable ?? false;
                    const aptCount = getAppointmentsForDay(dayName);
                    const startTime = wd?.startTime || wd?.start_time;
                    const endTime = wd?.endTime || wd?.end_time;

                    return (
                        <div
                            key={dayName}
                            className={`relative rounded-xl p-3 text-center border transition-colors ${
                                isAvailable
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : 'bg-slate-50 border-slate-100'
                            }`}
                        >
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${
                                isAvailable ? 'text-emerald-700' : 'text-slate-400'
                            }`}>
                                {DAY_ABBREV[index]}
                            </p>
                            {isAvailable && startTime && endTime ? (
                                <>
                                    <p className="text-[10px] text-emerald-600 font-medium">
                                        {startTime}–{endTime}
                                    </p>
                                    <div className="mt-2 pt-2 border-t border-emerald-100">
                                        <p className="text-lg font-bold text-emerald-800 leading-none">{aptCount}</p>
                                        <p className="text-[10px] text-emerald-500 mt-0.5">appts</p>
                                    </div>
                                </>
                            ) : (
                                <p className="text-[10px] text-slate-400 mt-1">Off</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded bg-emerald-200" />
                        Available
                    </span>
                    <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded bg-slate-200" />
                        Off
                    </span>
                </div>
                <span>{totalAvailableDays(availabilityDays)} days/week · {appointments.length} total appointments</span>
            </div>
        </div>
    );
}

function totalAvailableDays(days: any[]): number {
    return days.filter((d: any) => d.isAvailable).length;
}

function AppointmentMiniCard({
    appointment,
    showDate = false,
}: {
    appointment: AppointmentResponseDto;
    showDate?: boolean;
}) {
    const statusConfig = getStatusConfig(appointment.status);
    const patientName = appointment.patient
        ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
        : `Patient`;

    return (
        <Link href={`/doctor/appointments/${appointment.id}`}>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 transition-all cursor-pointer group">
                {/* Time */}
                <div className="flex-shrink-0 text-center min-w-[52px]">
                    <p className="text-sm font-bold text-slate-900 leading-none">{appointment.time}</p>
                    {showDate && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                            {format(new Date(appointment.appointmentDate), 'MMM d')}
                        </p>
                    )}
                </div>

                {/* Dot */}
                <div className={`w-1 h-8 rounded-full flex-shrink-0 ${statusConfig.dot}`} />

                {/* Patient + Type */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{patientName}</p>
                    <p className="text-xs text-slate-400 truncate">{appointment.type}</p>
                </div>

                {/* Status */}
                <Badge variant="outline" className={`text-[10px] font-semibold flex-shrink-0 ${statusConfig.color} ${statusConfig.bg} border`}>
                    {statusConfig.label}
                </Badge>
            </div>
        </Link>
    );
}

function getStatusConfig(status: string) {
    const configs: Record<string, { label: string; color: string; bg: string; dot: string }> = {
        PENDING: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-400' },
        PENDING_DOCTOR_CONFIRMATION: { label: 'Awaiting', color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-400' },
        CONFIRMED: { label: 'Confirmed', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-400' },
        SCHEDULED: { label: 'Scheduled', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-400' },
        CHECKED_IN: { label: 'Checked In', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-400' },
        READY_FOR_CONSULTATION: { label: 'Ready', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
        IN_CONSULTATION: { label: 'In Consult', color: 'text-violet-700', bg: 'bg-violet-50', dot: 'bg-violet-500' },
        COMPLETED: { label: 'Done', color: 'text-slate-500', bg: 'bg-slate-50', dot: 'bg-slate-300' },
        CANCELLED: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-400' },
        NO_SHOW: { label: 'No Show', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-400' },
    };
    return configs[status] || { label: status, color: 'text-slate-500', bg: 'bg-slate-50', dot: 'bg-slate-300' };
}
