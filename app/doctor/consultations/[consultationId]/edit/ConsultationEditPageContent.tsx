'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronLeft, Save, FileText, Stethoscope, ClipboardList, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  patientId?: string;
}

const TAB_CONFIG = [
  { id: 'subjective', label: 'Subjective', icon: FileText, description: 'Patient symptoms & history' },
  { id: 'objective', label: 'Objective', icon: Stethoscope, description: 'Clinical findings' },
  { id: 'assessment', label: 'Assessment', icon: ClipboardList, description: 'Diagnosis & reasoning' },
  { id: 'plan', label: 'Plan', icon: ClipboardCheck, description: 'Treatment & follow-up' },
] as const;

export default function ConsultationEditPageContent({ recordData, doctorId, patientId }: ConsultationEditPageContentProps) {
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

  const currentTab = TAB_CONFIG.find(t => t.id === activeTab)!;
  const TabIcon = currentTab.icon;

  return (
    <div className="flex flex-col min-h-screen bg-[#e7d6bf]/30">
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none overflow-hidden">
        <svg className="w-full h-full" width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <pattern id="grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#2c2e4b" strokeWidth="0.5"/>
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        <div className="border-b border-[#a5a0a3]/30 bg-white/80 backdrop-blur-sm px-4 lg:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-[#e7d6bf]/50">
              <Link href={patientId ? `/doctor/patients/${patientId}` : '/doctor/consultations'}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2c2e4b] to-[#24263a] text-white shadow-md">
                <span className="text-xs font-bold">E</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[#2c2e4b]">
                  Edit Consultation Record
                </h1>
                <p className="text-sm text-[#a5a0a3]">
                  {patient.firstName} {patient.lastName} • File: {patient.fileNumber || '—'}
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="bg-[#2c2e4b] hover:bg-[#24263a] text-white rounded-lg gap-2"
          >
            {isSaving ? <span className="animate-pulse">Saving...</span> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </Button>
        </div>

        <div className="border-b border-[#a5a0a3]/30 bg-white/80 backdrop-blur-sm px-4 lg:px-6 shrink-0">
          <div className="flex gap-1">
            {TAB_CONFIG.map((tab) => {
              const isActive = tab.id === activeTab;
              const TabIconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "relative px-4 lg:px-5 py-3 text-sm font-medium transition-all duration-200 rounded-t-lg",
                    isActive 
                      ? "text-[#2c2e4b] bg-white border-b-2 border-[#2c2e4b] shadow-sm" 
                      : "text-[#a5a0a3] hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <TabIconComponent className={cn("h-4 w-4", isActive ? "text-[#2c2e4b]" : "text-[#a5a0a3]")} />
                    {tab.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e7d6bf] border border-[#a5a0a3]/30">
                <TabIcon className="h-6 w-6 text-[#2c2e4b]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#2c2e4b]">{currentTab.label}</h2>
                <p className="text-sm text-[#a5a0a3] mt-1">{currentTab.description}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs font-medium border-[#a5a0a3]/30",
                    completedSections === 4 
                      ? "bg-[#caa26a]/20 text-[#2c2e4b] border-[#caa26a]/30"
                      : "text-[#a5a0a3]"
                  )}
                >
                  {completedSections}/4 sections complete
                </Badge>
              </div>
            </div>

            <div className="bg-white border border-[#a5a0a3]/30 rounded-xl shadow-sm overflow-hidden">
              {activeTab === 'subjective' && (
                <RichTextEditor
                  content={chiefComplaint}
                  onChange={setChiefComplaint}
                  placeholder="Document patient concerns, history of present illness, symptoms..."
                  readOnly={false}
                  minHeight="400px"
                />
              )}

              {activeTab === 'objective' && (
                <RichTextEditor
                  content={examination}
                  onChange={setExamination}
                  placeholder="Document vitals, physical examination findings, observations..."
                  readOnly={false}
                  minHeight="400px"
                />
              )}

              {activeTab === 'assessment' && (
                <RichTextEditor
                  content={assessment}
                  onChange={setAssessment}
                  placeholder="Document clinical impression, working diagnosis, differential diagnoses..."
                  readOnly={false}
                  minHeight="400px"
                />
              )}

              {activeTab === 'plan' && (
                <RichTextEditor
                  content={plan}
                  onChange={setPlan}
                  placeholder="Treatment plan, investigations, medications, referrals, follow-up..."
                  readOnly={false}
                  minHeight="400px"
                />
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-[#a5a0a3]/30 bg-white/80 backdrop-blur-sm px-4 lg:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#a5a0a3]">
            <span>Completed:</span>
            <span className={cn(
              "font-medium",
              completedSections === 4 ? "text-[#caa26a]" : "text-[#2c2e4b]"
            )}>
              {completedSections}/4 sections documented
            </span>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="gap-2 rounded-lg text-sm"
          >
            {isSaving ? <span className="animate-pulse">Saving...</span> : <Save className="h-3.5 w-3.5" />}
            Save Notes
          </Button>
        </div>
      </div>
    </div>
  );
}