'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Heart, 
  AlertCircle, 
  CheckCircle2, 
  Shield 
} from 'lucide-react';
import { ProfileImage } from '@/components/profile-image';
import { calculateAge } from '@/lib/utils';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

interface PatientInfoSidebarProps {
  patient: PatientResponseDto;
  appointmentCount: number;
  upcomingCount: number;
}

export function PatientInfoSidebar({
  patient,
  appointmentCount,
  upcomingCount,
}: PatientInfoSidebarProps) {
  const patientName = `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="lg:col-span-1 space-y-6">
      {/* Patient Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <ProfileImage
              name={patientName}
              bgColor="#10b981"
              textClassName="text-white font-semibold"
            />
            <div className="flex-1">
              <CardTitle className="text-xl">{patientName}</CardTitle>
              <CardDescription className="mt-1">
                {patient.fileNumber} • {calculateAge(patient.dateOfBirth)} years • {patient.gender}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contact Info */}
          <div className="space-y-3">
            {patient.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${patient.phone}`} className="text-foreground hover:text-primary">
                  {patient.phone}
                </a>
              </div>
            )}
            {patient.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${patient.email}`} className="text-foreground hover:text-primary truncate">
                  {patient.email}
                </a>
              </div>
            )}
            {patient.address && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{patient.address}</span>
              </div>
            )}
          </div>

          {/* Medical Info */}
          <div className="pt-4 border-t space-y-3">
            {patient.bloodGroup && (
              <div className="flex items-center gap-3 text-sm">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Blood Group: <strong>{patient.bloodGroup}</strong></span>
              </div>
            )}
            {patient.allergies && (
              <div className="flex items-center gap-3 text-sm">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Allergies: <strong>{patient.allergies}</strong></span>
              </div>
            )}
            {!patient.allergies && (
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-foreground">No known allergies</span>
              </div>
            )}
          </div>

          {/* Consent Status */}
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-semibold text-foreground mb-2">Consent Status</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Privacy</span>
                <Badge variant={patient.hasPrivacyConsent ? "default" : "destructive"}>
                  {patient.hasPrivacyConsent ? 'Granted' : 'Pending'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Medical</span>
                <Badge variant={patient.hasMedicalConsent ? "default" : "destructive"}>
                  {patient.hasMedicalConsent ? 'Granted' : 'Pending'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Service</span>
                <Badge variant={patient.hasServiceConsent ? "default" : "destructive"}>
                  {patient.hasServiceConsent ? 'Granted' : 'Pending'}
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-3">
              <Shield className="h-4 w-4 mr-2" />
              Manage Consent
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Appointments</span>
            <Badge variant="outline">{appointmentCount}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Upcoming</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {upcomingCount}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
