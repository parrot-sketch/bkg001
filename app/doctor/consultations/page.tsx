import { Suspense } from 'react';
import { getConsultationsForHub } from '@/actions/doctor/consultation-hub';
import { ConsultationLedger } from '@/components/doctor/consultations/ConsultationLedger';
import { WaitingQueue } from '@/components/doctor/WaitingQueue';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import { ClipboardCheck, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfDay, endOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function ConsultationsHubPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'DOCTOR') redirect('/unauthorized');

  const doctorRecord = await db.doctor.findUnique({
    where: { user_id: user.userId },
    select: { id: true },
  });
  if (!doctorRecord) redirect('/unauthorized');

  const doctorId = doctorRecord.id;
  const today = startOfDay(new Date());
  const tomorrow = endOfDay(new Date());

  const [hubData, waitingQueue] = await Promise.all([
    getConsultationsForHub(doctorId),
    db.patientQueue.findMany({
      where: {
        doctor_id: doctorId,
        status: { in: ['WAITING', 'IN_CONSULTATION'] },
        added_at: { gte: today, lt: tomorrow },
      },
      include: {
        patient: { select: { id: true, first_name: true, last_name: true, file_number: true } },
        appointment: { select: { id: true, type: true, appointment_date: true, time: true } },
      },
      orderBy: { added_at: 'asc' },
      take: 20,
    }),
  ]);

  const completedConsultations = hubData.success ? hubData.data ?? [] : [];

  const mappedWaitingQueue = waitingQueue.map(q => {
    const appointmentId = q.appointment?.id;

    if (!appointmentId) {
      console.warn('[ConsultationsHub] Queue entry missing appointment_id:', {
        queueId: q.id,
        patientId: q.patient_id,
        status: q.status,
        addedAt: q.added_at,
      });
    }

    return {
      id: appointmentId ?? q.id,
      patientId: q.patient_id,
      doctorId: q.doctor_id,
      appointmentDate: q.appointment?.appointment_date ?? null,
      time: q.appointment?.time ?? q.added_at.toISOString(),
      status: q.status,
      type: q.appointment?.type ?? 'Walk-in',
      note: q.notes ?? undefined,
      checkedInAt: q.added_at.toISOString(),
      patient: {
        id: q.patient.id,
        firstName: q.patient.first_name,
        lastName: q.patient.last_name,
        fileNumber: q.patient.file_number,
      },
    };
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[#121c1d]">Consultations</h1>
        <p className="text-sm text-slate-500">Completed sessions and waiting queue</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Completed consultations — 2/3 */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="h-4 w-4 text-[#0c5d69]" />
            <h2 className="text-sm font-semibold text-[#121c1d]">Completed</h2>
            {completedConsultations.length > 0 && (
              <span className="text-xs text-slate-400 ml-auto">{completedConsultations.length}</span>
            )}
          </div>
          <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-xl" />}>
            <ConsultationLedger consultations={completedConsultations} />
          </Suspense>
        </div>

        {/* Waiting queue — 1/3 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-[#0c5d69]" />
            <h2 className="text-sm font-semibold text-[#121c1d]">Queue</h2>
          </div>
          {waitingQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-slate-200 rounded-xl bg-white text-center">
              <Users className="h-6 w-6 text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">No patients waiting</p>
            </div>
          ) : (
            <WaitingQueue appointments={mappedWaitingQueue as any[]} />
          )}
        </div>
      </div>
    </div>
  );
}
