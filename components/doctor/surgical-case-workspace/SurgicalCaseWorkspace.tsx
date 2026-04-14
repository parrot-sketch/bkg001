'use client';

/**
 * SurgicalCaseWorkspace
 *
 * Unified workspace for a single surgical case. This is the doctor's
 * operational hub with 3 tabs:
 *   1. Case Plan — the multi-step form for surgical planning
 *   2. Surgical Notes — rich-text clinical documentation
 *   3. Charge Sheet — billing items for the case
 *
 * The `?tab=` search param allows deep-linking from the cases list.
 */

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PatientInfoSidebar } from './PatientInfoSidebar';
import { cn } from '@/lib/utils';
import {
  ClipboardList,
  FileText,
  Receipt,
  ArrowLeft,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SurgicalCasePlanForm } from '@/components/doctor/surgical-case-plan/SurgicalCasePlanForm';
import { SurgicalCasePlanView } from '@/components/doctor/surgical-case-plan/SurgicalCasePlanView';
import { SurgicalNotesEditor } from '@/components/doctor/surgical-notes/SurgicalNotesEditor';
import { ChargeSheetStep } from '@/components/theater-tech/ChargeSheetStep';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import Link from 'next/link';

// ── Workspace Props ─────────────────────────────────────────────────────

interface SurgicalCasePatient {
  id: string;
  first_name: string;
  last_name: string;
  file_number?: string | null;
  date_of_birth?: Date | string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  allergies?: string | null;
}

interface SurgicalCaseData {
  id: string;
  status: string;
  diagnosis?: string | null;
  procedure_date?: Date | string | null;
  procedure_category?: string | null;
  primary_surgeon_id?: string | null;
  primary_surgeon?: { id: string; name: string; specialization?: string } | null;
  case_procedures?: Array<{ procedure: { id: string; name: string; category?: string | null } }>;
  team_members?: Array<{ id: string; role: string; user_id: string | null }>;
}

interface InitialPlanData {
  surgeonId: string;
  surgeonIds: string[];
  procedureDate?: Date | string | null;
  diagnosis?: string;
  procedureCategory?: string;
  primaryOrRevision?: string;
  procedureIds?: string[];
  anaesthesiaType?: string;
  skinToSkinMinutes?: number | null;
  totalTheatreMinutes?: number | null;
  admissionType?: string;
  deviceUsed?: string;
}

interface Props {
  surgicalCase: SurgicalCaseData;
  patient: SurgicalCasePatient;
  caseId: string;
  initialPlanData: InitialPlanData;
}

// ── Tab Configuration ───────────────────────────────────────────────────

const TABS = [
  { id: 'case-plan', label: 'Case Plan', icon: ClipboardList },
  { id: 'surgical-notes', label: 'Surgical Notes', icon: FileText },
  { id: 'charge-sheet', label: 'Charge Sheet', icon: Receipt },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ── Component ───────────────────────────────────────────────────────────

export function SurgicalCaseWorkspace({
  surgicalCase,
  patient,
  caseId,
  initialPlanData,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawTab = searchParams.get('tab') || 'case-plan';
  const activeTab: TabId = TABS.some((t) => t.id === rawTab)
    ? (rawTab as TabId)
    : 'case-plan';

  const handleTabChange = (tabId: TabId) => {
    router.replace(`?tab=${tabId}`, { scroll: false });
  };

  const hasInitialPlanData = !!(initialPlanData.procedureCategory || initialPlanData.diagnosis || (surgicalCase.case_procedures && surgicalCase.case_procedures.length > 0));
  const [isEditingCasePlan, setIsEditingCasePlan] = useState(!hasInitialPlanData);

  const SidebarContent = () => (
    <>
      <PatientInfoSidebar patient={patient} surgicalCase={surgicalCase} />

      {/* Quick Links */}
      <div className="px-4 py-3 border-t border-slate-100 mt-auto">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          Quick Jump
        </p>
        <div className="space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900">
      {/* Header Bar */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 shrink-0 z-10 shadow-sm gap-3">
        <div className="lg:hidden flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 mr-1">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] flex flex-col">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>

        <Button variant="ghost" size="sm" className="gap-1.5 text-xs shrink-0 pl-2 lg:pl-3 pr-3" asChild>
          <Link href="/doctor/surgical-cases">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cases</span>
          </Link>
        </Button>
        <div className="h-5 w-px bg-slate-200 hidden sm:block" />
        <h1 className="text-sm font-bold truncate">
          <span className="text-slate-400 font-normal hidden sm:inline">Workspace </span>
          <span className="text-slate-700">
            {patient.first_name} {patient.last_name}
          </span>
        </h1>
      </div>

      {/* Main Layout — 2 columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Patient Info (Desktop only) */}
        <div className="w-[280px] bg-white border-r border-slate-200 shrink-0 hidden lg:flex flex-col overflow-hidden shadow-sm z-10">
          <SidebarContent />
        </div>

        {/* Center: Tab area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 relative">
          {/* Tab Navigation */}
          <div className="border-b border-slate-200 bg-white px-4 md:px-6 shrink-0 pt-2 overflow-x-auto no-scrollbar">
            <div className="flex gap-4 md:gap-6 min-w-max">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      'relative pb-3 pt-2 text-xs md:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap',
                      activeTab === tab.id
                        ? 'text-slate-900'
                        : 'text-slate-400 hover:text-slate-600'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-t-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto w-full">
            {activeTab === 'case-plan' && (
              <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full">
                {isEditingCasePlan ? (
                    <div className="space-y-4">
                        <div className="flex justify-start max-w-2xl mx-auto mb-2">
                           {hasInitialPlanData && (
                               <Button variant="ghost" size="sm" onClick={() => setIsEditingCasePlan(false)}>
                                   <ArrowLeft className="h-4 w-4 mr-2" />
                                   Back to Plan View
                               </Button>
                           )}
                        </div>
                        <SurgicalCasePlanForm
                          caseId={caseId}
                          initialData={initialPlanData}
                          isTheaterTech={false}
                        />
                    </div>
                ) : (
                    <SurgicalCasePlanView
                        onEdit={() => setIsEditingCasePlan(true)}
                        data={initialPlanData}
                        surgeons={surgicalCase.primary_surgeon ? [surgicalCase.primary_surgeon] : []}
                        procedures={surgicalCase.case_procedures?.map(cp => cp.procedure) || []}
                    />
                )}
              </div>
            )}

            {activeTab === 'surgical-notes' && (
              <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full">
                <SurgicalNotesEditor caseId={caseId} />
              </div>
            )}

            {activeTab === 'charge-sheet' && (
              <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto w-full">
                <div className="mb-4 md:mb-6">
                  <h2 className="text-lg font-bold text-slate-800">Charge Sheet</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Services and inventory items billed for this surgical case
                  </p>
                </div>
                <ChargeSheetStep caseId={caseId} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
