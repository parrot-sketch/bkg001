'use client';

/**
 * Doctor Profile View Component
 * 
 * Logic-less UI component that receives data as props.
 * Handles dialog state and client-side interactions.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Settings, GraduationCap, Award, Building2, User, Globe, DollarSign, Clock, UserCog } from 'lucide-react';
import Link from 'next/link';
import { EditDoctorProfileSheet } from '@/components/doctor/EditDoctorProfileSheet';
import { AccountSettingsSheet } from '@/components/settings/AccountSettingsSheet';
import { DoctorIdentityCard } from '@/components/doctor/DoctorIdentityCard';
import { ProfileActionsPanel } from '@/components/doctor/ProfileActionsPanel';
import { WeeklyAvailabilityGrid } from '@/components/doctor/WeeklyAvailabilityGrid';
import { ActivitySnapshot } from '@/components/doctor/ActivitySnapshot';

interface DoctorProfileViewProps {
    doctorData: any;
    availability: any;
    appointments: any[];
    todayAppointments: any[];
    upcomingAppointments: any[];
}

export function DoctorProfileView({
    doctorData,
    availability,
    appointments = [],
    todayAppointments = [],
    upcomingAppointments = []
}: DoctorProfileViewProps) {
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showAccountSettings, setShowAccountSettings] = useState(false);
    const [currentDoctorData, setCurrentDoctorData] = useState(doctorData); // Local state for immediate updates

    const handleProfileUpdate = () => {
        // Ideally, we'd trigger a server revalidatePath or fetch new data here.
        // For now, we rely on page reload or the dialog's success handling.
        window.location.reload();
    };

    if (!currentDoctorData) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <p className="text-muted-foreground">Profile data not available.</p>
            </div>
        );
    }

    const workingDays = currentDoctorData.workingDays || [];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Doctor Profile</h1>
                    <p className="mt-2 text-muted-foreground">Your professional profile and clinical dashboard</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/doctor/schedule">
                        <Button
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <Settings className="h-4 w-4" />
                            Manage Schedule
                        </Button>
                    </Link>
                    <Button
                        variant="outline"
                        onClick={() => setShowAccountSettings(true)}
                        className="flex items-center gap-2"
                    >
                        <UserCog className="h-4 w-4" />
                        Account Settings
                    </Button>
                    <Button
                        onClick={() => setShowEditDialog(true)}
                        className="flex items-center gap-2"
                    >
                        <Edit className="h-4 w-4" />
                        Edit Profile
                    </Button>
                </div>
            </div>

            {/* Section 1: Doctor Identity Card */}
            <DoctorIdentityCard
                doctor={currentDoctorData}
                workingDays={workingDays}
                totalAppointments={appointments.length}
            />

            {/* Section 2: Profile Actions & Schedule Overview */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Profile Actions Panel */}
                <div className="lg:col-span-1">
                    <ProfileActionsPanel
                        onEditProfile={() => setShowEditDialog(true)}
                        doctorId={currentDoctorData.id}
                    />
                </div>

                {/* Schedule Overview */}
                <div className="lg:col-span-2">
                    <WeeklyAvailabilityGrid
                        availability={availability}
                        appointments={appointments}
                    />
                </div>
            </div>

            {/* Section 3: Activity Snapshot */}
            <ActivitySnapshot
                todayAppointments={todayAppointments}
                upcomingAppointments={upcomingAppointments}
                loading={false}
            />

            {/* Section 4: Professional Information */}
            {(currentDoctorData.bio || currentDoctorData.education || currentDoctorData.focusAreas || currentDoctorData.professionalAffiliations) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Professional Information</CardTitle>
                        <CardDescription>Your qualifications and expertise</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {currentDoctorData.bio && (
                            <div>
                                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Biography
                                </h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentDoctorData.bio}</p>
                            </div>
                        )}

                        {currentDoctorData.education && (
                            <div>
                                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4" />
                                    Education
                                </h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentDoctorData.education}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentDoctorData.yearsOfExperience && (
                                <div>
                                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        Experience
                                    </h3>
                                    <p className="text-sm text-muted-foreground">{currentDoctorData.yearsOfExperience} Years</p>
                                </div>
                            )}

                            {currentDoctorData.languages && (
                                <div>
                                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <Globe className="h-4 w-4" />
                                        Languages
                                    </h3>
                                    <p className="text-sm text-muted-foreground">{currentDoctorData.languages}</p>
                                </div>
                            )}
                        </div>

                        {currentDoctorData.focusAreas && (
                            <div>
                                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Award className="h-4 w-4" />
                                    Focus Areas
                                </h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentDoctorData.focusAreas}</p>
                            </div>
                        )}

                        {currentDoctorData.professionalAffiliations && (
                            <div>
                                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Professional Affiliations
                                </h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {currentDoctorData.professionalAffiliations}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
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
