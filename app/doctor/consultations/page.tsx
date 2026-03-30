import { Suspense } from 'react';
import { getConsultationsForHub } from '@/actions/doctor/consultation-hub';
import { ConsultationLedger } from '@/components/doctor/consultations/ConsultationLedger';
import { WaitingQueue } from '@/components/doctor/WaitingQueue';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import { 
  ClipboardCheck, 
  Users, 
  Stethoscope,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Consultations Hub | Nairobi Sculpt',
  description: 'Manage completed consultations and plan next steps.',
};

export default async function ConsultationsHubPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'DOCTOR') {
    redirect('/unauthorized');
  }

  const doctorRecord = await db.doctor.findUnique({
    where: { user_id: user.userId },
    select: { id: true }
  });

  if (!doctorRecord) {
    redirect('/unauthorized');
  }

  const doctorId = doctorRecord.id;

  // Fetch data in parallel
  const [hubData, waitingAppointments] = await Promise.all([
    getConsultationsForHub(doctorId),
    db.appointment.findMany({
      where: {
        doctor_id: doctorId,
        status: { in: [AppointmentStatus.READY_FOR_CONSULTATION, AppointmentStatus.CHECKED_IN] },
      },
      include: {
        patient: true,
      },
      orderBy: {
        checked_in_at: 'asc',
      },
      take: 20,
    }),
  ]);

  const completedConsultations = hubData.success ? hubData.data ?? [] : [];

  // Map Prisma appointments to AppointmentResponseDto for the WaitingQueue component
  const mappedWaitingQueue = waitingAppointments.map(apt => ({
    id: apt.id,
    patientId: apt.patient_id,
    doctorId: apt.doctor_id,
    appointmentDate: apt.appointment_date,
    time: apt.time,
    status: apt.status as any,
    type: apt.type,
    note: apt.note || undefined,
    reason: apt.reason || undefined,
    checkedInAt: apt.checked_in_at || undefined,
    patient: {
      id: apt.patient.id,
      firstName: apt.patient.first_name,
      lastName: apt.patient.last_name,
      fileNumber: apt.patient.file_number,
    }
  }));

  return (
    <div className="space-y-6">

      {/* Page header — matches frontdesk style */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Consultations Hub</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review completed sessions and manage next steps for your patients.
          </p>
        </div>
      </div>

      {/* Two-column layout — matches frontdesk grid pattern */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Main content: Ledger (2/3 width) ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Section heading */}
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Finalized Records</h2>
            {completedConsultations.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground font-medium">
                {completedConsultations.length} session{completedConsultations.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-xl" />}>
            <ConsultationLedger consultations={completedConsultations} />
          </Suspense>
        </div>

        {/* ── Sidebar: Queue (1/3 width) ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Waiting Queue</h2>
          </div>

          {waitingAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 border border-border rounded-xl bg-card text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Stethoscope className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No patients waiting</p>
              <p className="text-xs text-muted-foreground">
                Checked-in patients will appear here.
              </p>
            </div>
          ) : (
            <WaitingQueue appointments={mappedWaitingQueue as any[]} />
          )}
        </div>
      </div>
    </div>
  );
}