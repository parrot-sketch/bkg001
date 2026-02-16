'use client';

/**
 * PendingConfirmationsSection
 * 
 * Displays appointments awaiting doctor confirmation on the dashboard.
 * Doctors can confirm, decline, or reschedule appointments booked by frontdesk.
 */

import { useState } from 'react';
import { format, parseISO, isToday, isTomorrow, differenceInDays, addMonths, endOfMonth } from 'date-fns';
import { Clock, User, AlertCircle, Check, X, Calendar, MessageSquare, RefreshCw, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { useAvailableSlots } from '@/hooks/useAvailableSlots';
import { useDoctorAvailableDates } from '@/hooks/useDoctorAvailableDates';
import { toast } from 'sonner';

interface PendingConfirmationsSectionProps {
  appointments: AppointmentResponseDto[];
  onConfirm: (appointmentId: number, notes?: string) => Promise<void>;
  onReject: (appointmentId: number, reason: string) => Promise<void>;
  onReschedule: (appointmentId: number, newDate: Date | string, newTime: string, reason?: string) => Promise<void>;
  isLoading?: boolean;
}

export function PendingConfirmationsSection({
  appointments,
  onConfirm,
  onReject,
  onReschedule,
  isLoading = false,
}: PendingConfirmationsSectionProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Reschedule State
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');

  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

  // Load available slots dependent on dialog state
  const today = new Date();
  const dateRangeEnd = endOfMonth(addMonths(today, 2));

  const { data: availableDates = [], isLoading: loadingAvailableDates } = useDoctorAvailableDates({
    doctorId: selectedAppointment?.doctorId ? String(selectedAppointment.doctorId) : null,
    startDate: today,
    endDate: dateRangeEnd,
    enabled: rescheduleDialogOpen && !!selectedAppointment?.doctorId,
  });
  const availableDatesSet = new Set(availableDates);

  const selectedDateObj = rescheduleDate ? new Date(rescheduleDate) : null;
  const { slots, loading: loadingSlots } = useAvailableSlots({
    doctorId: selectedAppointment?.doctorId ? String(selectedAppointment.doctorId) : null,
    date: selectedDateObj,
    enabled: rescheduleDialogOpen && !!rescheduleDate,
  });

  const handleConfirm = async (appointment: AppointmentResponseDto) => {
    setActionInProgress(appointment.id);
    try {
      await onConfirm(appointment.id);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectClick = (appointment: AppointmentResponseDto) => {
    setSelectedAppointment(appointment);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleRescheduleClick = (appointment: AppointmentResponseDto) => {
    setSelectedAppointment(appointment);
    setRescheduleDate('');
    setRescheduleTime(null);
    setRescheduleReason('');
    setRescheduleDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedAppointment || !rejectionReason.trim()) return;

    setActionInProgress(selectedAppointment.id);
    try {
      await onReject(selectedAppointment.id, rejectionReason.trim());
      setRejectDialogOpen(false);
      setSelectedAppointment(null);
      setRejectionReason('');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRescheduleConfirm = async () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;

    setActionInProgress(selectedAppointment.id);
    try {
      await onReschedule(selectedAppointment.id, rescheduleDate, rescheduleTime, rescheduleReason);
      setRescheduleDialogOpen(false);
      setSelectedAppointment(null);
      setRescheduleDate('');
      setRescheduleTime(null);
      setRescheduleReason('');
    } finally {
      setActionInProgress(null);
    }
  }

  const getDateLabel = (date: Date | string) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    const days = differenceInDays(d, new Date());
    if (days < 7) return format(d, 'EEEE');
    return format(d, 'MMM d');
  };

  const getUrgencyColor = (date: Date | string) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isToday(d)) return 'bg-red-500';
    if (isTomorrow(d)) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  const formatAppointmentDate = (date: Date | string) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'MMM d');
  };

  const getPatientName = (patient: AppointmentResponseDto['patient']) => {
    if (!patient) return 'Unknown Patient';
    return `${patient.firstName} ${patient.lastName}`.trim() || 'Unknown Patient';
  };

  if (appointments.length === 0) {
    return null; // Don't show section if no pending confirmations
  }

  return (
    <>
      <section className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-amber-200/60 flex items-center justify-between bg-amber-100/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-xl shadow-lg shadow-amber-500/20">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Pending Confirmations</h2>
              <p className="text-sm text-amber-700">
                {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} awaiting your review
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 font-bold">
            Action Required
          </Badge>
        </div>

        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-white/50 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            appointments.map((appointment) => (
              <div
                key={appointment.id}
                className={cn(
                  "bg-white rounded-xl border border-amber-100 p-4 shadow-sm",
                  "hover:shadow-md hover:border-amber-200 transition-all duration-200",
                  actionInProgress === appointment.id && "opacity-60 pointer-events-none"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Patient & Time Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "w-1 h-full min-h-[60px] rounded-full",
                      getUrgencyColor(appointment.appointmentDate)
                    )} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span className="font-bold text-slate-900 truncate">
                          {getPatientName(appointment.patient)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="font-semibold text-slate-700">
                            {getDateLabel(appointment.appointmentDate)}
                          </span>
                          <span className="text-slate-400">
                            ({formatAppointmentDate(appointment.appointmentDate)})
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {appointment.time}
                        </span>
                      </div>

                      {appointment.type && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {appointment.type}
                        </Badge>
                      )}

                      {appointment.note && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                          <MessageSquare className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{appointment.note}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                      onClick={() => handleRescheduleClick(appointment)}
                      disabled={actionInProgress !== null}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                      onClick={() => handleRejectClick(appointment)}
                      disabled={actionInProgress !== null}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                      onClick={() => handleConfirm(appointment)}
                      disabled={actionInProgress !== null}
                    >
                      {actionInProgress === appointment.id ? (
                        <span className="flex items-center gap-1">
                          <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Confirming...
                        </span>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Confirm
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Appointment</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this appointment. The patient and frontdesk will be notified.
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="py-2">
              <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
                <p className="font-medium text-slate-900">
                  {getPatientName(selectedAppointment.patient)}
                </p>
                <p className="text-slate-500">
                  {format(typeof selectedAppointment.appointmentDate === 'string'
                    ? parseISO(selectedAppointment.appointmentDate)
                    : selectedAppointment.appointmentDate, 'EEEE, MMMM d')} at {selectedAppointment.time}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Reason for declining</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="e.g., Schedule conflict, recommend different specialist..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={actionInProgress !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim() || actionInProgress !== null}
            >
              {actionInProgress ? (
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Declining...
                </span>
              ) : (
                'Decline Appointment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new date and time for this appointment. The patient will be notified.
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-slate-900">
                  {getPatientName(selectedAppointment.patient)}
                </p>
                <p className="text-slate-500">
                  Current: {format(typeof selectedAppointment.appointmentDate === 'string'
                    ? parseISO(selectedAppointment.appointmentDate)
                    : selectedAppointment.appointmentDate, 'EEEE, MMMM d')} at {selectedAppointment.time}
                </p>
              </div>

              <div className="space-y-2">
                <Label>New Date</Label>
                <Input
                  type="date"
                  min={today.toISOString().split('T')[0]}
                  value={rescheduleDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (availableDatesSet.has(val) || !rescheduleDate) {
                      setRescheduleDate(val);
                      setRescheduleTime(null);
                    } else {
                      toast.error('No slots available on this date');
                    }
                  }}
                  className={cn(
                    rescheduleDate && !availableDatesSet.has(rescheduleDate) && "border-red-300 focus-visible:ring-red-300"
                  )}
                />
                {loadingAvailableDates && <p className="text-xs text-muted-foreground animate-pulse">Loading availability...</p>}
              </div>

              {rescheduleDate && (
                <div className="space-y-2">
                  <Label>New Time</Label>
                  {loadingSlots ? (
                    <div className="text-xs text-muted-foreground">Loading slots...</div>
                  ) : slots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 max-h-[120px] overflow-y-auto">
                      {slots.filter(s => s.isAvailable).map((slot, i) => (
                        <Button
                          key={i}
                          variant={rescheduleTime === slot.startTime ? "default" : "outline"}
                          size="sm"
                          onClick={() => setRescheduleTime(slot.startTime)}
                          className="text-xs"
                        >
                          {slot.startTime}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No slots available.</div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Textarea
                  placeholder="Reason for rescheduling..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleRescheduleConfirm}
              disabled={!rescheduleDate || !rescheduleTime || actionInProgress !== null}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionInProgress ? 'Rescheduling...' : 'Confirm Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
