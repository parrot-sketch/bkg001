'use client';

/**
 * Schedule Appointment Dialog
 * 
 * Modal dialog for scheduling a new appointment.
 * Clean, professional form with validation.
 * Includes doctor selection with profiles.
 */

import { useState, useEffect } from 'react';
import { patientApi } from '../../lib/api/patient';
import { doctorApi } from '../../lib/api/doctor';
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
import type { ScheduleAppointmentDto } from '../../application/dtos/ScheduleAppointmentDto';
import type { DoctorResponseDto } from '../../application/dtos/DoctorResponseDto';
import { DoctorSelect } from './DoctorSelect';
import { DoctorProfileModal } from './DoctorProfileModal';

interface ScheduleAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patientId: string;
}

export function ScheduleAppointmentDialog({
  open,
  onClose,
  onSuccess,
  patientId,
}: ScheduleAppointmentDialogProps) {
  const [formData, setFormData] = useState<Partial<ScheduleAppointmentDto>>({
    patientId,
    doctorId: '',
    appointmentDate: '',
    time: '',
    type: '',
    note: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState<DoctorResponseDto | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Load doctors when dialog opens
  useEffect(() => {
    if (open) {
      loadDoctors();
    }
  }, [open]);

  const loadDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const response = await patientApi.getAllDoctors();
      if (response.success && response.data) {
        setDoctors(response.data);
      } else {
        toast.error(response.error || 'Failed to load doctors');
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
      } else {
        toast.error(response.error || 'Failed to load doctor profile');
      }
    } catch (error) {
      console.error('Error loading doctor profile:', error);
      toast.error('An error occurred while loading doctor profile');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.doctorId || !formData.appointmentDate || !formData.time || !formData.type) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await patientApi.scheduleAppointment({
        patientId: formData.patientId!,
        doctorId: formData.doctorId,
        appointmentDate: new Date(formData.appointmentDate),
        time: formData.time,
        type: formData.type,
        note: formData.note,
      });

      if (response.success) {
        onSuccess();
        // Reset form
        setFormData({
          patientId,
          doctorId: '',
          appointmentDate: '',
          time: '',
          type: '',
          note: '',
        });
      } else {
        toast.error(response.error || 'Failed to schedule appointment');
      }
    } catch (error) {
      toast.error('An error occurred while scheduling the appointment');
      console.error('Error scheduling appointment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
          <DialogDescription>Fill in the details to schedule your appointment</DialogDescription>
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
                onValueChange={(value) => setFormData({ ...formData, doctorId: value })}
                placeholder="Select a doctor..."
                disabled={isSubmitting}
                required
                onViewProfile={handleViewProfile}
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="appointmentDate">Date *</Label>
              <Input
                id="appointmentDate"
                type="date"
                value={formData.appointmentDate}
                onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                required
                disabled={isSubmitting}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Appointment Type *</Label>
              <Input
                id="type"
                placeholder="e.g., Consultation, Follow-up"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Notes (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Any additional notes or special requests"
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Appointment'}
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
    </Dialog>
  );
}
