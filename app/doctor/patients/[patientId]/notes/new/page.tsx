'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { calculateAge } from '@/lib/utils';

const NOTE_TYPES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'ASSESSMENT', label: 'Assessment' },
  { value: 'PROGRESS', label: 'Progress' },
  { value: 'PROCEDURE', label: 'Procedure' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'REFERRAL', label: 'Referral' },
];

export default function NewClinicalNotePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const patientId = params.patientId as string;

  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [noteType, setNoteType] = useState('GENERAL');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const loadPatient = async () => {
      try {
        const response = await apiClient.get<PatientResponseDto>(`/patients/${patientId}`);
        if (response.success && response.data) {
          setPatient(response.data);
        } else if (!response.success) {
          toast.error(response.error || 'Failed to load patient');
        }
      } catch {
        toast.error('Failed to load patient');
      } finally {
        setPatientLoading(false);
      }
    };
    loadPatient();
  }, [patientId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setIsDirty(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setIsDirty(true);
  };

  const handleNoteTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNoteType(e.target.value);
    setIsDirty(true);
  };

  const handleBack = () => {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    router.push(`/doctor/patients/${patientId}`);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const response = await apiClient.post<{ id: number; createdAt: string }>(
        `/patients/${patientId}/clinical-notes`,
        { title: title.trim() || '', noteType, content }
      );
      if (response.success) {
        toast.success('Note added to medical record');
        setIsDirty(false);
        router.push(`/doctor/patients/${patientId}`);
      } else {
        toast.error(response.error || 'Failed to add note');
      }
    } catch {
      toast.error('Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || patientLoading || !user || !isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-slate-500">Patient not found</p>
      </div>
    );
  }

  const patientName = `${patient.lastName.toUpperCase()}, ${patient.firstName}`;
  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : patient.age;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patient
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Note
            </>
          )}
        </Button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-500 uppercase font-bold">Patient:</span>{' '}
            <span className="font-semibold text-slate-800">{patientName}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase font-bold">Age/Sex:</span>{' '}
            <span className="text-slate-700">{age} yrs · {patient.gender}</span>
          </div>
          {patient.allergies && (
            <div className="text-rose-700">
              <span className="text-rose-600 uppercase font-bold">Allergies:</span>{' '}
              <span className="font-semibold">{patient.allergies}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-3">
          <Input
            value={title}
            onChange={handleTitleChange}
            placeholder="Note title/focus (e.g. Follow-up plan)"
            className="h-9 text-xs rounded border-slate-200"
          />
          <select
            value={noteType}
            onChange={handleNoteTypeChange}
            className="h-9 text-xs border border-slate-200 rounded px-2.5 bg-white font-medium text-slate-700"
          >
            {NOTE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <RichTextEditor
          content={content}
          onChange={handleContentChange}
          placeholder="Write your clinical notes, findings, observations..."
          minHeight="500px"
          autoFocus
        />
      </div>
    </div>
  );
}