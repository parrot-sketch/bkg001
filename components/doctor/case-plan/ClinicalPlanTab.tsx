/**
 * Clinical Plan Tab (DEPRECATED)
 * 
 * This component has been replaced by modular tabs in features/surgical-plan/tabs/.
 * 
 * Legacy wrapper kept for backward compatibility only.
 * All functionality has been migrated to:
 * - ProcedureTabContainer
 * - RiskFactorsTabContainer
 * - AnesthesiaTabContainer
 * 
 * @deprecated Use the new modular tabs from features/surgical-plan instead.
 */

'use client';

import { ProcedureTabContainer } from '@/features/surgical-plan/tabs/procedure/ProcedureTab.container';
import { RiskFactorsTabContainer } from '@/features/surgical-plan/tabs/risk-factors/RiskFactorsTab.container';
import { AnesthesiaTabContainer } from '@/features/surgical-plan/tabs/anesthesia/AnesthesiaTab.container';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Stethoscope, ShieldAlert, Syringe } from 'lucide-react';

interface ClinicalPlanTabProps {
  casePlan?: any;
  onSave?: (data: any) => Promise<void>;
  saving?: boolean;
}

/**
 * Legacy Clinical Plan Tab
 * 
 * Renders the new modular tabs for backward compatibility.
 * This wrapper will be removed once all references are updated.
 */
export function ClinicalPlanTab({ casePlan, onSave, saving }: ClinicalPlanTabProps) {
  const params = useParams();
  const caseId = params.caseId as string;

  if (!caseId) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Invalid case ID</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="procedure" className="w-full">
      <TabsList>
        <TabsTrigger value="procedure">
          <Stethoscope className="h-4 w-4 mr-2" />
          Procedure
        </TabsTrigger>
        <TabsTrigger value="risk-factors">
          <ShieldAlert className="h-4 w-4 mr-2" />
          Risk Factors
        </TabsTrigger>
        <TabsTrigger value="anesthesia">
          <Syringe className="h-4 w-4 mr-2" />
          Anesthesia
        </TabsTrigger>
      </TabsList>
      <TabsContent value="procedure">
        <ProcedureTabContainer caseId={caseId} />
      </TabsContent>
      <TabsContent value="risk-factors">
        <RiskFactorsTabContainer caseId={caseId} />
      </TabsContent>
      <TabsContent value="anesthesia">
        <AnesthesiaTabContainer caseId={caseId} />
      </TabsContent>
    </Tabs>
  );
}
