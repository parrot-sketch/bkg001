'use client';

/**
 * Submit Inquiry Dialog
 * 
 * Modal dialog for submitting a consultation inquiry.
 * Patients express interest in a procedure - this is not yet a booking.
 * Clean, professional form with validation.
 * Includes surgeon selection with profiles.
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
import { DoctorSelect } from '@/components/patient/DoctorSelect';
import { DoctorProfileModal } from '@/components/patient/DoctorProfileModal';

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
  const [formData, setFormData] = useState<{
    patientId: string;
    doctorId: string;
    appointmentDate: string; // Store as string for date input
    time: string;
    type: string;
    note?: string;
  }>({
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
        toast.success('Your inquiry has been submitted. We will review it and contact you shortly.');
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
      } else if (!response.success) {
        toast.error(response.error || 'Failed to submit inquiry');
      } else {
        toast.error('Failed to submit inquiry');
      }
    } catch (error) {
      toast.error('An error occurred while submitting your inquiry');
      console.error('Error submitting inquiry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Consultation Inquiry</DialogTitle>
          <DialogDescription>Share your interest in a procedure. Our team will review and contact you shortly.</DialogDescription>
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
              <Label htmlFor="type">Procedure of Interest *</Label>
              <Input
                id="type"
                placeholder="e.g., Rhinoplasty, BBL, Lipo, Breast Surgery"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Additional Information (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Share any relevant information about your goals or concerns"
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
              {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
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
