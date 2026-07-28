'use client';

import { useState, useCallback } from 'react';
import { PanelLeft, PanelRight, Loader2, Stethoscope, Activity, History, CreditCard, Users } from 'lucide-react';
import { PatientInfoSidebar } from '@/components/consultation/PatientInfoSidebar';
import { PatientQueuePanel } from '@/components/consultation/PatientQueuePanel';
import { useConsultationContext } from '@/contexts/ConsultationContext';
import { usePatientContext } from '@/providers/patient/PatientContextProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClinicalRichTextEditor } from '@/components/consultation/ClinicalRichTextEditor';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { StructuredNotes } from '@/shared-kernel/types/notes';

type PrimaryTab = 'consultation' | 'vitals' | 'history' | 'billing';
type SoapTab = 'subjective' | 'objective' | 'assessment' | 'plan';

const SOAP_TABS: { key: SoapTab; label: string; field: keyof StructuredNotes; placeholder: string }[] = [
  { key: 'subjective', label: 'Subjective', field: 'chiefComplaint', placeholder: 'Patient complaints, symptoms, history of present illness...' },
  { key: 'objective', label: 'Objective', field: 'examination', placeholder: 'Physical examination findings, vitals, test results...' },
  { key: 'assessment', label: 'Assessment', field: 'assessment', placeholder: 'Clinical assessment, diagnosis, differential diagnosis...' },
  { key: 'plan', label: 'Plan', field: 'plan', placeholder: 'Treatment plan, medications, referrals, follow-up...' },
];

