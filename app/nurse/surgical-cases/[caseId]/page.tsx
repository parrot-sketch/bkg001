'use client';

import { use, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  User,
  Stethoscope,
  ClipboardList,
  Activity,
  FileText,
  Calendar,
  HeartPulse,
} from 'lucide-react';
import { format } from 'date-fns';
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

export default function NurseCaseDetailPage({ params }: CaseDetailsPageProps) {
  const { caseId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [vitals, setVitals] = useState<any[]>([]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['nurse', 'surgical-case', caseId],
    queryFn: async () => {
      const res = await fetch(`/api/nurse/surgical-cases/${caseId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load case');
      return json.data;
    },
    staleTime: 30_000,
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
    if (caseId) fetchVitals();
  }, [caseId]);

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
  const procedureNames = data.case_procedures?.map((cp: any) => cp.procedure?.name) || [];
  const patientName = `${data.patient?.first_name} ${data.patient?.last_name}`;

  const getNurseActions = () => {
    const actions: { label: string; href: string; icon: any; color: string }[] = [];

    if (['READY_FOR_WARD_PREP', 'IN_WARD_PREP'].includes(data.status)) {
      actions.push({
        label: 'Pre-Op Checklist',
        href: `/nurse/ward-prep/${data.id}/checklist`,
        icon: ClipboardList,
        color: 'bg-emerald-600 hover:bg-emerald-700',
      });
    }

    if (['SCHEDULED', 'IN_PREP', 'IN_THEATER'].includes(data.status)) {
      actions.push({
        label: 'Intra-Op Record',
        href: `/nurse/intra-op-cases/${data.id}/record`,
        icon: Activity,
        color: 'bg-blue-600 hover:bg-blue-700',
      });
    }

    if (['IN_THEATER', 'RECOVERY'].includes(data.status)) {
      actions.push({
        label: 'Recovery Record',
        href: `/nurse/immediate-recovery/${data.id}`,
        icon: HeartPulse,
        color: 'bg-purple-600 hover:bg-purple-700',
      });
    }

    if (['RECOVERY', 'COMPLETED'].includes(data.status)) {
      actions.push({
        label: 'Recovery Discharge',
        href: `/nurse/recovery-discharge`,
        icon: FileText,
        color: 'bg-slate-600 hover:bg-slate-700',
      });
    }

    actions.push({
      label: 'Record Vitals',
      href: '#',
      icon: Activity,
      color: 'bg-[#caa26a] hover:bg-[#b8913e]',
    });

    return actions;
  };

  const nurseActions = getNurseActions();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="text-white hover:text-white/80">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="bg-white hover:bg-slate-50">
            <Link href={`/nurse/surgical-cases`}>
              <ClipboardList className="h-4 w-4 mr-2" />
              All Cases
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-white/95">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-[#2c2e4b]">Procedure Details</CardTitle>
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

          {data.theater_booking && (
            <Card className="bg-white/95">
              <CardHeader>
                <CardTitle className="text-base text-[#2c2e4b] flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#caa26a]" />
                  Theater Booking
                </CardTitle>
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

          <Card className="bg-white/95">
            <CardHeader>
              <CardTitle className="text-base text-[#2c2e4b] flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#caa26a]" />
                Pre-Op Vitals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vitals.length === 0 ? (
                <p className="text-sm text-slate-500">No vitals recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 text-xs font-semibold text-slate-500">Recorded</th>
                        <th className="text-left py-2 text-xs font-semibold text-slate-500">Temp</th>
                        <th className="text-left py-2 text-xs font-semibold text-slate-500">BP</th>
                        <th className="text-left py-2 text-xs font-semibold text-slate-500">Pulse</th>
                        <th className="text-left py-2 text-xs font-semibold text-slate-500">SpO2</th>
                        <th className="text-left py-2 text-xs font-semibold text-slate-500">Weight</th>
                        <th className="text-left py-2 text-xs font-semibold text-slate-500">Height</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vitals.map((v: any) => (
                        <tr key={v.id}>
                          <td className="py-3 text-slate-600 whitespace-nowrap">
                            {format(new Date(v.recorded_at), 'dd MMM yyyy HH:mm')}
                          </td>
                          <td className="py-3 text-slate-900 font-medium">
                            {v.body_temperature != null ? `${v.body_temperature}°C` : '—'}
                          </td>
                          <td className="py-3 text-slate-700">
                            {v.systolic != null && v.diastolic != null ? `${v.systolic}/${v.diastolic}` : '—'}
                          </td>
                          <td className="py-3 text-slate-700">{v.heart_rate ?? '—'}</td>
                          <td className="py-3 text-slate-700">
                            {v.oxygen_saturation != null ? `${v.oxygen_saturation}%` : '—'}
                          </td>
                          <td className="py-3 text-slate-700">
                            {v.weight != null ? `${v.weight} kg` : '—'}
                          </td>
                          <td className="py-3 text-slate-700">
                            {v.height != null ? `${v.height} cm` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-white/95">
            <CardHeader>
              <CardTitle className="text-base text-[#2c2e4b] flex items-center gap-2">
                <User className="h-4 w-4" />
                Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">Name</p>
                <p className="text-sm font-medium text-slate-900">{patientName}</p>
              </div>
              {data.patient?.file_number && (
                <div>
                  <p className="text-xs text-slate-500">File Number</p>
                  <p className="text-sm font-medium text-slate-900">#{data.patient.file_number}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/95">
            <CardHeader>
              <CardTitle className="text-base text-[#2c2e4b] flex items-center gap-2">
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
              <CardTitle className="text-base text-[#2c2e4b]">Nurse Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {nurseActions.map((action) => (
                <Button
                  key={action.label}
                  size="sm"
                  onClick={() => action.href !== '#' && router.push(action.href)}
                  className={`w-full text-white font-bold shadow-sm ${action.color}`}
                >
                  <action.icon className="h-4 w-4 mr-2" />
                  {action.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
