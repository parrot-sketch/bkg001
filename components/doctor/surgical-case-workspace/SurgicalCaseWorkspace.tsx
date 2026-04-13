'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PatientInfoSidebar } from './PatientInfoSidebar';
import { cn } from '@/lib/utils';
import { ClipboardList, Stethoscope } from 'lucide-react';
import { SurgicalCasePlanForm } from '@/components/doctor/surgical-case-plan/SurgicalCasePlanForm';
import OperativeNoteContent from '@/app/doctor/surgical-cases/[caseId]/operative-note/page';

interface Props {
  surgicalCase: any;
  patient: any;
  caseId: string;
  initialPlanData: any;
}

export function SurgicalCaseWorkspace({ surgicalCase, patient, caseId, initialPlanData }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'case-plan');

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.replace(`?tab=${tabId}`, { scroll: false });
  };

  const TABS = [
    { id: 'case-plan', label: 'Case Plan', icon: ClipboardList },
    { id: 'operative-note', label: 'Surgical Notes', icon: Stethoscope },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900">
      
      {/* Header */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 shrink-0 z-10 shadow-sm relative">
        <h1 className="text-lg font-bold">
          Surgical Workspace <span className="text-slate-400 mx-2 font-normal">|</span> 
          <span className="font-semibold text-slate-700">{patient.first_name} {patient.last_name}</span>
        </h1>
      </div>

      {/* Main Layout — 2 columns */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Patient Info (280px) */}
        <div className="w-[280px] bg-white border-r border-slate-200 shrink-0 hidden lg:flex flex-col overflow-hidden shadow-sm z-10">
          <PatientInfoSidebar patient={patient} surgicalCase={surgicalCase} />
        </div>

        {/* Center: Workspace (flex) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 relative">
          
          {/* Tab Navigation */}
          <div className="border-b border-slate-200 bg-white px-6 shrink-0 pt-2">
            <div className="flex gap-6">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      "relative pb-3 pt-2 text-sm font-semibold transition-colors flex items-center gap-2",
                      activeTab === tab.id
                        ? "text-slate-900"
                        : "text-slate-400 hover:text-slate-600"
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
              <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
                <SurgicalCasePlanForm 
                    caseId={caseId} 
                    initialData={initialPlanData} 
                    isTheaterTech={false} 
                />
              </div>
            )}

            {activeTab === 'operative-note' && (
              <div className="w-full">
                {/* Operative Note is full-width self-contained layout */}
                <OperativeNoteContent />
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
