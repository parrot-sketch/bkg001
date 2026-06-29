'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, Mail } from 'lucide-react';

interface PatientProfileHeaderProps {
  patientName?: string;
  fileNumber?: string;
  email?: string;
  phone?: string;
  whatsappPhone?: string;
  fromConsultation: boolean;
  consultationAppointmentId: string | null;
  onBackToPatients: () => void;
}

export function PatientProfileHeader({
  patientName,
  fileNumber,
  email,
  phone,
  whatsappPhone,
  fromConsultation,
  consultationAppointmentId,
  onBackToPatients,
}: PatientProfileHeaderProps) {
  const router = useRouter();

  const handleWhatsApp = () => {
    const targetPhone = whatsappPhone || phone;
    if (targetPhone) {
      const sanitizedPhone = targetPhone.replace(/\D/g, '');
      window.open(`https://wa.me/${sanitizedPhone}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleEmail = () => {
    if (email) {
      window.open(`mailto:${email}`, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {fromConsultation && consultationAppointmentId ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/doctor/consultations/session/${consultationAppointmentId}`)}
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                <span className="text-[10px] font-medium">Back</span>
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToPatients}
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              <span className="text-[10px] font-medium">Patients</span>
            </Button>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">{patientName || 'Patient Profile'}</h1>
            <p className="text-[10px] text-slate-400 mt-0.5 tracking-wide">Medical Record • Chart #{fileNumber || '—'}</p>
          </div>
        </div>
        {(whatsappPhone || phone || email) && (
          <div className="flex items-center gap-1.5">
            {(whatsappPhone || phone) && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleWhatsApp}
                className="h-7 text-[10px] font-medium border-slate-200 bg-white hover:bg-slate-50"
                title="WhatsApp patient"
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                <span>WhatsApp</span>
              </Button>
            )}
            {email && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleEmail}
                className="h-7 text-[10px] font-medium border-slate-200 bg-white hover:bg-slate-50"
                title="Email patient"
              >
                <Mail className="h-3 w-3 mr-1" />
                <span>Email</span>
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="border-b border-slate-200"></div>
    </div>
  );
}
