'use client';

/**
 * Step-by-Step Appointment Booking Workflow
 * 
 * Mobile-optimized multi-step booking process:
 * Step 1: Select service/procedure
 * Step 2: Select doctor
 * Step 3: Choose date/time
 * Step 4: Review and confirm
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DoctorSelect } from './DoctorSelect';
import { DoctorProfileModal } from './DoctorProfileModal';
import { patientApi } from '@/lib/api/patient';
import { doctorApi } from '@/lib/api/doctor';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { toast } from 'sonner';

interface BookingData {
  serviceType: string;
  doctorId: string;
  appointmentDate: string;
  time: string;
  notes: string;
}

interface StepByStepBookingProps {
  patientId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const BOOKING_STEPS = 4;

const SERVICE_TYPES = [
  { value: 'consultation', label: 'Initial Consultation' },
  { value: 'follow-up', label: 'Follow-up Visit' },
  { value: 'procedure', label: 'Aesthetic Procedure' },
  { value: 'pre-op', label: 'Pre-Operative Assessment' },
  { value: 'post-op', label: 'Post-Operative Follow-up' },
];

export function StepByStepBooking({ patientId, onSuccess, onCancel }: StepByStepBookingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingData>({
    serviceType: '',
    doctorId: '',
    appointmentDate: '',
    time: '',
    notes: '',
  });
  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState<DoctorResponseDto | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BookingData, string>>>({});

  useEffect(() => {
    if (currentStep === 2) {
      loadDoctors();
    }
  }, [currentStep]);

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
      }
    } catch (error) {
      console.error('Error loading doctor profile:', error);
    }
  };

  const updateField = (field: keyof BookingData, value: string) => {
    setBookingData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof BookingData, string>> = {};

    switch (step) {
      case 1:
        if (!bookingData.serviceType) newErrors.serviceType = 'Please select a service type';
        break;
      case 2:
        if (!bookingData.doctorId) newErrors.doctorId = 'Please select a doctor';
        break;
      case 3:
        if (!bookingData.appointmentDate) newErrors.appointmentDate = 'Please select a date';
        if (!bookingData.time) newErrors.time = 'Please select a time';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, BOOKING_STEPS));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    try {
      const response = await patientApi.scheduleAppointment({
        patientId,
        doctorId: bookingData.doctorId,
        appointmentDate: new Date(bookingData.appointmentDate),
        time: bookingData.time,
        type: bookingData.serviceType,
        note: bookingData.notes,
      });

      if (response.success) {
        toast.success('Appointment scheduled successfully!');
        onSuccess();
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

  const renderProgressDots = () => {
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {Array.from({ length: BOOKING_STEPS }).map((_, index) => {
          const step = index + 1;
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;

          return (
            <div
              key={step}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                isCompleted
                  ? 'w-8 bg-primary'
                  : isActive
                    ? 'w-8 bg-accent'
                    : 'w-2 bg-muted',
              )}
              aria-label={`Step ${step}${isActive ? ', current' : isCompleted ? ', completed' : ''}`}
            />
          );
        })}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Select Service Type</h2>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">What type of appointment do you need? *</Label>
              <select
                id="serviceType"
                value={bookingData.serviceType}
                onChange={(e) => updateField('serviceType', e.target.value)}
                className={cn(
                  'flex h-12 w-full rounded-md border border-input bg-background px-4 py-2 text-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  errors.serviceType ? 'border-destructive' : '',
                )}
                aria-invalid={!!errors.serviceType}
                aria-describedby={errors.serviceType ? 'serviceType-error' : undefined}
              >
                <option value="">Select service type...</option>
                {SERVICE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.serviceType && (
                <p id="serviceType-error" className="text-sm text-destructive">
                  {errors.serviceType}
                </p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Choose Your Doctor</h2>
            </div>

            {loadingDoctors ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="ml-3 text-muted-foreground">Loading doctors...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="doctor">Select a doctor *</Label>
                <DoctorSelect
                  doctors={doctors}
                  value={bookingData.doctorId}
                  onValueChange={(value) => updateField('doctorId', value)}
                  onViewProfile={handleViewProfile}
                  placeholder="Choose your preferred doctor..."
                  disabled={isSubmitting}
                  required
                />
                {errors.doctorId && (
                  <p className="text-sm text-destructive">{errors.doctorId}</p>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Select Date & Time</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appointmentDate">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Appointment Date *
                </Label>
                <Input
                  id="appointmentDate"
                  type="date"
                  value={bookingData.appointmentDate}
                  onChange={(e) => updateField('appointmentDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={errors.appointmentDate ? 'border-destructive' : ''}
                  aria-invalid={!!errors.appointmentDate}
                />
                {errors.appointmentDate && (
                  <p className="text-sm text-destructive">{errors.appointmentDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Preferred Time *
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={bookingData.time}
                  onChange={(e) => updateField('time', e.target.value)}
                  className={errors.time ? 'border-destructive' : ''}
                  aria-invalid={!!errors.time}
                />
                {errors.time && (
                  <p className="text-sm text-destructive">{errors.time}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={bookingData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Any special requests or notes for the doctor..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        const selectedDoctor = doctors.find((d) => d.id === bookingData.doctorId);
        const selectedService = SERVICE_TYPES.find((s) => s.value === bookingData.serviceType);

        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Check className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Review & Confirm</h2>
            </div>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Service Type</p>
                    <p className="font-medium">{selectedService?.label || bookingData.serviceType}</p>
                  </div>

                  {selectedDoctor && (
                    <div>
                      <p className="text-sm text-muted-foreground">Doctor</p>
                      <p className="font-medium">
                        {selectedDoctor.title} {selectedDoctor.firstName} {selectedDoctor.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedDoctor.specialization}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground">Date & Time</p>
                    <p className="font-medium">
                      {new Date(bookingData.appointmentDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">{bookingData.time}</p>
                  </div>

                  {bookingData.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="text-sm">{bookingData.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {isSubmitting && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Scheduling your appointment...</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="w-full max-w-2xl mx-auto">
        {/* Progress Dots */}
        {renderProgressDots()}

        {/* Step Content */}
        <Card>
          <CardContent className="p-4 sm:p-6 min-h-[400px]">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6 gap-2">
          {currentStep === 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={isSubmitting}
              className="flex-1"
              aria-label="Previous step"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
          )}

          {currentStep < BOOKING_STEPS ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex-1"
              aria-label="Next step"
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
              aria-label="Confirm booking"
            >
              {isSubmitting ? 'Scheduling...' : 'Confirm Booking'}
            </Button>
          )}
        </div>
      </div>

      {/* Doctor Profile Modal */}
      {selectedDoctorProfile && (
        <DoctorProfileModal
          open={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          doctor={selectedDoctorProfile}
        />
      )}
    </>
  );
}
