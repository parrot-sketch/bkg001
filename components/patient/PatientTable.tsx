'use client';

/**
 * Patient Table Component
 * 
 * Clean, table-based view for displaying patients in a structured format.
 * Optimized for large screens with responsive fallback to cards on mobile.
 * 
 * Used by: Doctor patients page, Frontdesk patients page
 */

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileImage } from '@/components/profile-image';
import { 
  Users, 
  Search, 
  Eye, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin,
  Clock,
  User,
  FileText,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { calculateAge } from '@/lib/utils';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

interface PatientTableProps {
  patients: PatientResponseDto[];
  appointments?: AppointmentResponseDto[]; // Optional: appointments for each patient
  loading?: boolean;
  onViewPatient?: (patientId: string) => void;
  onScheduleAppointment?: (patientId: string) => void;
  showActions?: boolean;
  role?: 'doctor' | 'frontdesk' | 'nurse';
}

export function PatientTable({
  patients,
  appointments = [],
  loading = false,
  onViewPatient,
  onScheduleAppointment,
  showActions = true,
  role = 'frontdesk',
}: PatientTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter patients based on search query
  const filteredPatients = patients.filter((patient) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      patient.firstName?.toLowerCase().includes(query) ||
      patient.lastName?.toLowerCase().includes(query) ||
      patient.email?.toLowerCase().includes(query) ||
      patient.phone?.toLowerCase().includes(query) ||
      patient.fileNumber?.toLowerCase().includes(query)
    );
  });

  // Helper to get patient's latest appointment
  const getPatientAppointment = (patientId: string): AppointmentResponseDto | undefined => {
    return appointments.find((apt) => apt.patientId === patientId);
  };

  // Helper to get patient's appointment count
  const getPatientAppointmentCount = (patientId: string): number => {
    return appointments.filter((apt) => apt.patientId === patientId).length;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading patients...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredPatients.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No patients found matching your search' : 'No patients found'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients by name, email, phone, or file number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table View (>= 768px) */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Patients ({filteredPatients.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider min-w-[200px]">
                    Patient
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                    File Number
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider min-w-[180px]">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell min-w-[200px]">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell min-w-[140px]">
                    Last Visit
                  </th>
                  {role === 'doctor' && (
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell min-w-[120px]">
                      Appointments
                    </th>
                  )}
                  {showActions && (
                    <th className="px-6 py-4 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider min-w-[200px]">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPatients.map((patient) => {
                  const latestAppointment = getPatientAppointment(patient.id);
                  const appointmentCount = getPatientAppointmentCount(patient.id);
                  const patientName = `${patient.firstName} ${patient.lastName}`;

                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-muted/50 transition-colors duration-150 group"
                    >
                      {/* Patient Name & Avatar */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <ProfileImage
                              url={patient.profileImage}
                              name={patientName}
                              bgColor={patient.colorCode}
                              textClassName="text-white font-semibold"
                            />
                            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-brand-secondary border-2 border-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-foreground truncate">
                              {patientName}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-muted-foreground capitalize">
                                {patient.gender?.toLowerCase()}
                              </span>
                              <span className="text-muted-foreground/50">•</span>
                              <span className="text-sm text-muted-foreground">
                                {patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : 'N/A'} years
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* File Number */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-foreground bg-muted px-3 py-1 rounded-md">
                            {patient.fileNumber || 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-5">
                        <div className="space-y-2">
                          {patient.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3.5 w-3.5 text-brand-secondary flex-shrink-0" />
                              <a href={`tel:${patient.phone}`} className="truncate max-w-[220px] hover:text-primary">
                                {patient.phone}
                              </a>
                            </div>
                          )}
                          {patient.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3.5 w-3.5 text-brand-secondary flex-shrink-0" />
                              <a href={`mailto:${patient.email}`} className="truncate max-w-[220px] hover:text-primary">
                                {patient.email}
                              </a>
                            </div>
                          )}
                          {!patient.phone && !patient.email && (
                            <span className="text-sm text-muted-foreground/70 italic">No contact info</span>
                          )}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="px-6 py-5 hidden lg:table-cell">
                        {patient.address ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 text-brand-secondary flex-shrink-0" />
                            <span className="truncate max-w-[280px]">{patient.address}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground/70 italic">Not provided</span>
                        )}
                      </td>

                      {/* Last Visit */}
                      <td className="px-6 py-5 hidden xl:table-cell">
                        {latestAppointment ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 text-brand-secondary" />
                            <span>
                              {format(new Date(latestAppointment.appointmentDate), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground/70 italic">No visits yet</span>
                        )}
                      </td>

                      {/* Appointments Count (Doctor only) */}
                      {role === 'doctor' && (
                        <td className="px-6 py-5 hidden xl:table-cell">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {appointmentCount}
                            </Badge>
                          </div>
                        </td>
                      )}

                      {/* Actions */}
                      {showActions && (
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-center gap-2">
                            {onViewPatient ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onViewPatient(patient.id)}
                                className="min-h-[36px]"
                              >
                                <Eye className="h-4 w-4 mr-1.5" />
                                View
                              </Button>
                            ) : (
                              <Link href={role === 'doctor' ? `/doctor/patients/${patient.id}` : `/frontdesk/patient/${patient.id}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="min-h-[36px]"
                                >
                                  <Eye className="h-4 w-4 mr-1.5" />
                                  View
                                </Button>
                              </Link>
                            )}
                            {onScheduleAppointment ? (
                              <Button
                                size="sm"
                                onClick={() => onScheduleAppointment(patient.id)}
                                className="bg-brand-secondary hover:bg-brand-secondary/90 text-white min-h-[36px]"
                              >
                                <Calendar className="h-4 w-4 mr-1.5" />
                                Schedule
                              </Button>
                            ) : (
                              <Link href={`/frontdesk/appointments?patientId=${patient.id}`}>
                                <Button
                                  size="sm"
                                  className="bg-brand-secondary hover:bg-brand-secondary/90 text-white min-h-[36px]"
                                >
                                  <Calendar className="h-4 w-4 mr-1.5" />
                                  Schedule
                                </Button>
                              </Link>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Card View (< 768px) */}
      <div className="md:hidden space-y-4">
        {filteredPatients.map((patient) => {
          const latestAppointment = getPatientAppointment(patient.id);
          const appointmentCount = getPatientAppointmentCount(patient.id);
          const patientName = `${patient.firstName} ${patient.lastName}`;

          return (
            <Card key={patient.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Patient Header */}
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <ProfileImage
                        url={patient.profileImage}
                        name={patientName}
                        bgColor={patient.colorCode}
                        textClassName="text-white font-semibold"
                      />
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-brand-secondary border-2 border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground truncate">
                        {patientName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-sm text-muted-foreground capitalize">
                          {patient.gender?.toLowerCase()}
                        </span>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-sm text-muted-foreground">
                          {patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : 'N/A'} years
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* File Number */}
                  <div>
                    <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-1 rounded">
                      {patient.fileNumber || 'N/A'}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5">
                    {patient.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 text-brand-secondary flex-shrink-0" />
                        <a href={`tel:${patient.phone}`} className="truncate">{patient.phone}</a>
                      </div>
                    )}
                    {patient.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 text-brand-secondary flex-shrink-0" />
                        <a href={`mailto:${patient.email}`} className="truncate">{patient.email}</a>
                      </div>
                    )}
                  </div>

                  {/* Last Visit */}
                  {latestAppointment && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 text-brand-secondary flex-shrink-0" />
                      <span>Last visit: {format(new Date(latestAppointment.appointmentDate), 'MMM dd, yyyy')}</span>
                    </div>
                  )}

                  {/* Appointments Count (Doctor only) */}
                  {role === 'doctor' && appointmentCount > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 text-brand-secondary flex-shrink-0" />
                      <span>{appointmentCount} appointment{appointmentCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}

                  {/* Actions */}
                  {showActions && (
                    <div className="flex flex-col gap-2 pt-2 border-t">
                      {onViewPatient ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewPatient(patient.id)}
                          className="w-full min-h-[44px]"
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          View Profile
                        </Button>
                      ) : (
                        <Link href={role === 'doctor' ? `/doctor/patients/${patient.id}` : `/frontdesk/patient/${patient.id}`} className="w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full min-h-[44px]"
                          >
                            <Eye className="h-4 w-4 mr-1.5" />
                            View Profile
                          </Button>
                        </Link>
                      )}
                      {onScheduleAppointment ? (
                        <Button
                          size="sm"
                          onClick={() => onScheduleAppointment(patient.id)}
                          className="w-full min-h-[44px] bg-brand-secondary hover:bg-brand-secondary/90 text-white"
                        >
                          <Calendar className="h-4 w-4 mr-1.5" />
                          Schedule Appointment
                        </Button>
                      ) : (
                        <Link href={`/frontdesk/appointments?patientId=${patient.id}`} className="w-full">
                          <Button
                            size="sm"
                            className="w-full min-h-[44px] bg-brand-secondary hover:bg-brand-secondary/90 text-white"
                          >
                            <Calendar className="h-4 w-4 mr-1.5" />
                            Schedule Appointment
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
