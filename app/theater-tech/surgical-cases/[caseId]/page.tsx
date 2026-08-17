'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Edit3,
} from 'lucide-react';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { queryKeys } from '@/lib/constants/queryKeys';
import { EditSurgicalCaseDialog } from '@/components/frontdesk/EditSurgicalCaseDialog';
import { RecordVitalsDialog } from '@/components/theater-tech/RecordVitalsDialog';
import { TheaterBookingSectionWrapper } from '@/components/theater-tech/booking/TheaterBookingSectionWrapper';
import { TheaterTechBillingInline } from '@/components/theater-tech/TheaterTechBillingInline';
import { TheaterBookingDialog } from '@/components/theater-tech/booking/TheaterBookingDialog';
import {
  ProcedureDetailsCard,
  AssociatedProceduresCard,
  CasePlanCard,
  VitalsCard,
  PatientInfoCard,
  SurgeonCard,
  ActionsCard,
} from '@/components/theater-tech/surgical-case-details';
import type { FrontdeskSurgicalCaseListItem } from '@/lib/api/frontdesk';
import { Card, CardContent } from '@/components/ui/card';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
  PLANNING: { label: 'Planning', className: 'border border-amber-300 bg-amber-100 text-amber-800' },
  READY_FOR_SCHEDULING: { label: 'Ready for Scheduling', className: 'border border-blue-300 bg-blue-100 text-blue-800' },
  READY_FOR_WARD_PREP: { label: 'Ward Prep', className: 'border border-emerald-300 bg-emerald-100 text-emerald-800' },
  IN_WARD_PREP: { label: 'In Ward Prep', className: 'border border-amber-300 bg-amber-100 text-amber-800' },
  READY_FOR_THEATER_BOOKING: { label: 'Ready for Booking', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
  SCHEDULED: { label: 'Scheduled', className: 'border border-indigo-300 bg-indigo-100 text-indigo-800' },
  IN_PREP: { label: 'In Prep', className: 'border border-amber-300 bg-amber-100 text-amber-800' },
  IN_THEATER: { label: 'In Theater', className: 'border border-red-300 bg-red-100 text-red-800' },
  RECOVERY: { label: 'Recovery', className: 'border border-emerald-300 bg-emerald-100 text-emerald-800' },
  COMPLETED: { label: 'Completed', className: 'border border-emerald-300 bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', className: 'border border-red-300 bg-red-100 text-red-800' },
};

interface CaseDetailsPageProps {
  params: Promise<{ caseId: string }>;
}

