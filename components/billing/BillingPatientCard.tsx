'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaymentWithRelations } from '@/domain/interfaces/repositories/IPaymentRepository';

interface BillingPatientCardProps {
  payment: PaymentWithRelations;
  onViewRecord?: () => void;
}

export function BillingPatientCard({ payment, onViewRecord }: BillingPatientCardProps) {
  const patient = payment.patient;
  if (!patient) return null;

  const patientName = `${patient.firstName} ${patient.lastName}`;
  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase();

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
            {patient.img ? <AvatarImage src={patient.img} /> : null}
            <AvatarFallback className="rounded-md bg-[#e7d6bf] text-[#2c2e4b] text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[#2c2e4b] truncate">{patientName}</h3>
            {patient.fileNumber && (
              <p className="text-xs text-[#2c2e4b]/60 font-mono">File #{patient.fileNumber}</p>
            )}
          </div>
        </div>

        <Separator className="bg-[#e7d6bf]" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {patient.email && (
            <div className="flex items-center gap-2.5 text-sm text-[#2c2e4b]/70">
              <Mail className="h-4 w-4 text-[#caa26a] shrink-0" />
              <span className="truncate">{patient.email}</span>
            </div>
          )}
          {patient.phone && (
            <div className="flex items-center gap-2.5 text-sm text-[#2c2e4b]/70">
              <Phone className="h-4 w-4 text-[#caa26a] shrink-0" />
              <span>{patient.phone}</span>
            </div>
          )}
        </div>

        {onViewRecord && (
          <Button
            variant="outline"
            className="w-full rounded-lg text-sm font-medium border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
            onClick={onViewRecord}
          >
            View Full Patient Record
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function UserIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 6v11.25a2.25 2.25 0 002.25 2.25z" /></svg>;
}
