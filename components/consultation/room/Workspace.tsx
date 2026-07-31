'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Stethoscope, Activity, History, CreditCard, Loader2 } from 'lucide-react';
import { ClinicalRichTextEditor } from '@/components/consultation/ClinicalRichTextEditor';
import type { StructuredNotes } from '@/shared-kernel/types/notes';

type PrimaryTab = 'consultation' | 'vitals' | 'history' | 'billing';
type SoapTab = 'subjective' | 'objective' | 'assessment' | 'plan';

const SOAP_TABS: { key: SoapTab; label: string; field: keyof StructuredNotes; placeholder: string }[] = [
  { key: 'subjective', label: 'Subjective', field: 'chiefComplaint', placeholder: 'Patient complaints, symptoms, history of present illness...' },
  { key: 'objective', label: 'Objective', field: 'examination', placeholder: 'Physical examination findings, vitals, test results...' },
  { key: 'assessment', label: 'Assessment', field: 'assessment', placeholder: 'Clinical assessment, diagnosis, differential diagnosis...' },
  { key: 'plan', label: 'Plan', field: 'plan', placeholder: 'Treatment plan, medications, referrals, follow-up...' },
];

interface VitalsData {
  bodyTemperature: number | null;
  systolic: number | null;
  diastolic: number | null;
  heartRate: string | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  weight: number | null;
  height: number | null;
  recordedAt: string;
  recordedBy: string | null;
}

interface WorkspaceProps {
  primaryTab: PrimaryTab;
  soapTab: SoapTab;
  onPrimaryTabChange: (tab: PrimaryTab) => void;
  onSoapTabChange: (tab: SoapTab) => void;
  notes: StructuredNotes;
  onUpdateNotes: (field: keyof StructuredNotes, value: string) => void;
  isReadOnly: boolean;
  isSaving: boolean;
  isDirty: boolean;
  onSaveDraft: () => void;
  onComplete: () => void;
  vitals?: VitalsData | null;
  patientLoading?: boolean;
  queueLength?: number;
  onReturnToHub?: () => void;
}

export function Workspace({
  primaryTab,
  soapTab,
  onPrimaryTabChange,
  onSoapTabChange,
  notes,
  onUpdateNotes,
  isReadOnly,
  isSaving,
  isDirty,
  onSaveDraft,
  onComplete,
  vitals,
  patientLoading,
  queueLength = 0,
  onReturnToHub,
}: WorkspaceProps) {
  return (
    <Tabs value={primaryTab} onValueChange={(v) => onPrimaryTabChange(v as PrimaryTab)} className="h-full flex flex-col">
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
                {queueLength > 0
                  ? 'This consultation has been completed. Use the queue panel on the right to load the next patient, or return to the hub.'
                  : 'All patients have been seen. Close the room and return to the hub.'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={onReturnToHub}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white"
                >
                  Close Room
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-white border-b border-[#e7d6bf]">
              <div className="text-[11px] text-[#2c2e4b]/60">
                {isDirty ? 'Unsaved changes' : 'All changes saved'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onSaveDraft}
                  disabled={isSaving || !isDirty}
                  className="px-3 py-1.5 text-xs font-medium border border-[#e7d6bf] rounded-lg text-[#2c2e4b] bg-white hover:bg-[#fcfbf8] transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={onComplete}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#caa26a] hover:bg-[#caa26a]/90 text-[#2c2e4b] transition-colors disabled:opacity-50"
                >
                  Complete
                </button>
              </div>
            </div>
            <Tabs value={soapTab} onValueChange={(v) => onSoapTabChange(v as SoapTab)} className="flex-1 flex flex-col min-h-0">
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
                <TabsContent key={tab.key} value={tab.key} className="flex-1 mt-0 overflow-hidden flex flex-col">
                  <div className="flex-1 flex flex-col min-h-0 p-2 sm:p-4">
                    <ClinicalRichTextEditor
                      content={notes[tab.field] || ''}
                      onChange={(value) => onUpdateNotes(tab.field, value)}
                      placeholder={tab.placeholder}
                      readOnly={isReadOnly}
                      minHeight="100%"
                      ariaLabel={`${tab.label} notes editor`}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </TabsContent>

      <TabsContent value="vitals" className="flex-1 mt-0 overflow-hidden">
        {patientLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
          </div>
        ) : !vitals ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Activity className="h-8 w-8 text-stone-300 mb-2" />
            <p className="text-sm text-stone-500">No vitals recorded for this patient</p>
          </div>
        ) : (
          <div className="p-6 max-w-2xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Temp', value: vitals.bodyTemperature != null ? `${vitals.bodyTemperature}°C` : null },
                { label: 'BP', value: vitals.systolic != null && vitals.diastolic != null ? `${vitals.systolic}/${vitals.diastolic}` : null },
                { label: 'HR', value: vitals.heartRate ? `${vitals.heartRate} bpm` : null },
                { label: 'RR', value: vitals.respiratoryRate != null ? `${vitals.respiratoryRate}/min` : null },
                { label: 'SpO₂', value: vitals.oxygenSaturation != null ? `${vitals.oxygenSaturation}%` : null },
                { label: 'Wt', value: vitals.weight != null ? `${vitals.weight}kg` : null },
                { label: 'Ht', value: vitals.height != null ? `${vitals.height}cm` : null },
              ]
                .filter((i) => i.value != null)
                .map((item) => (
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
        )}
      </TabsContent>

      <TabsContent value="history" className="flex-1 mt-0 overflow-hidden">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <History className="h-8 w-8 text-stone-300 mb-2" />
          <p className="text-sm text-stone-500">Previous consultations will appear here</p>
        </div>
      </TabsContent>

      <TabsContent value="billing" className="flex-1 mt-0 overflow-hidden">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <CreditCard className="h-8 w-8 text-stone-300 mb-2" />
          <p className="text-sm text-stone-500">Billing information will appear here</p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
