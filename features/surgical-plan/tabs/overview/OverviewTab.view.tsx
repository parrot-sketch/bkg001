/**
 * Overview Tab View
 * 
 * Presentational component for overview tab.
 * Displays comprehensive case metadata with procedure details and billing estimate.
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Clock, 
  Calendar, 
  User, 
  Stethoscope,
  Save,
  Loader2,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import type { SurgicalCasePlanViewModel } from '../../core/types';
import { READINESS_CONFIG, STATUS_CONFIG, ANESTHESIA_TYPES } from '../../core/constants';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { surgicalPlanApi } from '../../shared/api/surgicalPlanApi';

interface OverviewTabViewProps {
  data: SurgicalCasePlanViewModel;
  readOnly?: boolean;
}

export function OverviewTabView({ data, readOnly = false }: OverviewTabViewProps) {
  // Form state
  const [procedurePlan, setProcedurePlan] = useState(data.casePlan?.procedurePlan || '');
  const [anesthesiaPlan, setAnesthesiaPlan] = useState(data.casePlan?.anesthesiaPlan || '');
  const [estimatedDuration, setEstimatedDuration] = useState(
    data.casePlan?.estimatedDurationMinutes?.toString() || ''
  );
  const [specialInstructions, setSpecialInstructions] = useState(data.casePlan?.specialInstructions || '');
  const [preOpNotes, setPreOpNotes] = useState(data.casePlan?.preOpNotes || '');
  const [riskFactors, setRiskFactors] = useState(data.casePlan?.riskFactors || '');
  const [side, setSide] = useState(data.case?.side || '');
  
  // Billing estimate state
  const [surgeonFee, setSurgeonFee] = useState('');
  const [anesthesiologistFee, setAnesthesiologistFee] = useState('');
  const [theatreFee, setTheatreFee] = useState('');
  
  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await surgicalPlanApi.updateClinicalPlan(data.caseId, {
        procedurePlan: procedurePlan || undefined,
        anesthesiaPlan: anesthesiaPlan || undefined,
        estimatedDurationMinutes: estimatedDuration ? parseInt(estimatedDuration) : undefined,
        specialInstructions: specialInstructions || undefined,
        preOpNotes: preOpNotes || undefined,
        riskFactors: riskFactors || undefined,
      });
      toast.success('Plan saved successfully');
      setHasUnsavedChanges(false);
    } catch (error) {
      toast.error('Failed to save plan');
    } finally {
      setIsSaving(false);
    }
  };

  const readinessConfig =
    READINESS_CONFIG[data.casePlan?.readinessStatus ?? 'NOT_STARTED'] ??
    READINESS_CONFIG.NOT_STARTED;
  const statusConfig = STATUS_CONFIG[data.case.status] ?? STATUS_CONFIG.DRAFT;

  // Calculate total estimated cost
  const totalEstimatedCost = 
    (parseFloat(surgeonFee) || 0) + 
    (parseFloat(anesthesiologistFee) || 0) + 
    (parseFloat(theatreFee) || 0);

  return (
    <div className="space-y-6">
      {/* ═══ PROCEDURE DETAILS ═══ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Procedure Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Procedure Plan</Label>
            {readOnly ? (
              <div
                className="prose prose-sm max-w-none text-sm text-stone-700 border border-stone-200 rounded-lg p-3 min-h-[120px]"
                dangerouslySetInnerHTML={{ __html: procedurePlan || '<span class="text-stone-400 italic">Not specified</span>' }}
              />
            ) : (
              <Textarea
                placeholder="Describe the surgical approach, technique, and step-by-step plan..."
                value={procedurePlan}
                onChange={(e) => { setProcedurePlan(e.target.value); setHasUnsavedChanges(true); }}
                className="min-h-[120px]"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Anaesthesia Type</Label>
              <Select
                value={anesthesiaPlan}
                onValueChange={(value) => {
                  setAnesthesiaPlan(value);
                  setHasUnsavedChanges(true);
                }}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select anaesthesia type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General Anaesthesia</SelectItem>
                  <SelectItem value="REGIONAL">Regional Anaesthesia</SelectItem>
                  <SelectItem value="LOCAL">Local Anaesthesia</SelectItem>
                  <SelectItem value="SPINAL">Spinal Anaesthesia</SelectItem>
                  <SelectItem value="EPIDURAL">Epidural</SelectItem>
                  <SelectItem value="SEDATION">Conscious Sedation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Procedure Laterality</Label>
              <Select
                value={side}
                onValueChange={(value) => {
                  setSide(value);
                  setHasUnsavedChanges(true);
                }}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select side..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEFT">Left</SelectItem>
                  <SelectItem value="RIGHT">Right</SelectItem>
                  <SelectItem value="BILATERAL">Bilateral</SelectItem>
                  <SelectItem value="N/A">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Special Requirements / Surgeon Notes</Label>
            {readOnly ? (
              <div
                className="prose prose-sm max-w-none text-sm text-stone-700 border border-stone-200 rounded-lg p-3 min-h-[100px]"
                dangerouslySetInnerHTML={{ __html: specialInstructions || '<span class="text-stone-400 italic">None</span>' }}
              />
            ) : (
              <Textarea
                placeholder="Positioning, special equipment, implants, medications..."
                value={specialInstructions}
                onChange={(e) => { setSpecialInstructions(e.target.value); setHasUnsavedChanges(true); }}
                className="min-h-[100px]"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Post-operative Care Instructions</Label>
            {readOnly ? (
              <div
                className="prose prose-sm max-w-none text-sm text-stone-700 border border-stone-200 rounded-lg p-3 min-h-[100px]"
                dangerouslySetInnerHTML={{ __html: preOpNotes || '<span class="text-stone-400 italic">None</span>' }}
              />
            ) : (
              <Textarea
                placeholder="Post-op monitoring, medications, activity restrictions..."
                value={preOpNotes}
                onChange={(e) => { setPreOpNotes(e.target.value); setHasUnsavedChanges(true); }}
                className="min-h-[100px]"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══ SECTION 2: PROCEDURE DETAILS ═══ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Procedure Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Procedure Plan</Label>
            <Textarea
              placeholder="Describe the surgical approach, technique, and step-by-step plan..."
              value={procedurePlan}
              onChange={(e) => {
                setProcedurePlan(e.target.value);
                setHasUnsavedChanges(true);
              }}
              readOnly={readOnly}
              className="min-h-[120px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Anaesthesia Type</Label>
              <Select
                value={anesthesiaPlan}
                onValueChange={(value) => {
                  setAnesthesiaPlan(value);
                  setHasUnsavedChanges(true);
                }}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select anesthesia type..." />
                </SelectTrigger>
                <SelectContent>
                  {ANESTHESIA_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Estimated Duration (minutes)</Label>
              <Input
                type="number"
                placeholder="e.g. 120"
                value={estimatedDuration}
                onChange={(e) => {
                  setEstimatedDuration(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                readOnly={readOnly}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Special Requirements / Surgeon Notes</Label>
            <Textarea
              placeholder="Positioning, special equipment, implants, medications..."
              value={specialInstructions}
              onChange={(e) => {
                setSpecialInstructions(e.target.value);
                setHasUnsavedChanges(true);
              }}
              readOnly={readOnly}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Post-operative Care Instructions</Label>
            <Textarea
              placeholder="Post-op monitoring, medications, activity restrictions..."
              value={preOpNotes}
              onChange={(e) => {
                setPreOpNotes(e.target.value);
                setHasUnsavedChanges(true);
              }}
              readOnly={readOnly}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* ═══ SECTION 3: RISK FACTORS ═══ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Risk Factors & Comorbidities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Risk Factors</Label>
            {readOnly ? (
              <div
                className="prose prose-sm max-w-none text-sm text-stone-700 border border-stone-200 rounded-lg p-3 min-h-[100px]"
                dangerouslySetInnerHTML={{ __html: riskFactors || '<span class="text-stone-400 italic">None specified</span>' }}
              />
            ) : (
              <Textarea
                placeholder="Allergies, comorbidities, previous surgeries, BMI considerations..."
                value={riskFactors}
                onChange={(e) => { setRiskFactors(e.target.value); setHasUnsavedChanges(true); }}
                className="min-h-[100px]"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══ SECTION 4: ESTIMATED BILLING ═══ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Estimated Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Surgeon Fee (KES)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={surgeonFee}
                onChange={(e) => setSurgeonFee(e.target.value)}
                readOnly={readOnly}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Anaesthesiologist Fee (KES)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={anesthesiologistFee}
                onChange={(e) => setAnesthesiologistFee(e.target.value)}
                readOnly={readOnly}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Theatre Fee (KES)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={theatreFee}
                onChange={(e) => setTheatreFee(e.target.value)}
                readOnly={readOnly}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Estimated Total</span>
            <span className="text-lg font-bold">KES {totalEstimatedCost.toLocaleString()}</span>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              These are estimates only. Final bill will be generated after surgery based on actual items used.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ═══ SECTION 5: PLAN STATUS & SUBMISSION ═══ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Plan Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.readinessChecklist.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between text-sm"
              >
                <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                  {item.label}
                </span>
                <Badge variant={item.done ? 'default' : 'outline'} className="text-xs">
                  {item.done ? 'Complete' : 'Pending'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ═══ SAVE BAR ═══ */}
      {hasUnsavedChanges && !readOnly && (
        <div className="sticky bottom-4 flex items-center justify-between p-4 bg-white border rounded-lg shadow-lg">
          <p className="text-sm text-muted-foreground">You have unsaved changes</p>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
