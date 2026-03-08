'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Play, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

interface AppointmentsTabProps {
  appointments: AppointmentResponseDto[];
  hasActiveConsultation: (id: number) => boolean;
  onStartConsultation: (appointment: AppointmentResponseDto) => void;
  onContinueConsultation: (id: number) => void;
}

export function AppointmentsTab({
  appointments,
  hasActiveConsultation,
  onStartConsultation,
  onContinueConsultation,
}: AppointmentsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appointments</CardTitle>
        <CardDescription>Patient's appointment history and upcoming visits</CardDescription>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No appointments found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">
                      {format(new Date(apt.appointmentDate), 'EEEE, MMMM dd, yyyy')}
                    </span>
                    <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                    <span className="text-sm text-muted-foreground">{apt.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{apt.type}</p>
                  {apt.note && (
                    <p className="text-sm text-muted-foreground mt-1 italic">{apt.note}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      apt.status === AppointmentStatus.COMPLETED
                        ? 'default'
                        : apt.status === AppointmentStatus.SCHEDULED
                          ? 'default'
                          : 'secondary'
                    }
                  >
                    {apt.status}
                  </Badge>
                  {hasActiveConsultation(apt.id) ? (
                    <Button
                      size="sm"
                      onClick={() => onContinueConsultation(apt.id)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Continue
                    </Button>
                  ) : apt.status === AppointmentStatus.SCHEDULED ? (
                    <Button
                      size="sm"
                      onClick={() => onStartConsultation(apt)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  ) : null}
                  <Link href={`/doctor/cases/${apt.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
