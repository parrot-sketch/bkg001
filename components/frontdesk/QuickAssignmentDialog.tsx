'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Stethoscope, Send, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { patientApi } from '@/lib/api/patient';
import { assignPatientToQueue } from '@/app/actions/appointment';
import { PatientCombobox } from '@/components/frontdesk/PatientCombobox';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

interface QuickAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function QuickAssignmentDialog({ open, onOpenChange, onSuccess }: QuickAssignmentDialogProps) {
  const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        // Reset form
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-cyan-600" />
            Quick Patient Assignment
          </DialogTitle>
          <DialogDescription>
            Instantly add a patient to a doctor's queue. No appointment needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Patient</Label>
            <PatientCombobox
              value={selectedPatient?.id || ''}
              onSelect={(patientId, patient) => {
                setSelectedPatient(patient || null);
              }}
            />
          </div>

          {/* Doctor Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Doctor</Label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              disabled={loadingDoctors}
            >
              <option value="">
                {loadingDoctors ? 'Loading doctors...' : 'Select a doctor'}
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

          {/* Selected Patient Preview */}
          {selectedPatient && (
            <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-100">
              <p className="text-sm font-medium text-cyan-900">
                {selectedPatient.firstName} {selectedPatient.lastName}
              </p>
              <p className="text-xs text-cyan-700">
                File: {selectedPatient.fileNumber} • {selectedPatient.age} yrs • {selectedPatient.gender}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedPatient || !selectedDoctorId || isSubmitting}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Add to Queue
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
