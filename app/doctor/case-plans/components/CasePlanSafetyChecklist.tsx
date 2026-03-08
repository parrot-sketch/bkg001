'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle2 } from 'lucide-react';

interface CheckItemProps {
  label: string;
  checked: boolean;
}

function CheckItem({ label, checked }: CheckItemProps) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${checked ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
        {label}
      </span>
      {checked ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
      )}
    </div>
  );
}

interface CasePlanSafetyChecklistProps {
  hasProcedure: boolean;
  hasRisks: boolean;
  hasAnesthesia: boolean;
  hasConsents: boolean;
  hasImages: boolean;
}

export function CasePlanSafetyChecklist({
  hasProcedure,
  hasRisks,
  hasAnesthesia,
  hasConsents,
  hasImages,
}: CasePlanSafetyChecklistProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Safety & Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CheckItem label="Procedure Defined" checked={hasProcedure} />
        <CheckItem label="Risk Factors Assessed" checked={hasRisks} />
        <CheckItem label="Anesthesia Planned" checked={hasAnesthesia} />
        <CheckItem label="Consents Signed" checked={hasConsents} />
        <CheckItem label="Pre-Op Images" checked={hasImages} />
      </CardContent>
    </Card>
  );
}
