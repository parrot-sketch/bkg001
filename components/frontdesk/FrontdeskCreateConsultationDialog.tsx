'use client';

/**
 * Create Consultation Dialog (Frontdesk)
 * 
 * Modal dialog for frontdesk staff to create a consultation request directly
 * for a patient from the patient listing page.
 * 
 * Unlike patient-initiated consultations, frontdesk-created consultations:
 * - Have appointment date/time pre-set
 * - Status is APPROVED (no review step)
 * - Require doctor selection
 * - Are created by staff for patients
 */

import { useState, useEffect } from 'react';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { doctorApi } from '@/lib/api/doctor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import type { CreateConsultationFromFrontdeskDto } from '@/application/dtos/CreateConsultationFromFrontdeskDto';

interface FrontdeskCreateConsultationDialogProps {
  /**
   * Patient ID for whom consultation is being created
   */
  patientId: string;

  /**
   * Patient name for display
   */
  patientName: string;

  /**
   * Whether dialog is open
   */
  isOpen: boolean;

  /**
   * Callback when dialog should close
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Callback after successful consultation creation
   */
  onSuccess?: () => void;
}

export function FrontdeskCreateConsultationDialog({
  patientId,
  patientName,
  isOpen,
  onOpenChange,
  onSuccess,
}: FrontdeskCreateConsultationDialogProps) {
  // Form state
  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [doctorId, setDoctorId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [concernDescription, setConcernDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Load doctors when dialog opens
  useEffect(() => {
    if (isOpen && doctors.length === 0) {
      loadDoctors();
    }
  }, [isOpen]);

  const loadDoctors = async () => {
    setIsLoading(true);
    try {
      const response = await doctorApi.getAllDoctors();
      if (response.success && response.data) {
        setDoctors(response.data);
      } else {
        toast.error('Failed to load doctors');
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
      toast.error('Error loading doctors');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setDoctorId('');
    setServiceId('');
    setAppointmentDate('');
    setAppointmentTime('');
    setConcernDescription('');
    setNotes('');
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!doctorId) {
      toast.error('Please select a doctor');
      return;
    }

    if (!serviceId) {
      toast.error('Please select a service');
      return;
    }

    if (!appointmentDate) {
      toast.error('Please select an appointment date');
      return;
    }

    if (!appointmentTime) {
      toast.error('Please select an appointment time');
      return;
    }

    if (!concernDescription.trim()) {
      toast.error('Please describe the concern');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create DTO
      const consultationDto: CreateConsultationFromFrontdeskDto = {
        patientId,
        doctorId,
        serviceId,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        concernDescription,
        notes: notes || undefined,
      };

      // Submit to API
      const response = await frontdeskApi.createConsultation(consultationDto);

      if (response.success) {
        toast.success('Consultation created successfully for ' + patientName);
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(response.error || 'Failed to create consultation');
      }
    } catch (error) {
      console.error('Error creating consultation:', error);
      toast.error('Error creating consultation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate time options (9 AM to 5 PM, 30-min intervals)
  const timeOptions = Array.from({ length: 16 }, (_, i) => {
    const hour = 9 + Math.floor(i / 2);
    const minute = (i % 2) * 30;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    return {
      value: `${displayHour}:${minute === 0 ? '00' : '30'} ${ampm}`,
      label: `${displayHour}:${minute === 0 ? '00' : '30'} ${ampm}`,
    };
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Consultation</DialogTitle>
          <DialogDescription>
            Create a consultation request for {patientName}. The appointment will be pre-scheduled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Doctor Selection */}
          <div className="space-y-2">
            <Label htmlFor="doctor">Doctor/Surgeon *</Label>
            <Select value={doctorId} onValueChange={setDoctorId} disabled={isLoading}>
              <SelectTrigger id="doctor">
                <SelectValue placeholder={isLoading ? 'Loading doctors...' : 'Select doctor'} />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.firstName} {doctor.lastName} - {doctor.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Selection */}
          <div className="space-y-2">
            <Label htmlFor="service">Service/Procedure *</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger id="service">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">General Consultation</SelectItem>
                <SelectItem value="2">Surgical Assessment</SelectItem>
                <SelectItem value="3">Follow-up Visit</SelectItem>
                <SelectItem value="4">Pre-operative Evaluation</SelectItem>
                <SelectItem value="5">Post-operative Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Appointment Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Appointment Date *</Label>
            <Input
              id="date"
              type="date"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Appointment Time */}
          <div className="space-y-2">
            <Label htmlFor="time">Appointment Time *</Label>
            <Select value={appointmentTime} onValueChange={setAppointmentTime}>
              <SelectTrigger id="time">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Concern Description */}
          <div className="space-y-2">
            <Label htmlFor="concern">Concern/Reason for Consultation *</Label>
            <Textarea
              id="concern"
              placeholder="Describe the patient's concern or reason for this consultation..."
              value={concernDescription}
              onChange={(e) => setConcernDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes from the frontdesk staff..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? 'Creating...' : 'Create Consultation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
