import { Stethoscope, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfileImage } from '@/components/profile-image';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

interface DoctorSelectionProps {
  doctors: DoctorResponseDto[];
  selectedDoctor: DoctorResponseDto | null;
  onSelect: (doctor: DoctorResponseDto) => void;
}

export function DoctorSelection({ doctors, selectedDoctor, onSelect }: DoctorSelectionProps) {
  return (
    <div className="space-y-12">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-brand-primary/80 tracking-widest uppercase mb-4">
          Step 01
        </p>
        <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-[1.1] tracking-tight">Choose a provider</h2>
        <p className="text-lg text-slate-600 leading-relaxed mt-4">Select the healthcare professional who will be conducting your consultation.</p>
      </div>

      <div className="max-w-4xl space-y-3">
        {doctors.map((doctor) => {
          const displayName = doctor.name || `${doctor.firstName} ${doctor.lastName}`.trim();
          const isSelected = selectedDoctor?.id === doctor.id;

          return (
            <div 
              key={doctor.id}
              className={cn(
                "group flex items-center gap-6 p-5 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer",
                isSelected 
                  ? "border-brand-primary bg-[#f4f1e8]/40 shadow-xl shadow-brand-primary/10" 
                  : "border-transparent hover:border-slate-200 hover:bg-white hover:shadow-md"
              )}
              onClick={() => onSelect(doctor)}
            >
              <div className="relative shrink-0">
                <div className={cn(
                  "h-20 w-20 rounded-2xl overflow-hidden ring-4 transition-all duration-300",
                  isSelected ? "ring-brand-primary/20 shadow-lg" : "ring-slate-100"
                )}>
                <ProfileImage 
                  url={doctor.profileImage} 
                  name={displayName} 
                  className="h-full w-full object-cover"
                />
                </div>
                {isSelected && (
                  <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-brand-primary border-4 border-white flex items-center justify-center text-white shadow-lg animate-in zoom-in-50 duration-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className={cn(
                    "text-xl font-bold tracking-tight transition-colors leading-tight",
                    isSelected ? "text-slate-900" : "text-slate-800 group-hover:text-brand-primary"
                  )}>
                    {doctor.title ? (displayName.startsWith(doctor.title) ? displayName : `${doctor.title} ${displayName}`) : (displayName.startsWith('Dr.') ? displayName : `Dr. ${displayName}`)}
                  </h3>
                  {isSelected && (
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-brand-primary text-white px-2 py-0.5 rounded-full">
                      Selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                  <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5 text-brand-primary/60" />
                    {doctor.specialization || 'Clinical Specialist'}
                  </p>
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  <p className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-300" />
                    Next available tomorrow
                  </p>
                </div>
              </div>

              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                isSelected ? "bg-brand-primary text-white shadow-lg" : "bg-slate-100 text-slate-400 group-hover:bg-brand-primary/10 group-hover:text-brand-primary"
              )}>
                <ChevronRight className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
