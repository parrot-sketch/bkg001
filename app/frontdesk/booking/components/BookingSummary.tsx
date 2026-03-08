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
         <Card className="rounded-[2.5rem] border-slate-100 overflow-hidden bg-white shadow-sm ring-1 ring-slate-100/50">
           <CardContent className="p-10">
              <p className="text-xs font-semibold text-brand-primary/60 tracking-[0.2em] uppercase mb-4">
                Consultation Summary
              </p>
              <h3 className="text-3xl font-bold text-slate-900 mb-10 tracking-tight leading-[1.1]">Review details</h3>
              
              <div className="space-y-8">
                <div className="flex gap-5">
                  <div className="h-12 w-12 rounded-2xl bg-[#f4f1e8]/60 flex items-center justify-center text-brand-primary shrink-0 border border-brand-primary/5">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patient Profile</p>
                    <p className="text-base font-bold text-slate-900 mt-1">{patient?.firstName} {patient?.lastName}</p>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="h-12 w-12 rounded-2xl bg-brand-powder/10 flex items-center justify-center text-brand-primary shrink-0 border border-brand-primary/5">
                    <Stethoscope className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Specialist</p>
                    <p className="text-base font-bold text-slate-900 mt-1">Dr. {selectedDoctor?.firstName} {selectedDoctor?.lastName}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{selectedDoctor?.specialization}</p>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-brand-secondary shrink-0 border border-brand-secondary/5">
                    <CalendarIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Schedule</p>
                    <p className="text-base font-bold text-slate-900 mt-1">
                      {selectedDate && format(selectedDate, 'EEEE, MMMM do')}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">at {selectedSlot}</p>
                  </div>
                </div>
              </div>
           </CardContent>
         </Card>
         
         <div className="bg-[#0f172a] rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/20 rounded-full translate-x-10 -translate-y-10 blur-3xl group-hover:bg-brand-primary/30 transition-all duration-700" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                 <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                   <AlertCircle className="h-4 w-4 text-brand-powder" />
                 </div>
                 <p className="text-sm font-bold tracking-tight">Security & Privacy</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Patient confidentiality is our priority. Your session remains secure and HIPAA-compliant. Confirmations will be sent via our encrypted messaging platform.
              </p>
            </div>
         </div>
      </div>

      {/* Final Inputs */}
      <div className="md:col-span-7 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 space-y-10 ring-1 ring-slate-100/50">
         <div className="space-y-8">
            <div className="space-y-3">
               <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Type of consultation</Label>
               <Select value={appointmentType} onValueChange={onAppointmentTypeChange}>
                  <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 hover:bg-white hover:border-brand-primary/20 transition-all focus:ring-brand-primary/20">
                     <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2">
                     <SelectItem value="Consultation" className="rounded-xl">Standard Consultation</SelectItem>
                     <SelectItem value="Follow-up" className="rounded-xl">Follow-up Visit</SelectItem>
                     <SelectItem value="Procedure" className="rounded-xl">Surgical Procedure</SelectItem>
                     <SelectItem value="Treatment" className="rounded-xl">Post-Op Treatment</SelectItem>
                  </SelectContent>
               </Select>
            </div>

            <div className="space-y-3">
               <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Reason for visit</Label>
               <Textarea 
                  placeholder="Briefly describe the clinical reason for this visit..."
                  className="min-h-[160px] rounded-[1.5rem] border-slate-100 bg-slate-50/50 focus:bg-white focus:border-brand-primary/20 transition-all resize-none p-5 text-base leading-relaxed"
                  value={reason}
                  onChange={(e) => onReasonChange(e.target.value)}
               />
            </div>
         </div>

         <div className="pt-10 border-t border-slate-100 space-y-5">
            <Button 
               className="w-full h-16 rounded-[1.5rem] bg-brand-primary hover:bg-brand-primary/90 text-white text-lg font-bold shadow-2xl shadow-brand-primary/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
               disabled={isSubmitting}
               onClick={onBook}
            >
               {isSubmitting ? (
                  <>
                     <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                     Processing...
                  </>
               ) : (
                  <>
                     Finalize Appointment
                     <ArrowRight className="ml-3 h-5 w-5" />
                  </>
               )}
            </Button>
            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
               Secure clinical submission
            </p>
         </div>
      </div>
    </div>
  );
}
