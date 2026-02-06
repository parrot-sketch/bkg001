'use client';

/**
 * Public Doctor Profile View
 * 
 * Read-only profile view for public visitors.
 * Displays doctor's professional information and booking CTA.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    GraduationCap,
    Award,
    Building2,
    MapPin,
    Globe,
    Clock,
    DollarSign,
    Calendar
} from 'lucide-react';
import Link from 'next/link';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

interface PublicDoctorProfileViewProps {
    doctor: DoctorResponseDto;
}

export function PublicDoctorProfileView({ doctor }: PublicDoctorProfileViewProps) {
    const initials = `${doctor.firstName?.[0] || ''}${doctor.lastName?.[0] || ''}`.toUpperCase();

    return (
        <div className="container mx-auto py-12 px-4 max-w-5xl">
            {/* Header Section */}
            <Card className="mb-8">
                <CardContent className="pt-8">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        {/* Avatar */}
                        <Avatar className="h-32 w-32">
                            <AvatarImage src={doctor.profileImage} alt={doctor.name} />
                            <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold mb-2">
                                        {doctor.title ? `${doctor.title} ` : ''}{doctor.name}
                                    </h1>
                                    <Badge variant="secondary" className="mb-4">
                                        {doctor.specialization}
                                    </Badge>
                                </div>
                            </div>

                            {/* Quick Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                {doctor.yearsOfExperience && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span>{doctor.yearsOfExperience} years of experience</span>
                                    </div>
                                )}
                                {doctor.languages && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Globe className="h-4 w-4 text-muted-foreground" />
                                        <span>{doctor.languages}</span>
                                    </div>
                                )}
                                {doctor.clinicLocation && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span>{doctor.clinicLocation}</span>
                                    </div>
                                )}
                                {doctor.consultationFee && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                        <span>KES {doctor.consultationFee.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* CTA */}
                            <div className="mt-6">
                                <Link href={`/patient/appointments/book?doctor=${doctor.id}`}>
                                    <Button size="lg" className="w-full md:w-auto">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Book Appointment
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Professional Information */}
            <div className="grid gap-6">
                {doctor.bio && (
                    <Card>
                        <CardHeader>
                            <CardTitle>About</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground whitespace-pre-wrap">{doctor.bio}</p>
                        </CardContent>
                    </Card>
                )}

                {doctor.education && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <GraduationCap className="h-5 w-5" />
                                Education & Qualifications
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground whitespace-pre-wrap">{doctor.education}</p>
                        </CardContent>
                    </Card>
                )}

                {doctor.focusAreas && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="h-5 w-5" />
                                Areas of Expertise
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground whitespace-pre-wrap">{doctor.focusAreas}</p>
                        </CardContent>
                    </Card>
                )}

                {doctor.professionalAffiliations && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Professional Affiliations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground whitespace-pre-wrap">
                                {doctor.professionalAffiliations}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
