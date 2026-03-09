'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Camera, AlertTriangle } from 'lucide-react';

interface PatientIdentityProps {
  patient: any;
  age: number | null;
  isFirstTime: boolean;
  photoCount: number;
}

export function PatientIdentity({ patient, age, isFirstTime, photoCount }: PatientIdentityProps) {
  return (
    <div className="p-5 pb-4">
      <div className="flex items-center gap-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm"
        >
          <span className="text-base font-bold text-indigo-600">
            {patient.firstName?.[0]}{patient.lastName?.[0]}
          </span>
        </motion.div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-slate-900 truncate tracking-tight">
            {patient.firstName} {patient.lastName}
          </h2>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
            {age !== null && <span className="text-slate-700 font-bold">{age}Y</span>}
            {age !== null && patient.gender && <span className="opacity-30">•</span>}
            {patient.gender && <span className="uppercase tracking-wider text-[10px] font-bold text-slate-600">{patient.gender.toLowerCase()}</span>}
            {patient.fileNumber && (
              <>
                <span className="opacity-30">•</span>
                <span className="font-mono text-[10px] text-slate-500">{patient.fileNumber}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {isFirstTime && (
          <Badge variant="outline" className="text-[10px] h-5 bg-indigo-50 text-indigo-600 border-indigo-100 font-bold px-2">
            NEW PATIENT
          </Badge>
        )}
        {photoCount > 0 && (
          <Badge variant="outline" className="text-[10px] h-5 gap-1.5 border-slate-200 text-slate-600 font-bold px-2 bg-slate-50">
            <Camera className="h-2.5 w-2.5 opacity-70" />
            {photoCount} PHOTOS
          </Badge>
        )}
        {patient.allergies && (
          <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-100 gap-1.5 font-bold px-2">
            <AlertTriangle className="h-2.5 w-2.5" />
            ALLERGIES
          </Badge>
        )}
      </div>
    </div>
  );
}
