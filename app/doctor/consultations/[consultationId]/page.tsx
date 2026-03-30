import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { ConsultationWorkspaceOptimized } from '@/components/consultation/ConsultationWorkspaceOptimized';
import { ConsultationProvider } from '@/contexts/ConsultationContext';
import { ConsultationSessionHeader } from '@/components/consultation/ConsultationSessionHeader';
import { ConsultationState } from '@/domain/enums/ConsultationState';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface ConsultationDetailPageProps {
  params: Promise<{
    consultationId: string;
  }>;
}

export default async function ConsultationDetailPage({ params }: ConsultationDetailPageProps) {
  const { consultationId: consultationIdParam } = await params;
  const user = await getCurrentUser();
  const userId = user?.userId;

  if (!userId) {
    redirect('/login');
  }

  const doctorRecord = await db.doctor.findUnique({
    where: { user_id: userId },
    select: { id: true }
  });

  if (!doctorRecord) {
    redirect('/unauthorized');
  }

  const doctorId = doctorRecord.id;

  const consultationId = parseInt(consultationIdParam);
  if (isNaN(consultationId)) {
    notFound();
  }

  const consultation = await db.consultation.findUnique({
    where: { id: consultationId },
    include: {
      appointment: {
        include: {
          patient: true,
        },
      },
    },
  });

  if (!consultation || consultation.doctor_id !== doctorId) {
    notFound();
  }

  const patient = consultation.appointment.patient;
  const patientName = `${patient.first_name} ${patient.last_name}`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Read-Only Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="h-9 px-2 text-slate-500 hover:text-slate-900 -ml-2">
              <Link href="/doctor/consultations">
                <ChevronLeft className="h-5 w-5 mr-1" />
                Back to Hub
              </Link>
            </Button>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex flex-col">
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none mb-1">
                Clinical Record: {patientName}
              </h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold uppercase h-4 px-1.5 translate-y-[1px]">
                  COMPLETED
                </Badge>
                <span className="text-[10px] text-slate-400 font-medium">
                  Ref: #{consultation.id} • {consultation.appointment.type}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <Button variant="outline" size="sm" className="h-9 text-xs font-bold rounded-xl border-slate-200">
               Export PDF
             </Button>
             <Button variant="outline" size="sm" className="h-9 text-xs font-bold rounded-xl border-slate-200">
               Share with Patient
             </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-6 md:p-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden h-[calc(100vh-12rem)] min-h-[600px]">
          <ConsultationProvider initialAppointmentId={consultation.appointment_id}>
            <ConsultationWorkspaceOptimized />
          </ConsultationProvider>
        </div>
      </div>
    </div>
  );
}