export function ConsultationSessionContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [queuePanelOpen, setQueuePanelOpen] = useState(true);
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('consultation');
  const [soapTab, setSoapTab] = useState<SoapTab>('subjective');
  const [sidebarRefetchKey, setSidebarRefetchKey] = useState(0);

  const { state, updateNotes, canSave, saveDraft, completeConsultation, isReadOnly } = useConsultationContext();
  const { patient, vitals, isLoading: patientLoading, refreshPatient } = usePatientContext();

  const notes = state.notes;
  const isDirty = canSave;
  const isSaving = state.isSaving;

  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : 'Loading patient…';

  const handleSaveDraft = async () => {
    try {
      await saveDraft();
    } catch {
      // Inline save status already reflects failure; no duplicate toast.
    }
  };

  const handleComplete = async () => {
    try {
      if (canSave) {
        await saveDraft();
      }
      await completeConsultation();
      setSidebarRefetchKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to complete consultation');
    }
  };

  const handleRefreshPatient = async () => {
    if (!refreshPatient || !patient?.id) return;
    try {
      await refreshPatient();
      toast.success('Patient data refreshed');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to refresh patient');
    }
  };

  const renderConsultationTab = () => {
    if (isReadOnly) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <div className="h-16 w-16 rounded-full bg-[#caa26a]/10 flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-[#caa26a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#2c2e4b] mb-2">Consultation Complete</h3>
            <p className="text-sm text-[#2c2e4b]/60 mb-6">
              This consultation has been completed. Use the queue panel on the right to load the next patient, or return to the hub.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={() => window.location.href = '/doctor/consultations'}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white"
              >
                Go to Hub
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col min-h-0">
        <Tabs value={soapTab} onValueChange={(v) => setSoapTab(v as SoapTab)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="h-10 shrink-0 bg-transparent border-b border-[#e7d6bf] rounded-none p-0 gap-0">
            {SOAP_TABS.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="h-full px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-[#caa26a] data-[state=active]:text-[#2c2e4b] data-[state=inactive]:text-[#2c2e4b]/50 hover:text-[#2c2e4b]"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {SOAP_TABS.map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="flex-1 mt-0 overflow-hidden">
              <div className="h-full flex flex-col p-2 sm:p-4">
                <ClinicalRichTextEditor
                  content={notes[tab.field] || ''}
                  onChange={(value) => updateNotes(tab.field, value)}
                  placeholder={tab.placeholder}
                  readOnly={isReadOnly}
                  minHeight="0"
                  ariaLabel={`${tab.label} notes editor`}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  };

  const renderVitalsTab = () => {
    if (patientLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        </div>
      );
    }

    if (!vitals) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Activity className="h-8 w-8 text-stone-300 mb-2" />
          <p className="text-sm text-stone-500">No vitals recorded for this patient</p>
        </div>
      );
    }

    const items = [
      { label: 'Temp', value: vitals.bodyTemperature != null ? `${vitals.bodyTemperature}°C` : null },
      { label: 'BP', value: vitals.systolic != null && vitals.diastolic != null ? `${vitals.systolic}/${vitals.diastolic}` : null },
      { label: 'HR', value: vitals.heartRate ? `${vitals.heartRate} bpm` : null },
      { label: 'RR', value: vitals.respiratoryRate != null ? `${vitals.respiratoryRate}/min` : null },
      { label: 'SpO₂', value: vitals.oxygenSaturation != null ? `${vitals.oxygenSaturation}%` : null },
      { label: 'Wt', value: vitals.weight != null ? `${vitals.weight}kg` : null },
      { label: 'Ht', value: vitals.height != null ? `${vitals.height}cm` : null },
    ].filter(i => i.value != null);

    return (
      <div className="p-6 max-w-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.label} className="bg-white border border-[#e7d6bf] rounded-lg p-4">
              <p className="text-[10px] uppercase font-bold text-[#2c2e4b]/40 tracking-wider">{item.label}</p>
              <p className="text-sm font-semibold text-[#2c2e4b] mt-1">{item.value}</p>
            </div>
          ))}
        </div>
        {vitals.recordedAt && (
          <p className="text-[11px] text-[#2c2e4b]/40 mt-4">
            Recorded {new Date(vitals.recordedAt).toLocaleString()} {vitals.recordedBy ? `by ${vitals.recordedBy}` : ''}
          </p>
        )}
      </div>
    );
  };

  const renderHistoryTab = () => (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <History className="h-8 w-8 text-stone-300 mb-2" />
      <p className="text-sm text-stone-500">Previous consultations will appear here</p>
    </div>
  );

  const renderBillingTab = () => (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <CreditCard className="h-8 w-8 text-stone-300 mb-2" />
      <p className="text-sm text-stone-500">Billing information will appear here</p>
    </div>
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-white text-[#2c2e4b]">

      {/* ── HEADER ── */}
      <header className="h-14 shrink-0 border-b border-[#e7d6bf] bg-white flex items-center px-3 lg:px-6 gap-3">
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="p-2 rounded-lg hover:bg-[#e7d6bf]/40 transition-colors text-[#2c2e4b]/60 hover:text-[#2c2e4b]"
          aria-label={sidebarOpen ? 'Collapse patient panel' : 'Expand patient panel'}
        >
          {sidebarOpen ? <PanelLeft className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => setQueuePanelOpen((v) => !v)}
          className="p-2 rounded-lg hover:bg-[#e7d6bf]/40 transition-colors text-[#2c2e4b]/60 hover:text-[#2c2e4b]"
          aria-label={queuePanelOpen ? 'Collapse queue panel' : 'Expand queue panel'}
        >
          {queuePanelOpen ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </button>

        {patient ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-[#caa26a] flex items-center justify-center text-xs font-bold text-white shrink-0">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#2c2e4b] leading-none truncate">{patientName}</p>
              <p className="text-[11px] text-[#2c2e4b]/50 mt-0.5 truncate">
                #{patient.fileNumber} · Appt #{state.appointment?.id ?? '—'}
              </p>
            </div>
          </div>
        ) : (
          <div className="min-w-0">
            <div className="h-4 w-36 rounded bg-[#e7d6bf]/50 animate-pulse" />
            <div className="h-3 w-24 rounded bg-[#e7d6bf]/40 animate-pulse mt-1.5" />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-[#2c2e4b]/40 hidden sm:inline mr-1">
            {isSaving ? 'Saving...' : isDirty ? 'Unsaved changes' : 'Saved'}
          </span>
          {!isReadOnly && (
            <>
              <button
                onClick={handleSaveDraft}
                disabled={isSaving || !isDirty}
                className="px-3 py-1.5 text-xs font-medium border border-[#e7d6bf] rounded-lg text-[#2c2e4b] bg-white hover:bg-[#fcfbf8] transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={handleComplete}
                disabled={isSaving}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#2c2e4b] text-white hover:bg-[#2c2e4b]/90 transition-colors disabled:opacity-50"
              >
                Complete
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── PATIENT SIDEBAR ── */}
        <aside
          className={`
            shrink-0 hidden lg:flex flex-col border-r border-[#e7d6bf] bg-white overflow-hidden
            transition-[width] duration-200 ease-out
            ${sidebarOpen ? 'w-[280px]' : 'w-0 border-r-0'}
          `}
        >
          {patient ? (
            <PatientInfoSidebar
              patient={patient as any}
              vitals={vitals ?? undefined}
              appointment={state.appointment as any}
              onRefresh={handleRefreshPatient}
              refetchKey={sidebarRefetchKey}
            />
          ) : (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-[#e7d6bf]">
                <div className="h-10 w-10 rounded-full bg-[#e7d6bf]/60 animate-pulse shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-3/4 rounded bg-[#e7d6bf]/60 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-[#e7d6bf]/40 animate-pulse mt-1.5" />
                </div>
              </div>
              <div className="h-3 w-1/3 rounded bg-[#e7d6bf]/40 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-[#e7d6bf]/40 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-[#e7d6bf]/40 animate-pulse" />
            </div>
          )}
        </aside>

        {/* ── MAIN WORKSPACE ── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#fcfbf8]">
          {isReadOnly ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-8 max-w-md">
                <div className="h-16 w-16 rounded-full bg-[#caa26a]/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8 text-[#caa26a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#2c2e4b] mb-2">Consultation Complete</h3>
                <p className="text-sm text-[#2c2e4b]/60 mb-6">
                  This consultation has been completed. Use the queue panel on the right to load the next patient, or return to the hub.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    onClick={() => window.location.href = '/doctor/consultations'}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white"
                  >
                    Go to Hub
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Tabs value={primaryTab} onValueChange={(v) => setPrimaryTab(v as PrimaryTab)} className="h-full flex flex-col">
              <TabsList className="h-12 shrink-0 bg-white border-b border-[#e7d6bf] rounded-none p-0 gap-0 px-2 sm:px-4">
                <TabsTrigger value="consultation" className="h-full px-2 sm:px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-[#caa26a] data-[state=active]:text-[#2c2e4b] data-[state=inactive]:text-[#2c2e4b]/50 hover:text-[#2c2e4b] gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Consultation</span>
                </TabsTrigger>
                <TabsTrigger value="vitals" className="h-full px-2 sm:px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-[#caa26a] data-[state=active]:text-[#2c2e4b] data-[state=inactive]:text-[#2c2e4b]/50 hover:text-[#2c2e4b] gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Vitals</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="h-full px-2 sm:px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-[#caa26a] data-[state=active]:text-[#2c2e4b] data-[state=inactive]:text-[#2c2e4b]/50 hover:text-[#2c2e4b] gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">History</span>
                </TabsTrigger>
                <TabsTrigger value="billing" className="h-full px-2 sm:px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-[#caa26a] data-[state=active]:text-[#2c2e4b] data-[state=inactive]:text-[#2c2e4b]/50 hover:text-[#2c2e4b] gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Billing</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="consultation" className="flex-1 mt-0 overflow-hidden flex flex-col">
                {renderConsultationTab()}
                
                {/* Sticky action bar */}
                <div className="shrink-0 border-t border-[#e7d6bf] bg-[#e7d6bf]/20 px-4 py-3 flex items-center justify-between">
                  <div className="text-[11px] text-[#2c2e4b]/60">
                    {isDirty ? 'Unsaved changes' : 'All changes saved'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveDraft}
                      disabled={isSaving || !isDirty}
                      className="px-3 py-1.5 text-xs font-medium border border-[#e7d6bf] rounded-lg text-[#2c2e4b] bg-white hover:bg-[#fcfbf8] transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Draft'}
                    </button>
                    {!isReadOnly && (
                      <button
                        onClick={handleComplete}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#caa26a] hover:bg-[#caa26a]/90 text-[#2c2e4b] transition-colors disabled:opacity-50"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="vitals" className="flex-1 mt-0 overflow-hidden">
                {renderVitalsTab()}
              </TabsContent>
              <TabsContent value="history" className="flex-1 mt-0 overflow-hidden">
                {renderHistoryTab()}
              </TabsContent>
              <TabsContent value="billing" className="flex-1 mt-0 overflow-hidden">
                {renderBillingTab()}
              </TabsContent>
            </Tabs>
          )}
        </main>

        {/* ── QUEUE PANEL ── */}
        <aside
          className={`
            shrink-0 hidden xl:flex flex-col border-l border-[#e7d6bf] bg-white overflow-hidden
            transition-[width] duration-200 ease-out
            ${queuePanelOpen ? 'w-[300px]' : 'w-0 border-l-0'}
          `}
        >
          {queuePanelOpen && <PatientQueuePanel />}
        </aside>

      </div>
    </div>
  );
}
