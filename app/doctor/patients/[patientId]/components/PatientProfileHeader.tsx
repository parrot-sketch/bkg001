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
    if (email) window.open(`mailto:${email}`, '_blank');
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {/* ── Left: breadcrumb + title ────────────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Back buttons */}
        <div className="flex items-center gap-1">
          {fromConsultation && consultationAppointmentId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                router.push(`/doctor/consultations/session/${consultationAppointmentId}`)
              }
              className="h-7 px-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span className="text-[10px] font-medium">Consultation</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToPatients}
            className="h-7 px-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            <span className="text-[10px] font-medium">Patients</span>
          </Button>
        </div>

        {/* Divider */}
        <span className="text-white/20 text-sm select-none">/</span>

        {/* Title */}
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-white truncate">
            {patientName || 'Patient Profile'}
          </h1>
          {fileNumber && (
            <p className="text-[10px] text-white/40 font-mono mt-0.5">
              Chart #{fileNumber}
            </p>
          )}
        </div>
      </div>

      {/* ── Right: action buttons ───────────────────────────────────────── */}
      {(whatsappPhone || phone || email) && (
        <div className="flex items-center gap-1.5 shrink-0">
          {(whatsappPhone || phone) && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleWhatsApp}
              title="WhatsApp patient"
              className="h-7 px-2.5 text-[10px] font-medium border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white rounded-lg gap-1"
            >
              <MessageCircle className="h-3 w-3" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
          )}
          {email && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleEmail}
              title="Email patient"
              className="h-7 px-2.5 text-[10px] font-medium border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white rounded-lg gap-1"
            >
              <Mail className="h-3 w-3" />
              <span className="hidden sm:inline">Email</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
