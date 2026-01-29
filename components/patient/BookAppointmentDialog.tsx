'use client';

/**
 * Book Appointment Dialog
 * 
 * Modal dialog for direct appointment booking with real-time availability.
 * Patients select a specific date and available time slot.
 * This creates an immediate appointment booking (not a consultation request).
 */

import { useState, useEffect } from 'react';
import { patientApi } from '@/lib/api/patient';
import { doctorApi } from '@/lib/api/doctor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { ScheduleAppointmentDto } from '@/application/dtos/ScheduleAppointmentDto';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { DoctorSelect } from '@/components/patient/DoctorSelect';
import { DoctorProfileModal } from '@/components/patient/DoctorProfileModal';
import { AppointmentBookingConfirmationDialog } from '@/components/patient/AppointmentBookingConfirmationDialog';
import { useAvailableSlots } from '@/hooks/useAvailableSlots';
import { useAppointmentConflicts } from '@/hooks/useAppointmentConflicts';
import { useDoctorAvailableDates } from '@/hooks/useDoctorAvailableDates';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface BookAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patientId: string;
}

export function BookAppointmentDialog({
  open,
  onClose,
  onSuccess,
  patientId,
}: BookAppointmentDialogProps) {
  const [formData, setFormData] = useState<{
    patientId: string;
    doctorId: string;
    appointmentDate: string; // Store as string for date input
    selectedSlot: string | null; // Selected slot start time (HH:mm)
    type: string;
    note?: string;
  }>({
    patientId,
    doctorId: '',
    appointmentDate: '',
    selectedSlot: null,
    type: '',
    note: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState<DoctorResponseDto | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedAppointment, setSubmittedAppointment] = useState<AppointmentResponseDto | null>(null);

  // Fetch available dates when doctor is selected (for calendar highlighting)
  const today = new Date();
  const dateRangeStart = today; // Start from today, not start of month
  const dateRangeEnd = endOfMonth(addMonths(today, 2)); // Show 3 months ahead
  
  const { data: availableDates = [], isLoading: loadingAvailableDates } = useDoctorAvailableDates({
    doctorId: formData.doctorId || null,
    startDate: dateRangeStart,
    endDate: dateRangeEnd,
    enabled: !!formData.doctorId && open,
  });

  // Convert available dates to Set for O(1) lookup
  const availableDatesSet = new Set(availableDates);

  // Fetch available slots when doctor and date are selected
  const selectedDate = formData.appointmentDate ? new Date(formData.appointmentDate) : null;
  const { slots, loading: loadingSlots, error: slotsError, refetch: refetchSlots } = useAvailableSlots({
    doctorId: formData.doctorId || null,
    date: selectedDate,
    enabled: !!formData.doctorId && !!formData.appointmentDate && open,
  });

  // Check for appointment conflicts
  const { conflicts, checkConflicts } = useAppointmentConflicts(patientId, open);

  // Load doctors when dialog opens
  useEffect(() => {
    if (open) {
      loadDoctors();
    }
  }, [open]);

  // Reset selected slot when date or doctor changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, selectedSlot: null }));
  }, [formData.appointmentDate, formData.doctorId]);

  // Check for conflicts when slot is selected
  useEffect(() => {
    if (formData.doctorId && formData.appointmentDate && formData.selectedSlot) {
      checkConflicts({
        doctorId: formData.doctorId,
        date: new Date(formData.appointmentDate),
        time: formData.selectedSlot,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.selectedSlot, formData.doctorId, formData.appointmentDate]);

  const loadDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const response = await patientApi.getAllDoctors();
      if (response.success && response.data) {
        setDoctors(response.data);
      } else if (!response.success) {
        toast.error(response.error || 'Failed to load doctors');
      } else {
        toast.error('Failed to load doctors');
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
      toast.error('An error occurred while loading doctors');
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleViewProfile = async (doctorId: string) => {
    try {
      const response = await doctorApi.getDoctor(doctorId);
      if (response.success && response.data) {
        setSelectedDoctorProfile(response.data);
        setShowProfileModal(true);
      } else if (!response.success) {
        toast.error(response.error || 'Failed to load doctor profile');
      } else {
        toast.error('Failed to load doctor profile');
      }
    } catch (error) {
      console.error('Error loading doctor profile:', error);
      toast.error('An error occurred while loading doctor profile');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.doctorId || !formData.appointmentDate || !formData.selectedSlot || !formData.type) {
      toast.error('Please fill in all required fields and select an available time slot');
      return;
    }

    setIsSubmitting(true);

    try {
      // Format the appointment date and time
      const appointmentDate = new Date(formData.appointmentDate);
      const [hours, minutes] = formData.selectedSlot.split(':');
      appointmentDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      // Use 24-hour format (HH:mm) to match database format and validation logic
      // formData.selectedSlot is already in HH:mm format from the slots API
      const timeStr = formData.selectedSlot; // e.g., "09:00", "14:30"

      const dto: ScheduleAppointmentDto = {
        patientId: formData.patientId,
        doctorId: formData.doctorId,
        appointmentDate: new Date(formData.appointmentDate),
        time: timeStr,
        type: formData.type,
        note: formData.note,
      };

      const response = await patientApi.scheduleAppointment(dto);

      if (response.success && response.data) {
        setSubmittedAppointment(response.data);
        setShowConfirmation(true);
        onSuccess();
        // Reset form
        setFormData({
          patientId,
          doctorId: '',
          appointmentDate: '',
          selectedSlot: null,
          type: '',
          note: '',
        });
      } else if (!response.success) {
        // Check if error is due to slot being already booked
        const errorMessage = response.error || '';
        if (
          errorMessage.includes('already booked') ||
          errorMessage.includes('not available') ||
          errorMessage.includes('conflict') ||
          errorMessage.includes('double booking')
        ) {
          toast.error('This time slot was just booked by another patient. Please select a different time.');
          // Refetch available slots to show updated availability
          await refetchSlots();
          // Clear selected slot so user can choose another
          setFormData(prev => ({ ...prev, selectedSlot: null }));
        } else {
          toast.error(response.error || 'Failed to book appointment');
        }
      } else {
        toast.error('Failed to book appointment');
      }
    } catch (error: any) {
      // Check if error is due to slot being already booked
      const errorMessage = error?.message || error?.toString() || '';
      if (
        errorMessage.includes('already booked') ||
        errorMessage.includes('not available') ||
        errorMessage.includes('conflict') ||
        errorMessage.includes('double booking')
      ) {
        toast.error('This time slot was just booked by another patient. Please select a different time.');
        // Refetch available slots
        await refetchSlots();
        // Clear selected slot
        setFormData(prev => ({ ...prev, selectedSlot: null }));
      } else {
        toast.error('An error occurred while booking your appointment');
        console.error('Error booking appointment:', error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format time slot for display (e.g., "10:00 AM - 10:30 AM")
  const formatSlotTime = (startTime: string, endTime: string): string => {
    try {
      const [startH, startM] = startTime.split(':');
      const [endH, endM] = endTime.split(':');
      const startDate = new Date();
      startDate.setHours(parseInt(startH, 10), parseInt(startM, 10), 0, 0);
      const endDate = new Date();
      endDate.setHours(parseInt(endH, 10), parseInt(endM, 10), 0, 0);
      return `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
    } catch {
      return `${startTime} - ${endTime}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book Appointment</DialogTitle>
          <DialogDescription>
            Select a date and available time slot to book your appointment immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {loadingDoctors ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <p className="ml-2 text-sm text-muted-foreground">Loading doctors...</p>
              </div>
            ) : (
              <DoctorSelect
                doctors={doctors}
                value={formData.doctorId}
                onValueChange={(value) => setFormData({ ...formData, doctorId: value, selectedSlot: null })}
                placeholder="Select a doctor..."
                disabled={isSubmitting}
                required
                onViewProfile={handleViewProfile}
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="appointmentDate">Appointment Date *</Label>
              {loadingAvailableDates && formData.doctorId ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>Loading available dates...</span>
                </div>
              ) : null}
              <Input
                id="appointmentDate"
                type="date"
                value={formData.appointmentDate}
                onChange={(e) => {
                  const selectedDateStr = e.target.value;
                  // Only allow selection if date is in available dates set
                  if (!formData.doctorId || availableDatesSet.has(selectedDateStr)) {
                    setFormData({ ...formData, appointmentDate: selectedDateStr, selectedSlot: null });
                  } else {
                    toast.error('This date has no available slots. Please select a highlighted date.');
                  }
                }}
                required
                disabled={isSubmitting || !formData.doctorId || loadingAvailableDates}
                min={new Date().toISOString().split('T')[0]}
                max={dateRangeEnd.toISOString().split('T')[0]}
                className={formData.appointmentDate && !availableDatesSet.has(formData.appointmentDate) 
                  ? 'border-destructive' 
                  : ''}
              />
              {!formData.doctorId && (
                <p className="text-xs text-muted-foreground">Please select a doctor first</p>
              )}
              {formData.doctorId && !loadingAvailableDates && availableDates.length === 0 && (
                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  No available dates found for this doctor in the next 3 months. Please contact the clinic directly.
                </div>
              )}
              {formData.doctorId && !loadingAvailableDates && availableDates.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {availableDates.length} date{availableDates.length !== 1 ? 's' : ''} with available slots in the next 3 months
                </p>
              )}
            </div>

            {/* Conflict Warning */}
            {conflicts.length > 0 && formData.selectedSlot && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Potential Conflict</AlertTitle>
                <AlertDescription>
                  {conflicts[0].reason}. Are you sure you want to book this time?
                </AlertDescription>
              </Alert>
            )}

            {/* Available Time Slots */}
            {formData.doctorId && formData.appointmentDate && (
              <div className="space-y-2">
                <Label>Available Time Slots *</Label>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <p className="ml-2 text-sm text-muted-foreground">Loading available slots...</p>
                  </div>
                ) : slotsError ? (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {slotsError}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    No available slots for this date. Please select another date.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {slots
                      .filter(slot => slot.isAvailable)
                      .map((slot, index) => {
                        const slotKey = `${slot.startTime}-${index}`;
                        const isSelected = formData.selectedSlot === slot.startTime;
                        return (
                          <button
                            key={slotKey}
                            type="button"
                            onClick={() => setFormData({ ...formData, selectedSlot: slot.startTime })}
                            disabled={isSubmitting}
                            className={`
                              rounded-md border-2 p-2 text-sm font-medium transition-colors
                              ${isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                              }
                              disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                          >
                            {formatSlotTime(slot.startTime, slot.endTime)}
                          </button>
                        );
                      })}
                  </div>
                )}
                {formData.selectedSlot && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {formatSlotTime(
                      formData.selectedSlot,
                      slots.find(s => s.startTime === formData.selectedSlot)?.endTime || formData.selectedSlot
                    )}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="type">Procedure Type *</Label>
              <Input
                id="type"
                placeholder="e.g., Consultation, Follow-up, Procedure"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Additional Notes (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Any additional information..."
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                disabled={isSubmitting}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.selectedSlot}>
              {isSubmitting ? 'Booking...' : 'Book Appointment'}
            </Button>
          </DialogFooter>
        </form>

        {/* Doctor Profile Modal */}
        <DoctorProfileModal
          open={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          doctor={selectedDoctorProfile}
        />
      </DialogContent>

      {/* Success Confirmation Dialog */}
      <AppointmentBookingConfirmationDialog
        open={showConfirmation}
        onClose={() => {
          setShowConfirmation(false);
          setSubmittedAppointment(null);
        }}
        appointment={submittedAppointment}
      />
    </Dialog>
  );
}
