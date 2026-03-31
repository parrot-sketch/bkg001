'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Stethoscope, Send } from 'lucide-react';
import { toast } from 'sonner';
import { patientApi } from '@/lib/api/patient';
import { assignPatientToQueue } from '@/app/actions/appointment';
import { PatientCombobox } from '@/components/frontdesk/PatientCombobox';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { ProfileImage } from '@/components/profile-image';

interface QuickAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialPatientId?: string;
  initialPatientName?: string;
}

export function QuickAssignmentDialog({
  open,
  onOpenChange,
  onSuccess,
  initialPatientId,
  initialPatientName,
}: QuickAssignmentDialogProps) {
  const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-select patient when initialPatientId is provided
  useEffect(() => {
    if (open && initialPatientId) {
      setSelectedPatient({
        id: initialPatientId,
        firstName: initialPatientName?.split(' ')[0] || '',
        lastName: initialPatientName?.split(' ').slice(1).join(' ') || '',
        fileNumber: '',
        fullName: initialPatientName || '',
        dateOfBirth: new Date(),
        age: 0,
        gender: '',
        email: '',
        phone: '',
        address: '',
        maritalStatus: '',
        emergencyContactName: '',
        emergencyContactNumber: '',
        relation: '',
        hasPrivacyConsent: true,
        hasServiceConsent: true,
        hasMedicalConsent: true,
      } as PatientResponseDto);
    }
  }, [open, initialPatientId, initialPatientName]);

  useEffect(() => {
    async function fetchDoctors() {
      try {
        const response = await patientApi.getAllDoctors();
        if (response.success && response.data) {
          setDoctors(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch doctors:', error);
      } finally {
        setLoadingDoctors(false);
      }
    }
    if (open) {
      fetchDoctors();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedPatient || !selectedDoctorId) {
      toast.error('Please select a patient and doctor');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await assignPatientToQueue({
        patientId: selectedPatient.id,
        doctorId: selectedDoctorId,
        notes: 'Added via Quick Assignment',
      });

      if (result.success) {
        toast.success(`${selectedPatient.firstName} ${selectedPatient.lastName} added to queue`);
        setSelectedPatient(null);
        setSelectedDoctorId('');
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.msg || 'Failed to add patient to queue');
      }
    } catch (error) {
      console.error('Error assigning patient:', error);
      toast.error('An error occurred while assigning patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedPatient(null);
    setSelectedDoctorId('');
    onOpenChange(false);
  };

  const hasPreselectedPatient = !!initialPatientId;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm animate-in fade-in-0 zoom-in-95 duration-200">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-lg bg-cyan-100 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-cyan-600" />
            </div>
            Add to Queue
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {hasPreselectedPatient
              ? `Assign ${initialPatientName} to a doctor's queue`
              : 'Assign patient directly to a doctor\'s queue'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Patient Selection — only show if no pre-selected patient */}
          {!hasPreselectedPatient && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Patient</Label>
              <PatientCombobox
                value={selectedPatient?.id || ''}
                onSelect={(patientId, patient) => {
                  setSelectedPatient(patient || null);
                }}
              />
            </div>
          )}

          {/* Pre-selected Patient Preview */}
          {hasPreselectedPatient && selectedPatient && (
            <div className="p-2.5 rounded-lg bg-cyan-50/80 border border-cyan-100">
              <p className="text-sm font-medium text-cyan-900">
                {selectedPatient.firstName} {selectedPatient.lastName}
              </p>
              {selectedPatient.fileNumber && (
                <p className="text-xs text-cyan-600 mt-0.5">
                  {selectedPatient.fileNumber}
                </p>
              )}
            </div>
          )}

          {/* Doctor Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Doctor</Label>
            <select
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              disabled={loadingDoctors}
            >
              <option value="">
                {loadingDoctors ? 'Loading...' : 'Select doctor'}
              </option>
              {doctors.map((doctor) => {
                const docName = doctor.name || `${doctor.firstName} ${doctor.lastName}`;
                const displayName = doctor.title && !docName.toLowerCase().startsWith(doctor.title.toLowerCase())
                  ? `${doctor.title} ${docName}`
                  : docName;
                return (
                  <option key={doctor.id} value={doctor.id}>
                    {displayName} - {doctor.specialization || 'General'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selected Patient Preview — for non-preselected flow */}
          {!hasPreselectedPatient && selectedPatient && (
            <div className="p-2.5 rounded-lg bg-cyan-50/80 border border-cyan-100">
              <p className="text-sm font-medium text-cyan-900">
                {selectedPatient.firstName} {selectedPatient.lastName}
              </p>
              <p className="text-xs text-cyan-600 mt-0.5">
                {selectedPatient.fileNumber} • {selectedPatient.age} yrs • {selectedPatient.gender}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-8 px-3 text-xs rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedPatient || !selectedDoctorId || isSubmitting}
            className="h-8 px-3 text-xs rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-all duration-200"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Add to Queue
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
