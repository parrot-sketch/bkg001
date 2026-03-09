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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Select Provider</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
        {doctors.map((doctor) => {
          const displayName = doctor.name || `${doctor.firstName} ${doctor.lastName}`.trim();
          const isSelected = selectedDoctor?.id === doctor.id;

          return (
            <div 
              key={doctor.id}
              className={cn(
                "group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                isSelected 
                  ? "border-brand-primary bg-brand-primary/5 shadow-sm ring-1 ring-brand-primary" 
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
              onClick={() => onSelect(doctor)}
            >
              <div className="relative shrink-0">
                <div className="h-14 w-14 rounded-full overflow-hidden bg-slate-100">
                  <ProfileImage 
                    url={doctor.profileImage} 
                    name={displayName} 
                    className="h-full w-full object-cover"
                  />
                </div>
                {isSelected && (
                  <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-brand-primary border-2 border-white flex items-center justify-center text-white">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
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
                <div className="mt-1">
                  <p className="text-sm text-slate-500">
                    {doctor.specialization || 'Clinical Specialist'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