export default function TheaterTechCaseDetailPage({ params }: CaseDetailsPageProps) {
  const { caseId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingCase, setEditingCase] = useState<FrontdeskSurgicalCaseListItem | null>(null);
  const [recordVitalsOpen, setRecordVitalsOpen] = useState(false);
  const [vitals, setVitals] = useState<any[]>([]);
  const billingRef = useRef<HTMLDivElement>(null);
  const [bookTheaterOpen, setBookTheaterOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.shared.surgicalCase(caseId),
    queryFn: async () => {
      const response = await frontdeskApi.getSurgicalCase(caseId);
      if (response.success === false) {
        throw new Error((response as any).error || 'Failed to load surgical case');
      }
      if (!response.data) {
        throw new Error('No data received');
      }
      return response.data;
    },
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await frontdeskApi.deleteSurgicalCase(caseId);
      if (response.success === false) {
        throw new Error((response as any).error || 'Failed to delete case');
      }
      return caseId;
    },
    onSuccess: () => {
      toast.success('Surgical case deleted');
      queryClient.invalidateQueries({ queryKey: [queryKeys.shared.all, 'surgical-cases'] });
      router.push('/theater-tech/surgical-cases');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete case'),
  });

  useEffect(() => {
    if (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load case details');
    }
  }, [error]);

  const fetchVitals = async () => {
    try {
      const res = await fetch(`/api/theater-tech/surgical-cases/${caseId}/vitals`);
      const json = await res.json();
      if (json.success) setVitals(json.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (caseId) {
      fetchVitals();
    }
  }, [caseId]);

  const handleVitalsSuccess = () => {
    setRecordVitalsOpen(false);
    fetchVitals();
    toast.success('Vitals recorded');
  };

  const handleBookingConfirmed = () => {
    setBookTheaterOpen(false);
    refetch();
    toast.success('Theater booking updated');
  };

  const scrollToBilling = () => {
    billingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-white hover:text-white/80">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="bg-white/95">
          <CardContent className="py-12 text-center text-slate-600">
            <p className="text-sm font-medium">Failed to load surgical case</p>
            <Button variant="link" onClick={() => refetch()} className="text-[#caa26a] hover:text-[#b8913e]">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[data.status] || { label: data.status, className: 'border border-slate-300 bg-slate-100 text-slate-700' };
  const canEdit = ['DRAFT', 'PLANNING', 'READY_FOR_SCHEDULING', 'READY_FOR_WARD_PREP', 'IN_WARD_PREP'].includes(data.status);
  const canDelete = canEdit;
  const isActive = ['IN_PREP', 'IN_THEATER', 'RECOVERY'].includes(data.status);
  const canBookTheater = !data.theater_booking;

  const procedureNames = data.case_procedures?.map((cp: any) => cp.procedure?.name) || [];
  const patientName = `${data.patient.first_name} ${data.patient.last_name}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="text-white hover:text-white/80">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditingCase(data)} className="bg-white hover:bg-slate-50">
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Plan
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(`Delete surgical case for ${patientName}?`)) {
                  deleteMutation.mutate();
                }
              }}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ProcedureDetailsCard data={data} />

          <AssociatedProceduresCard data={data} />

          <CasePlanCard data={data} />

          <TheaterBookingSectionWrapper
            caseId={caseId}
            caseStatus={data.status}
            totalTheatreMinutes={data.total_theatre_minutes}
            patientName={patientName}
            procedureName={procedureNames.join(', ') || 'Surgery'}
            theaterBooking={data.theater_booking}
          />

          <VitalsCard vitals={vitals} onRecordVitals={() => setRecordVitalsOpen(true)} />

          <div ref={billingRef} id="billing-section">
            <TheaterTechBillingInline caseId={caseId} />
          </div>
        </div>

        <div className="space-y-4">
          <PatientInfoCard data={data} />

          <SurgeonCard data={data} />

          <ActionsCard
            caseId={caseId}
            data={data}
            canBookTheater={canBookTheater}
            isActive={isActive}
            onRecordVitals={() => setRecordVitalsOpen(true)}
            onBookTheater={() => setBookTheaterOpen(true)}
            onScrollToBilling={scrollToBilling}
          />
        </div>
      </div>

      <EditSurgicalCaseDialog
        open={!!editingCase}
        caseItem={editingCase}
        onOpenChange={(open) => {
          if (!open) setEditingCase(null);
        }}
        onSuccess={() => {
          setEditingCase(null);
          queryClient.invalidateQueries({ queryKey: [queryKeys.shared.all, 'surgical-cases'] });
          queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaterQueue() });
        }}
      />

      <RecordVitalsDialog
        open={recordVitalsOpen}
        onOpenChange={setRecordVitalsOpen}
        caseId={caseId}
        patientName={patientName}
        onSuccess={handleVitalsSuccess}
      />

      <TheaterBookingDialog
        caseId={caseId}
        caseDurationMinutes={data.total_theatre_minutes || 60}
        patientName={patientName}
        procedureName={procedureNames.join(', ') || 'Surgery'}
        open={bookTheaterOpen}
        onOpenChange={setBookTheaterOpen}
        onBookingConfirmed={handleBookingConfirmed}
      />
    </div>
  );
}
