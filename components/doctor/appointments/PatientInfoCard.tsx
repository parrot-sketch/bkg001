'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, AlertTriangle, ChevronRight } from 'lucide-react';
import { DetailRow } from '@/components/doctor/appointments/DetailRow';

interface PatientInfoCardProps {
  patientName: string;
  patientInitials: string;
  patientImg?: string | null;
  fileNumber?: string | null;
  age?: number;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  allergies?: string;
  patientId: string;
  onViewRecord: () => void;
}

export function PatientInfoCard({
  patientName,
  patientInitials,
  patientImg,
  fileNumber,
  age,
  gender,
  email,
  phone,
  allergies,
  onViewRecord,
}: PatientInfoCardProps) {
  return (
    <div className="border border-[#e7d6bf] bg-white">
      <div className="px-4 py-3 border-b border-[#e7d6bf]">
        <div className="text-sm font-semibold text-[#2c2e4b] flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-[#caa26a]" />
          Patient
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 rounded-md border border-[#e7d6bf]">
            {patientImg ? <AvatarImage src={patientImg} /> : null}
            <AvatarFallback className="rounded-md bg-[#e7d6bf] text-[#2c2e4b] text-sm font-semibold">
              {patientInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[#2c2e4b] truncate">{patientName}</h3>
            {fileNumber && (
              <p className="text-xs text-[#2c2e4b]/60 font-mono">File #{fileNumber}</p>
            )}
            {age !== undefined && (
              <p className="text-xs text-[#2c2e4b]/60 mt-0.5">
                {age} years old {gender ? ` • ${gender}` : ''}
              </p>
            )}
          </div>
        </div>

        <Separator className="bg-[#e7d6bf]" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {email && (
            <div className="flex items-center gap-2.5 text-sm text-[#2c2e4b]/70">
              <Mail className="h-4 w-4 text-[#caa26a] shrink-0" />
              <span className="truncate">{email}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2.5 text-sm text-[#2c2e4b]/70">
              <Phone className="h-4 w-4 text-[#caa26a] shrink-0" />
              <span>{phone}</span>
            </div>
          )}
          {allergies && (
            <div className="flex items-start gap-2.5 text-sm text-red-700 col-span-full">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <span><strong>Allergies:</strong> {allergies}</span>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full rounded-lg text-sm font-medium border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
          onClick={onViewRecord}
        >
          View Full Patient Record
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function UserIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 6v11.25a2.25 2.25 0 002.25 2.25z" /></svg>;
}
