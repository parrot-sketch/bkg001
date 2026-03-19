'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info, FileText, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { cn } from '@/lib/utils';

interface FormData {
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  selectedSlot: string | null;
  type: string;
  reason: string;
  note: string;
}

interface ReviewStepProps {
  formData: FormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<FormData>>;
  selectedPatient: PatientResponseDto | null;
  selectedDoctor: DoctorResponseDto | null;
  sameDoctorConflict: any;
  differentDoctorAppointments: any[];
  isFollowUp: boolean;
}

export function ReviewStep({
  formData,
  onFormDataChange,
  selectedPatient,
  selectedDoctor,
  sameDoctorConflict,
  differentDoctorAppointments,
  isFollowUp
}: ReviewStepProps) {
  const doctorName = selectedDoctor
    ? `${selectedDoctor.title || ''} ${selectedDoctor.name || `${selectedDoctor.firstName} ${selectedDoctor.lastName}`}`.trim()
    : '';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Review & Confirm</h3>
        <p className="text-sm text-slate-500">Verify appointment details before confirming</p>
      </div>

      {/* Conflict Warnings */}
      {sameDoctorConflict && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Existing Appointment</AlertTitle>
          <AlertDescription className="text-amber-800 text-sm">
            Patient already has an appointment with this doctor on{' '}
            <strong>{format(new Date(formData.appointmentDate), 'MMMM d, yyyy')}</strong>
          </AlertDescription>
        </Alert>
      )}

      {!sameDoctorConflict && differentDoctorAppointments.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Multiple Appointments</AlertTitle>
          <AlertDescription className="text-blue-800 text-sm">
            Patient has {differentDoctorAppointments.length} other appointment(s) on this date
          </AlertDescription>
        </Alert>
      )}

      {/* Appointment Summary */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-4">
        <h4 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-cyan-600" /> Appointment Summary
        </h4>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Patient</p>
            <p className="font-medium text-slate-900">
              {selectedPatient?.firstName} {selectedPatient?.lastName}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Doctor</p>
            <p className="font-medium text-slate-900">{doctorName}</p>
          </div>
          <div>
            <p className="text-slate-500">Date</p>
            <p className="font-medium text-slate-900">
              {formData.appointmentDate && format(new Date(formData.appointmentDate), 'EEE, MMM d, yyyy')}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Time</p>
            <p className="font-medium text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded inline-block">
              {formData.selectedSlot}
            </p>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Appointment Type *</Label>
          <Select
            value={formData.type}
            onValueChange={(val) => onFormDataChange({ ...formData, type: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select appointment type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Initial Consultation">Initial Consultation</SelectItem>
              <SelectItem value="Follow-up">Follow-up</SelectItem>
              <SelectItem value="Routine Checkup">Routine Checkup</SelectItem>
              <SelectItem value="Procedure">Procedure</SelectItem>
              <SelectItem value="Emergency">Emergency</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Textarea
            placeholder="Any additional notes for the doctor..."
            rows={3}
            value={formData.note}
            onChange={(e) => onFormDataChange({ ...formData, note: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
