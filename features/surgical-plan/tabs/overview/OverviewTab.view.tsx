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
      {/* ═══ SECTION 1: CASE HEADER ═══ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Case Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={readinessConfig.variant} className="text-xs">
              {readinessConfig.label}
            </Badge>
            <Badge variant="outline" className={`text-xs ${statusConfig.className}`}>
              {statusConfig.label}
            </Badge>
          </div>
          {data.case.procedureName && (
            <div>
              <p className="text-xs text-muted-foreground">Procedure</p>
              <p className="text-sm font-medium">{data.case.procedureName}</p>
            </div>
          )}
          {data.casePlan?.estimatedDurationMinutes && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{data.casePlan.estimatedDurationMinutes} minutes</span>
            </div>
          )}
          {data.theaterBooking && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {format(parseISO(data.theaterBooking.startTime), 'MMM d, yyyy • HH:mm')}
              </span>
              {data.theaterBooking.theaterName && (
                <span className="text-muted-foreground">
                  — {data.theaterBooking.theaterName}
                </span>
              )}
            </div>
          )}
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
            <Textarea
              placeholder="Allergies, comorbidities, previous surgeries, BMI considerations..."
              value={riskFactors}
              onChange={(e) => {
                setRiskFactors(e.target.value);
                setHasUnsavedChanges(true);
              }}
              readOnly={readOnly}
              className="min-h-[100px]"
            />
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
