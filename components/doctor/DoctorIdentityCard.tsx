'use client';

/**
 * Doctor Identity Card Component
 * 
 * Displays doctor's identity information prominently with proper image sizing.
 * Designed to fix the clipped image issue and provide a professional clinical appearance.
 */

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, MapPin, Award, GraduationCap } from 'lucide-react';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

interface DoctorIdentityCardProps {
  doctor: DoctorResponseDto;
  workingDays?: Array<{
    day: string;
    start_time: string;
    end_time: string;
  }>;
  totalAppointments?: number;
}

export function DoctorIdentityCard({
  doctor,
  workingDays = [],
  totalAppointments = 0,
}: DoctorIdentityCardProps) {
  const workingDaysCount = workingDays.length;

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Profile Image Section - Fixed to prevent clipping */}
          <div className="flex-shrink-0 flex justify-center lg:justify-start">
            {doctor.profileImage ? (
              <div className="relative w-32 h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg bg-gradient-to-br from-gray-50 to-gray-100">
                <Image
                  src={doctor.profileImage}
                  alt={doctor.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 128px, 160px"
                  priority
                />
              </div>
            ) : (
              <div
                className="w-32 h-32 lg:w-40 lg:h-40 rounded-full flex items-center justify-center text-white text-3xl lg:text-4xl font-semibold border-4 border-primary/20 shadow-lg"
                style={{ backgroundColor: doctor.colorCode || '#2563eb' }}
              >
                {doctor.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            )}
          </div>

          {/* Doctor Information Section */}
          <div className="flex-1 space-y-4">
            {/* Name and Title */}
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                {doctor.title ? `${doctor.title} ` : ''}{doctor.name}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                  <Award className="h-4 w-4 mr-1.5" />
                  {doctor.specialization}
                </span>
                {doctor.licenseNumber && (
                  <span className="text-sm text-muted-foreground">
                    License: {doctor.licenseNumber}
                  </span>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground">{doctor.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium text-foreground">{doctor.phone}</p>
                </div>
              </div>
              {doctor.clinicLocation && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium text-foreground">{doctor.clinicLocation}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4 pt-2 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{totalAppointments}</p>
                <p className="text-xs text-muted-foreground">Total Appointments</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{workingDaysCount}</p>
                <p className="text-xs text-muted-foreground">Working Days</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
