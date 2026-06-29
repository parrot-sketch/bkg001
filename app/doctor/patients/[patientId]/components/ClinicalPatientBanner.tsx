'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { calculateAge } from '@/lib/utils';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { ShieldAlert, ShieldCheck, Mail, Phone, MapPin, User, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClinicalPatientBannerProps {
  patient: PatientResponseDto;
}

export function ClinicalPatientBanner({ patient }: ClinicalPatientBannerProps) {
  const [showAdmin, setShowAdmin] = useState(false);
  const patientName = `${patient.lastName.toUpperCase()}, ${patient.firstName}`;
  
  const dobFormatted = patient.dateOfBirth 
    ? format(new Date(patient.dateOfBirth), 'MMM d, yyyy') 
    : '—';

  return (
    <div className="bg-white border border-slate-200 shadow-sm p-6 space-y-5 animate-in fade-in duration-300">
      {/* Top Section: Name and Alerts */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">{patientName}</h1>
            <span className="px-2 py-0.5 text-[9px] font-semibold bg-slate-100 text-slate-700 uppercase tracking-wider font-mono border border-slate-200 rounded">
              Chart #{patient.fileNumber}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            Electronic Medical Record
          </p>
        </div>

        {/* Alerts Banner */}
        <div className="w-full md:max-w-md shrink-0">
          {patient.allergies ? (
            <div className="flex items-start gap-2.5 bg-rose-50 border-l-4 border-rose-500 p-3 text-rose-900 rounded-r-md">
              <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-[10px]">
                <span className="font-bold uppercase tracking-wider">Allergies Alert:</span>{' '}
                <span className="font-semibold">{patient.allergies}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-emerald-50 border-l-4 border-emerald-500 p-3 text-emerald-900 rounded-r-md">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="text-[10px] font-semibold">No known drug or food allergies</div>
            </div>
          )}
        </div>
      </div>

      {/* Clinical Demographics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-slate-100 text-xs">
        <div>
          <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Date of Birth</span>
          <span className="font-semibold text-slate-800 font-mono text-[10px]">{dobFormatted}</span>
        </div>
        <div>
          <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Age / Sex</span>
          <span className="font-semibold text-slate-800 text-[10px]">
            {patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} yrs` : `${patient.age} yrs`} · {patient.gender}
          </span>
        </div>
        <div>
          <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Blood Group</span>
          <span className="font-semibold text-slate-850 font-mono text-[10px] text-blue-700">
            {patient.bloodGroup || 'Not Documented'}
          </span>
        </div>
        <div>
          <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Last Visit</span>
          <span className="font-semibold text-slate-850 text-[10px]">
            {patient.lastVisitDate ? format(new Date(patient.lastVisitDate), 'MMM d') : 'No visits'}
          </span>
        </div>
        <div className="flex items-end justify-start sm:justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdmin(!showAdmin)}
            className="h-7 text-[9px] font-medium text-slate-500 hover:text-slate-900 p-0 hover:bg-transparent"
          >
            {showAdmin ? (
              <span className="flex items-center gap-1">Hide <ChevronUp className="h-3 w-3" /></span>
            ) : (
              <span className="flex items-center gap-1">Show <ChevronDown className="h-3 w-3" /></span>
            )}
          </Button>
        </div>
      </div>

      {/* Admin Panel (Collapsible) */}
      {showAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 bg-slate-50/50 p-4 rounded-md animate-in slide-in-from-top-1 duration-200">
          {/* Contact Details */}
          <div className="space-y-2">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Phone className="h-3 w-3 text-slate-400" /> Contact Info
            </h3>
<div className="text-[10px] space-y-1 text-slate-700">
               <p><span className="font-medium">Phone:</span> {patient.phone || '—'}</p>
               <p><span className="font-medium">Email:</span> {patient.email || '—'}</p>
               <p className="truncate"><span className="font-medium">Address:</span> {patient.address || '—'}</p>
             </div>
           </div>

           {/* Emergency Contact */}
           <div className="space-y-2">
             <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
               <User className="h-3 w-3 text-slate-400" /> Emergency Contact
             </h3>
             <div className="text-[10px] space-y-1 text-slate-700">
               {patient.emergencyContactName ? (
                 <>
                   <p className="font-semibold text-slate-800">{patient.emergencyContactName}</p>
                   <p><span className="font-medium">Relationship:</span> {patient.relation || '—'}</p>
                   <p><span className="font-medium">Phone:</span> {patient.emergencyContactNumber || '—'}</p>
                 </>
               ) : (
                 <p className="text-slate-400 italic">None Documented</p>
               )}
             </div>
           </div>

           {/* Insurance details */}
           <div className="space-y-2">
             <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
               <FileText className="h-3 w-3 text-slate-400" /> Insurance & Admin
             </h3>
             <div className="text-[10px] space-y-1 text-slate-700">
               <p><span className="font-medium">Provider:</span> {patient.insuranceProvider || '—'}</p>
               <p><span className="font-medium">Policy No:</span> {patient.insuranceNumber || '—'}</p>
               <p><span className="font-medium">Marital Status:</span> {patient.maritalStatus || '—'}</p>
             </div>
           </div>
         </div>
       )}
    </div>
  );
}
