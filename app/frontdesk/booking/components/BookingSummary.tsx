import { User, Stethoscope, Calendar as CalendarIcon, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { format } from 'date-fns';

interface BookingSummaryProps {
  patient: PatientResponseDto | null;
  selectedDoctor: DoctorResponseDto | null;
  selectedDate: Date | undefined;
  selectedSlot: string | null;
  appointmentType: string;
  onAppointmentTypeChange: (value: string) => void;
  reason: string;
  onReasonChange: (value: string) => void;
  isSubmitting: boolean;
  onBook: () => void;
}

export function BookingSummary({
  patient,
  selectedDoctor,
  selectedDate,
  selectedSlot,
  appointmentType,
  onAppointmentTypeChange,
  reason,
  onReasonChange,
  isSubmitting,
  onBook,
}: BookingSummaryProps) {
  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start anim-fade-in-up">
      {/* Summary Card */}
      <div className="md:col-span-5 space-y-6">
         <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-6">Review details</h3>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 shrink-0 border border-slate-200">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Patient</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{patient?.firstName} {patient?.lastName}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 shrink-0 border border-slate-200">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Provider</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">Dr. {selectedDoctor?.firstName} {selectedDoctor?.lastName}</p>
                    <p className="text-sm text-slate-500">{selectedDoctor?.specialization}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 shrink-0 border border-slate-200">
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Schedule</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">
                      {selectedDate && format(selectedDate, 'EEEE, MMMM do')}
                    </p>
                    <p className="text-sm text-slate-500">at {selectedSlot}</p>
                  </div>
                </div>
              </div>
         </div>
         
      </div>

      {/* Final Inputs */}
      <div className="md:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
         <div className="space-y-6">
            <div className="space-y-2">
               <Label className="text-sm font-semibold text-slate-900">Type of consultation</Label>
               <Select value={appointmentType} onValueChange={onAppointmentTypeChange}>
                  <SelectTrigger className="h-11 rounded-md border-slate-300">
                     <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="Consultation">Standard Consultation</SelectItem>
                     <SelectItem value="Follow-up">Follow-up Visit</SelectItem>
                     <SelectItem value="Procedure">Surgical Procedure</SelectItem>
                     <SelectItem value="Treatment">Post-Op Treatment</SelectItem>
                  </SelectContent>
               </Select>
            </div>

            <div className="space-y-2">
               <Label className="text-sm font-semibold text-slate-900">Reason for visit</Label>
               <Textarea 
                  placeholder="Briefly describe the clinical reason for this visit..."
                  className="min-h-[120px] rounded-md border-slate-300 resize-none text-sm"
                  value={reason}
                  onChange={(e) => onReasonChange(e.target.value)}
               />
            </div>
         </div>

         <div className="pt-6 border-t border-slate-200">
            <Button 
               className="w-full h-11 bg-slate-900 hover:bg-black text-white"
               disabled={isSubmitting}
               onClick={onBook}
            >
               {isSubmitting ? (
                  <>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     Processing...
                  </>
               ) : (
                  <>
                     Finalize Appointment
                  </>
               )}
            </Button>
         </div>
      </div>
    </div>
  );
}
