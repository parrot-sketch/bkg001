'use client';

/**
 * Request Consultation Dialog
 * 
 * Modal dialog for submitting a consultation request.
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { SubmitConsultationRequestDto } from '@/application/dtos/SubmitConsultationRequestDto';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { DoctorSelect } from '@/components/patient/DoctorSelect';
import { DoctorProfileModal } from '@/components/patient/DoctorProfileModal';
import { ConsultationRequestConfirmationDialog } from '@/components/patient/ConsultationRequestConfirmationDialog';

interface RequestConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patientId: string;
}

export function RequestConsultationDialog({
  open,
  onClose,
  onSuccess,
  patientId,
}: RequestConsultationDialogProps) {
  const [formData, setFormData] = useState<{
    patientId: string;
    doctorId: string;
    preferredDate: string; // Store as string for date input
    timePreference: string;
    type: string;
    concernDescription: string;
    note?: string;
    isOver18: boolean;
    privacyConsent: boolean;
    contactConsent: boolean;
    acknowledgmentConsent: boolean;
  }>({
    patientId,
    doctorId: '',
    preferredDate: '',
    timePreference: '',
    type: '',
    concernDescription: '',
    note: '',
    isOver18: false,
    privacyConsent: false,
    contactConsent: false,
    acknowledgmentConsent: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState<DoctorResponseDto | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedAppointment, setSubmittedAppointment] = useState<AppointmentResponseDto | null>(null);

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

    if (!formData.doctorId || !formData.timePreference || !formData.type || !formData.concernDescription.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.isOver18 || !formData.privacyConsent || !formData.contactConsent || !formData.acknowledgmentConsent) {
      toast.error('Please accept all required consents');
      return;
    }

    setIsSubmitting(true);

    try {
      // Map form data to SubmitConsultationRequestDto
      const consultationRequestDto: SubmitConsultationRequestDto = {
        patientId: formData.patientId,
        doctorId: formData.doctorId || undefined,
        preferredDate: formData.preferredDate ? new Date(formData.preferredDate) : undefined,
        timePreference: formData.timePreference || undefined,
        concernDescription: formData.concernDescription,
        notes: formData.note || undefined,
        // Required consents - from user input
        isOver18: formData.isOver18,
        contactConsent: formData.contactConsent,
        privacyConsent: formData.privacyConsent,
        acknowledgmentConsent: formData.acknowledgmentConsent,
      };

      const response = await patientApi.submitConsultationRequest(consultationRequestDto);

      if (response.success && response.data) {
        setSubmittedAppointment(response.data);
        setShowConfirmation(true);
        onSuccess();
        // Reset form
        setFormData({
          patientId,
          doctorId: '',
          preferredDate: '',
          timePreference: '',
          type: '',
          concernDescription: '',
          note: '',
          isOver18: false,
          privacyConsent: false,
          contactConsent: false,
          acknowledgmentConsent: false,
        });
      } else if (!response.success) {
        toast.error(response.error || 'Failed to submit consultation request');
      } else {
        toast.error('Failed to submit consultation request');
      }
    } catch (error) {
      toast.error('An error occurred while submitting your consultation request');
      console.error('Error submitting consultation request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Consultation</DialogTitle>
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
              <Label htmlFor="preferredDate">Preferred Date (Optional)</Label>
              <Input
                id="preferredDate"
                type="date"
                value={formData.preferredDate}
                onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                disabled={isSubmitting}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timePreference">Time Preference *</Label>
              <Select
                value={formData.timePreference}
                onValueChange={(value) => setFormData({ ...formData, timePreference: value })}
                disabled={isSubmitting}
                required
              >
                <SelectTrigger id="timePreference">
                  <SelectValue placeholder="Select time preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning">Morning</SelectItem>
                  <SelectItem value="Afternoon">Afternoon</SelectItem>
                  <SelectItem value="Evening">Evening</SelectItem>
                  <SelectItem value="No Preference">No Preference</SelectItem>
                </SelectContent>
              </Select>
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
              <Label htmlFor="concernDescription">Describe Your Concern *</Label>
              <Textarea
                id="concernDescription"
                placeholder="Please describe what procedure you're interested in and any concerns or goals..."
                value={formData.concernDescription}
                onChange={(e) => setFormData({ ...formData, concernDescription: e.target.value })}
                required
                disabled={isSubmitting}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Additional Information (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Any additional information you'd like to share..."
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                disabled={isSubmitting}
                rows={3}
              />
            </div>

            {/* Required Consents */}
            <div className="space-y-4 border-t pt-4">
              <Label className="text-sm font-semibold">Required Consents *</Label>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="isOver18"
                    checked={formData.isOver18}
                    onCheckedChange={(checked) => setFormData({ ...formData, isOver18: checked === true })}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="isOver18" className="text-sm font-normal cursor-pointer leading-tight">
                    I confirm I am over 18 years old *
                  </Label>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="privacyConsent"
                    checked={formData.privacyConsent}
                    onCheckedChange={(checked) => setFormData({ ...formData, privacyConsent: checked === true })}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="privacyConsent" className="text-sm font-normal cursor-pointer leading-tight">
                    I agree to the <Link href="/privacy" className="underline text-primary hover:underline-offset-2" target="_blank">Privacy Policy</Link> *
                  </Label>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="contactConsent"
                    checked={formData.contactConsent}
                    onCheckedChange={(checked) => setFormData({ ...formData, contactConsent: checked === true })}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="contactConsent" className="text-sm font-normal cursor-pointer leading-tight">
                    I consent to be contacted by phone, email, or SMS regarding my consultation request *
                  </Label>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="acknowledgmentConsent"
                    checked={formData.acknowledgmentConsent}
                    onCheckedChange={(checked) => setFormData({ ...formData, acknowledgmentConsent: checked === true })}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="acknowledgmentConsent" className="text-sm font-normal cursor-pointer leading-tight">
                    I acknowledge that this is a consultation request and not a confirmed appointment. Our team will review and contact me to schedule *
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Request Consultation'}
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
      <ConsultationRequestConfirmationDialog
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
