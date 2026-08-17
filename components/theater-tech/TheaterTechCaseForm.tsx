'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CalendarIcon, User, Stethoscope, Save, Activity, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { doctorApi } from '@/lib/api/doctor';
import { queryKeys } from '@/lib/constants/queryKeys';
import type { FrontdeskSurgicalCaseListItem } from '@/lib/api/frontdesk';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

const COMMON_PROCEDURES = [
  'Rhinoplasty', 'Blepharoplasty', 'Facelift', 'Liposuction',
  'Breast Augmentation', 'Tummy Tuck', 'Liposuction with Fat Transfer', 'Gynecomastia Surgery',
];

const PROCEDURE_CATEGORIES = [
  { value: 'FACIAL', label: 'Facial' },
  { value: 'BODY', label: 'Body' },
  { value: 'BREAST', label: 'Breast' },
  { value: 'SKIN_AND_SCAR', label: 'Skin & Scar' },
  { value: 'NON_SURGICAL', label: 'Non-Surgical' },
  { value: 'OTHER', label: 'Other' },
];

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

interface TheaterTechCaseFormProps {
  caseId: string;
}

export function TheaterTechCaseForm({ caseId }: TheaterTechCaseFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

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
      return response.data as FrontdeskSurgicalCaseListItem;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load case details');
    }
  }, [error]);

  useEffect(() => {
    if (data) {
      loadDoctors();
      const isCustom = Boolean(data.procedure_category && !PROCEDURE_CATEGORIES.some(c => c.value === data.procedure_category));
      setIsCustomCategory(isCustom);
      setCustomCategory(data.procedure_category || '');
    }
  }, [data]);

  const loadDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const response = await doctorApi.getAllDoctors();
      if (response.success && response.data) {
        setDoctors(response.data);
      }
    } catch (error) {
      console.error('Failed to load doctors:', error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    const procedureName = (document.getElementById('procedureName') as HTMLInputElement)?.value || data.procedure_name || '';
    const procedureDate = (document.getElementById('procedureDate') as HTMLInputElement)?.value || data.procedure_date || '';
    const diagnosis = (document.getElementById('diagnosis') as HTMLTextAreaElement)?.value || data.diagnosis || '';
    const procedureCategory = isCustomCategory ? customCategory : (document.getElementById('procedureCategory') as HTMLSelectElement)?.value || data.procedure_category || '';
    const primaryOrRevision = (document.getElementById('primaryOrRevision') as HTMLSelectElement)?.value || data.primary_or_revision || '';
    const admissionType = (document.getElementById('admissionType') as HTMLSelectElement)?.value || data.admission_type || '';
    const primarySurgeonDoctorId = (document.getElementById('primarySurgeon') as HTMLSelectElement)?.value || data.primary_surgeon?.id || '';
    const primarySurgeonName = primarySurgeonDoctorId ? '' : (document.getElementById('customSurgeon') as HTMLInputElement)?.value || data.primary_surgeon_name || '';

    if (!procedureName || !procedureDate) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!primarySurgeonDoctorId && !primarySurgeonName.trim()) {
      toast.error('Please select or enter a primary surgeon');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        procedureName,
        procedureDate,
        primarySurgeonDoctorId: primarySurgeonDoctorId || undefined,
        primarySurgeonName: primarySurgeonName.trim() || undefined,
        diagnosis: diagnosis || null,
        procedureCategory: procedureCategory || null,
        primaryOrRevision: primaryOrRevision || null,
        admissionType: admissionType || null,
        status: data.status,
      };

      const response = await frontdeskApi.updateSurgicalCase(caseId, payload);

      if (response.success) {
        toast.success('Surgical case updated');
        queryClient.invalidateQueries({ queryKey: [queryKeys.shared.all, 'surgical-cases'] });
        router.push('/theater-tech/surgical-cases');
      } else {
        toast.error(response.error || 'Failed to update case');
      }
    } catch (error) {
      toast.error('Failed to update case');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
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
  const patientName = `${data.patient.first_name} ${data.patient.last_name}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="text-white hover:text-white/80">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${statusCfg.className}`}>
          {statusCfg.label}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="bg-white/95">
          <CardHeader>
            <CardTitle className="text-base text-[#2c2e4b]">Surgical Case Form</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Patient</p>
              <p className="text-sm font-medium text-slate-900">{patientName}</p>
              {data.patient.file_number && (
                <p className="text-xs text-slate-500">#{data.patient.file_number}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500">Procedure</p>
              <Input
                id="procedureName"
                defaultValue={data.procedure_name || ''}
                placeholder="Procedure name"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <p className="text-xs text-slate-500">Category</p>
              {isCustomCategory ? (
                <Input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category"
                  className="h-8 text-sm"
                />
              ) : (
                <Select defaultValue={data.procedure_category || ''} name="procedureCategory">
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCEDURE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">Custom...</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500">Procedure Date</p>
              <Input
                id="procedureDate"
                type="date"
                defaultValue={data.procedure_date || ''}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <p className="text-xs text-slate-500">Primary / Revision</p>
              <Select defaultValue={data.primary_or_revision || ''} name="primaryOrRevision">
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIMARY">Primary</SelectItem>
                  <SelectItem value="REVISION">Revision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-slate-500">Admission Type</p>
              <Select defaultValue={data.admission_type || ''} name="admissionType">
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAYCASE">Daycase</SelectItem>
                  <SelectItem value="OVERNIGHT">Overnight</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">Diagnosis</p>
              <textarea
                id="diagnosis"
                defaultValue={data.diagnosis || ''}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-transparent text-sm resize-none"
                placeholder="Enter pre-operative diagnosis..."
              />
            </div>
            <div>
              <p className="text-xs text-slate-500">Primary Surgeon</p>
              <Select defaultValue={data.primary_surgeon?.id || ''} name="primarySurgeon">
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select surgeon" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map(doc => (
                    <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!data.primary_surgeon?.id && (
                <Input
                  id="customSurgeon"
                  defaultValue={data.primary_surgeon_name || ''}
                  placeholder="Or enter surgeon name"
                  className="h-8 text-sm mt-2"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-[#caa26a] hover:bg-[#b8913e] text-white">
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Case'}
          </Button>
        </div>
      </form>
    </div>
  );
}
