'use client';

/**
 * Doctor Profile Modal
 * 
 * Modal component for viewing full doctor profile details.
 * Displays name, title, bio, education, focus areas, affiliations, and clinic location.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, GraduationCap, Target, Award, MapPin, X } from 'lucide-react';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

interface DoctorProfileModalProps {
  open: boolean;
  onClose: () => void;
  doctor: DoctorResponseDto | null;
  loading?: boolean;
}

export function DoctorProfileModal({ open, onClose, doctor, loading = false }: DoctorProfileModalProps) {
  if (!doctor && !loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-playfair-display text-xl sm:text-2xl text-foreground">
            Doctor Profile
          </DialogTitle>
          <DialogDescription className="text-sm">Complete professional profile and expertise</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="ml-3 text-muted-foreground">Loading profile...</p>
          </div>
        ) : doctor ? (
          <div className="space-y-6 py-4">
            {/* Header Section - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-4 border-b pb-4">
              {doctor.profileImage ? (
                <img
                  src={doctor.profileImage}
                  alt={`${doctor.firstName} ${doctor.lastName}`}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-accent flex-shrink-0 mx-auto sm:mx-0"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary flex items-center justify-center border-2 border-accent flex-shrink-0 mx-auto sm:mx-0">
                  <User className="h-10 w-10 sm:h-12 sm:w-12 text-primary-foreground" />
                </div>
              )}
              <div className="flex-1 text-center sm:text-left w-full">
                <h3 className="font-playfair-display text-xl sm:text-2xl font-bold text-foreground">
                  {doctor.title} {doctor.firstName} {doctor.lastName}
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground mt-1">{doctor.specialization}</p>
                {doctor.clinicLocation && (
                  <div className="flex items-center justify-center sm:justify-start mt-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-1" />
                    {doctor.clinicLocation}
                  </div>
                )}
              </div>
            </div>

            {/* Bio Section */}
            {doctor.bio && (
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Biography
                </h4>
                <p className="text-sm text-foreground leading-relaxed">{doctor.bio}</p>
              </div>
            )}

            {/* Education Section */}
            {doctor.education && (
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Education & Qualifications
                </h4>
                <p className="text-sm text-foreground leading-relaxed">{doctor.education}</p>
              </div>
            )}

            {/* Focus Areas Section */}
            {doctor.focusAreas && (
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  Focus Areas
                </h4>
                <p className="text-sm text-foreground leading-relaxed">{doctor.focusAreas}</p>
              </div>
            )}

            {/* Professional Affiliations Section */}
            {doctor.professionalAffiliations && (
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center">
                  <Award className="h-4 w-4 mr-2" />
                  Professional Affiliations
                </h4>
                <p className="text-sm text-foreground leading-relaxed">{doctor.professionalAffiliations}</p>
              </div>
            )}

            {/* Contact Info */}
            <div className="border-t pt-4 space-y-2">
              <h4 className="font-semibold text-foreground">Contact Information</h4>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Email:</span> {doctor.email}
                </p>
                <p>
                  <span className="font-medium">Phone:</span> {doctor.phone}
                </p>
                {doctor.address && (
                  <p>
                    <span className="font-medium">Address:</span> {doctor.address}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
