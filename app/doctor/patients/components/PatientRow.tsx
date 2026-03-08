'use client';

import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  Phone, 
  Clock, 
  Activity, 
  Droplets, 
  AlertTriangle, 
  Heart, 
  Shield 
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

interface PatientRowProps {
  patient: PatientResponseDto;
  appointmentCount: number;
  lastVisit?: Date;
}

export function PatientRow({
  patient,
  appointmentCount,
  lastVisit,
}: PatientRowProps) {
  const router = useRouter();
  const fullName = `${patient.firstName} ${patient.lastName}`;
  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase();

  const age = patient.age ?? (patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / 31557600000) : null);

  const hasAllergies = !!patient.allergies?.trim();
  const hasConditions = !!patient.medicalConditions?.trim();

  // Recency badge
  const recencyLabel = lastVisit
    ? differenceInDays(new Date(), lastVisit) <= 7
      ? 'This week'
      : differenceInDays(new Date(), lastVisit) <= 30
        ? 'This month'
        : format(lastVisit, 'MMM d, yyyy')
    : null;

  return (
    <div
      className="group flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => router.push(`/doctor/patients/${patient.id}`)}
    >
      {/* Avatar */}
      <Avatar className="h-10 w-10 rounded-lg flex-shrink-0">
        <AvatarImage src={patient.profileImage ?? undefined} alt={fullName} />
        <AvatarFallback
          className="rounded-lg text-xs font-bold text-white"
          style={{ backgroundColor: patient.colorCode || '#64748b' }}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800 truncate">{fullName}</p>
          {patient.fileNumber && (
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              {patient.fileNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {patient.gender && (
            <span className="text-[11px] text-slate-400 capitalize">{patient.gender.toLowerCase()}</span>
          )}
          {age !== null && (
            <>
              <span className="text-slate-200">·</span>
              <span className="text-[11px] text-slate-400">{age} yrs</span>
            </>
          )}
          {patient.bloodGroup && (
            <>
              <span className="text-slate-200">·</span>
              <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
                <Droplets className="h-2.5 w-2.5 text-red-400" />
                {patient.bloodGroup}
              </span>
            </>
          )}
          {patient.phone && (
            <>
              <span className="text-slate-200">·</span>
              <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                <Phone className="h-2.5 w-2.5" />
                {patient.phone}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Clinical Badges */}
      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
        {hasAllergies && (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-1.5 py-0 h-5 border gap-0.5">
            <AlertTriangle className="h-2.5 w-2.5" />
            Allergies
          </Badge>
        )}
        {hasConditions && (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold px-1.5 py-0 h-5 border gap-0.5">
            <Heart className="h-2.5 w-2.5" />
            Conditions
          </Badge>
        )}
        {patient.insuranceProvider && (
          <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-[10px] font-bold px-1.5 py-0 h-5 border gap-0.5">
            <Shield className="h-2.5 w-2.5" />
            Insured
          </Badge>
        )}
      </div>

      {/* Visit Stats */}
      <div className="hidden md:flex flex-col items-end gap-0.5 flex-shrink-0 min-w-[90px]">
        {recencyLabel && (
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {recencyLabel}
          </span>
        )}
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <Activity className="h-2.5 w-2.5" />
          {appointmentCount} visit{appointmentCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Action */}
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
    </div>
  );
}
