'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronLeft, Save, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { updateCompletedConsultationNotes } from '@/actions/doctor/consultation-hub';
import { toast } from 'sonner';

interface PatientData {
  id: string;
  firstName: string;
  lastName: string;
  fileNumber: string | null;
}

interface AppointmentData {
  id: number;
  type: string;
  appointmentDate: string;
  status: string;
  patient: PatientData;
}

interface ConsultationRecord {
  id: number;
  appointmentId: number;
  chiefComplaint: string;
  examination: string;
  assessment: string;
  plan: string;
  outcomeType?: string;
  completedAt?: string;
  appointment: AppointmentData;
  hasSurgicalCase: boolean;
}

interface ConsultationEditPageContentProps {
  recordData: ConsultationRecord;
  doctorId: string;
}

export default function ConsultationEditPageContent({ recordData, doctorId }: ConsultationEditPageContentProps) {
  const patient = recordData.appointment.patient;

  const [chiefComplaint, setChiefComplaint] = useState(recordData.chiefComplaint);
  const [examination, setExamination] = useState(recordData.examination);
  const [assessment, setAssessment] = useState(recordData.assessment);
  const [plan, setPlan] = useState(recordData.plan);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'subjective' | 'objective' | 'assessment' | 'plan'>('subjective');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateCompletedConsultationNotes({
        consultationId: recordData.id,
        doctorId,
        chiefComplaint,
        examination,
        assessment,
        plan,
      });

      if (result.success) {
        toast.success('Notes saved successfully');
      } else {
        toast.error(result.error || 'Failed to save notes');
      }
    } catch (error) {
      toast.error('An error occurred while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const completedSections = [
    chiefComplaint.trim(),
    examination.trim(),
    assessment.trim(),
    plan.trim(),
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/doctor/consultations">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              Edit Consultation Record
            </h1>
            <p className="text-xs text-slate-500">
              {patient.firstName} {patient.lastName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <span className="animate-pulse">Saving...</span> : <Save className="h-3 w-3 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 bg-white px-3 shrink-0">
        <div className="flex gap-0">
          {[
            { id: 'subjective', label: 'Subjective' },
            { id: 'objective', label: 'Objective' },
            { id: 'assessment', label: 'Assessment' },
            { id: 'plan', label: 'Plan' },
          ].map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "relative px-4 py-3 text-xs font-medium transition-colors",
                  isActive ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-slate-900 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {activeTab === 'subjective' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-xs font-bold text-slate-600">S</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Subjective</h2>
                  <p className="text-xs text-slate-500">Patient-reported symptoms, concerns, and history</p>
                </div>
              </div>
              <RichTextEditor
                content={chiefComplaint}
                onChange={setChiefComplaint}
                placeholder="Document patient concerns, history of present illness..."
                readOnly={false}
                minHeight="400px"
              />
            </div>
          )}

          {activeTab === 'objective' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-xs font-bold text-slate-600">O</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Objective</h2>
                  <p className="text-xs text-slate-500">Clinical findings, examination results, and observations</p>
                </div>
              </div>
              <RichTextEditor
                content={examination}
                onChange={setExamination}
                placeholder="Document vitals, physical examination findings..."
                readOnly={false}
                minHeight="400px"
              />
            </div>
          )}

          {activeTab === 'assessment' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-xs font-bold text-slate-600">A</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Assessment</h2>
                  <p className="text-xs text-slate-500">Clinical reasoning, diagnosis, and differential diagnoses</p>
                </div>
              </div>
              <RichTextEditor
                content={assessment}
                onChange={setAssessment}
                placeholder="Document clinical impression, working diagnosis..."
                readOnly={false}
                minHeight="400px"
              />
            </div>
          )}

          {activeTab === 'plan' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-xs font-bold text-slate-600">P</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Plan</h2>
                  <p className="text-xs text-slate-500">Treatment plan, investigations, medications, and follow-up</p>
                </div>
              </div>
              <RichTextEditor
                content={plan}
                onChange={setPlan}
                placeholder="Treatment plan, timeline, pre-op requirements..."
                readOnly={false}
                minHeight="400px"
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-white px-6 py-3 flex items-center justify-between shrink-0">
        <span className="text-[11px] text-slate-400">
          {completedSections}/4 sections documented
        </span>
        <Button onClick={handleSave} disabled={isSaving} className="gap-1.5 text-xs h-8" size="sm">
          {isSaving ? <span className="animate-pulse">Saving...</span> : <Save className="h-3 w-3" />}
          Save Notes
        </Button>
      </div>
    </div>
  );
}