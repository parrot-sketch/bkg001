'use client';

import { use, useEffect, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  CalendarIcon,
  User,
  Stethoscope,
  ClipboardList,
  Theater,
  Loader2,
  Edit3,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { queryKeys } from '@/lib/constants/queryKeys';
import { EditSurgicalCaseDialog } from '@/components/frontdesk/EditSurgicalCaseDialog';
import type { FrontdeskSurgicalCaseListItem } from '@/lib/api/frontdesk';

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

export default function CaseDetailsPage({ params }: CaseDetailsPageProps) {
  const { caseId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingCase, setEditingCase] = useState<FrontdeskSurgicalCaseListItem | null>(null);

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
      router.push('/frontdesk/surgical-cases');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete case'),
  });

  useEffect(() => {
    if (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load case details');
    }
  }, [error]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="text-white hover:text-white/80">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cases
        </Button>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditingCase(data)} className="bg-white hover:bg-slate-50">
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(`Delete surgical case for ${data.patient.first_name} ${data.patient.last_name}?`)) {
                  deleteMutation.mutate();
                }
              }}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-white/95">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-slate-900">Procedure Details</CardTitle>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${statusCfg.className}`}>
                  {statusCfg.label}
                </span>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Procedure</p>
                <p className="text-sm font-medium text-slate-900">{data.procedure_name || 'Unnamed procedure'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Category</p>
                <p className="text-sm font-medium text-slate-900">{data.procedure_category || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Date</p>
                <p className="text-sm font-medium text-slate-900">
                  {data.procedure_date ? format(new Date(data.procedure_date), 'MMM d, yyyy') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Admission Type</p>
                <p className="text-sm font-medium text-slate-900">{data.admission_type || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Primary / Revision</p>
                <p className="text-sm font-medium text-slate-900">{data.primary_or_revision || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Urgency</p>
                <p className="text-sm font-medium text-slate-900">{data.urgency || '—'}</p>
              </div>
              {data.diagnosis && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-500">Diagnosis</p>
                  <p className="text-sm font-medium text-slate-900">{data.diagnosis}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {data.case_procedures && data.case_procedures.length > 0 && (
            <Card className="bg-white/95">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">Associated Procedures</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.case_procedures.map((cp) => (
                    <div key={cp.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{cp.procedure.name}</p>
                        <p className="text-xs text-slate-500">{cp.procedure.category} {cp.procedure.subcategory ? `· ${cp.procedure.subcategory}` : ''}</p>
                      </div>
                      {cp.procedure.estimated_duration_minutes && (
                        <span className="text-xs text-slate-600">{cp.procedure.estimated_duration_minutes} min</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {data.case_plan && (
            <Card className="bg-white/95">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">Case Plan</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Readiness Status</p>
                  <p className="text-sm font-medium text-slate-900">{data.case_plan.readiness_status || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ready for Surgery</p>
                  <p className="text-sm font-medium text-slate-900">{data.case_plan.ready_for_surgery ? 'Yes' : 'No'}</p>
                </div>
                {data.case_plan.estimated_duration_minutes && (
                  <div>
                    <p className="text-xs text-slate-500">Estimated Duration</p>
                    <p className="text-sm font-medium text-slate-900">{data.case_plan.estimated_duration_minutes} min</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {data.theater_booking && (
            <Card className="bg-white/95">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">Theater Booking</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Theater</p>
                  <p className="text-sm font-medium text-slate-900">{data.theater_booking.theater?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Start Time</p>
                  <p className="text-sm font-medium text-slate-900">
                    {data.theater_booking.startTime ? format(new Date(data.theater_booking.startTime), 'MMM d, yyyy HH:mm') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">End Time</p>
                  <p className="text-sm font-medium text-slate-900">
                    {data.theater_booking.endTime ? format(new Date(data.theater_booking.endTime), 'MMM d, yyyy HH:mm') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="text-sm font-medium text-slate-900">{data.theater_booking.status || '—'}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="bg-white/95">
            <CardHeader>
              <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                <User className="h-4 w-4" />
                Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">Name</p>
                <p className="text-sm font-medium text-slate-900">
                  {data.patient.first_name} {data.patient.last_name}
                </p>
              </div>
              {data.patient.file_number && (
                <div>
                  <p className="text-xs text-slate-500">File Number</p>
                  <p className="text-sm font-medium text-slate-900">#{data.patient.file_number}</p>
                </div>
              )}
              {data.patient.email && (
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm font-medium text-slate-900">{data.patient.email}</p>
                </div>
              )}
              {data.patient.phone && (
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="text-sm font-medium text-slate-900">{data.patient.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/95">
            <CardHeader>
              <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Surgeon
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.primary_surgeon ? (
                <div>
                  <p className="text-sm font-medium text-slate-900">{data.primary_surgeon.name}</p>
                  {data.primary_surgeon.specialization && (
                    <p className="text-xs text-slate-500">{data.primary_surgeon.specialization}</p>
                  )}
                </div>
              ) : data.primary_surgeon_name ? (
                <p className="text-sm font-medium text-slate-900">{data.primary_surgeon_name}</p>
              ) : (
                <p className="text-sm text-slate-500">Not assigned</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/95">
            <CardHeader>
              <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-slate-500">Created</p>
                <p className="text-sm font-medium text-slate-900">{format(new Date(data.created_at), 'MMM d, yyyy HH:mm')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Last Updated</p>
                <p className="text-sm font-medium text-slate-900">{format(new Date(data.updated_at), 'MMM d, yyyy HH:mm')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {editingCase && (
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
      )}
    </div>
  );
}
