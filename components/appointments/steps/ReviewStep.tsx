'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, FileText } from 'lucide-react';
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
  isFollowUp: boolean;
}

export function ReviewStep({
  formData,
  onFormDataChange,
  selectedPatient,
  selectedDoctor,
  isFollowUp
}: ReviewStepProps) {
  const doctorName = selectedDoctor
    ? `${selectedDoctor.title || ''} ${selectedDoctor.name || `${selectedDoctor.firstName} ${selectedDoctor.lastName}`}`.trim()
    : '';

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-[#2c2e4b] mb-1">Review & Submit Request</h3>
        <p className="text-xs text-[#2c2e4b]/60">Verify the appointment request details before submitting</p>
      </div>

      <div className="rounded-xl border border-[#0c5d69]/20 bg-[#0c5d69]/5 px-4 py-3 flex items-start gap-3">
        <Info className="h-4 w-4 text-[#0c5d69] mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-[#0c5d69]">Doctor Confirmation Required</p>
          <p className="text-[11px] text-[#2c2e4b]/60 mt-0.5">
            This appointment request will be sent to the doctor for approval. The doctor can confirm, reschedule, or cancel this request.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#e7d6bf] bg-[#e7d6bf]/10 p-4 space-y-3">
        <h4 className="font-semibold text-[#2c2e4b] flex items-center gap-2 text-xs">
          <FileText className="h-3.5 w-3.5 text-[#caa26a]" /> Appointment Summary
        </h4>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-[#2c2e4b]/50 mb-0.5">Patient</p>
            <p className="font-medium text-[#2c2e4b]">
              {selectedPatient?.firstName} {selectedPatient?.lastName}
            </p>
          </div>
          <div>
            <p className="text-[#2c2e4b]/50 mb-0.5">Doctor</p>
            <p className="font-medium text-[#2c2e4b]">{doctorName}</p>
          </div>
          <div>
            <p className="text-[#2c2e4b]/50 mb-0.5">Proposed Date</p>
            <p className="font-medium text-[#2c2e4b]">
              {formData.appointmentDate && format(new Date(formData.appointmentDate + 'T00:00:00'), 'EEE, MMM d, yyyy')}
            </p>
          </div>
          <div>
            <p className="text-[#2c2e4b]/50 mb-0.5">Proposed Time</p>
            <p className="font-medium text-[#2c2e4b] bg-[#caa26a]/15 px-2 py-0.5 rounded inline-block">
              {formData.selectedSlot}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#2c2e4b]">Appointment Type *</Label>
          <Select
            value={formData.type}
            onValueChange={(val) => onFormDataChange({ ...formData, type: val })}
          >
            <SelectTrigger className="border-[#e7d6bf] text-xs h-9 rounded-lg">
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

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#2c2e4b]">Notes (optional)</Label>
          <Textarea
            placeholder="Any additional notes for the doctor..."
            rows={3}
            value={formData.note}
            onChange={(e) => onFormDataChange({ ...formData, note: e.target.value })}
            className="border-[#e7d6bf] text-xs rounded-lg resize-none"
          />
        </div>
      </div>
    </div>
  );
}
