'use client';

/**
 * Complete Consultation Dialog
 * 
 * Medico-legally critical: Finalizes consultation with required outcome and summary.
 * Enforces validation: outcome type and summary are required.
 * 
 * Designed for clinical safety: clear warnings, no accidental completion.
 */

import { useState, useEffect, useMemo } from 'react';
import { doctorApi } from '@/lib/api/doctor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle, Receipt, Plus, Trash2 } from 'lucide-react';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';
import { useServices } from '@/hooks/useServices';
import { useAppointmentBilling } from '@/hooks/doctor/useBilling';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { CompleteConsultationDto } from '@/application/dtos/CompleteConsultationDto';

interface CompleteConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (redirectPath?: string) => void;
  consultation: ConsultationResponseDto;
  appointment: AppointmentResponseDto;
  doctorId: string;
}

export function CompleteConsultationDialog({
  open,
  onClose,
  onSuccess,
  consultation,
  appointment,
  doctorId,
}: CompleteConsultationDialogProps) {
  const [outcomeType, setOutcomeType] = useState<ConsultationOutcomeType | ''>('');
  const [summary, setSummary] = useState('');
  const [patientDecision, setPatientDecision] = useState<PatientDecision | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Billing state
  const { services } = useServices();
  const { data: existingBilling } = useAppointmentBilling(appointment.id, open);
  const [billingItems, setBillingItems] = useState<Array<{ serviceId: number; serviceName: string; quantity: number; unitCost: number }>>([]);
  const [billingDiscount, setBillingDiscount] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState('');

  // Initialize billing items from existing billing data
  useEffect(() => {
    if (existingBilling?.payment?.billItems && existingBilling.payment.billItems.length > 0) {
      setBillingItems(
        existingBilling.payment.billItems.map(item => ({
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          quantity: item.quantity,
          unitCost: item.unitCost,
        }))
      );
      setBillingDiscount(existingBilling.payment.discount || 0);
    }
  }, [existingBilling]);

  // Calculate billing totals
  const billingSubtotal = useMemo(
    () => billingItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
    [billingItems]
  );
  const billingTotal = Math.max(0, billingSubtotal - billingDiscount);

  // Billing handlers
  const handleAddBillingService = () => {
    if (!selectedServiceId) return;
    const service = services.find(s => s.id === parseInt(selectedServiceId));
    if (!service) return;
    const existing = billingItems.findIndex(item => item.serviceId === service.id);
    if (existing >= 0) {
      const updated = [...billingItems];
      updated[existing].quantity += 1;
      setBillingItems(updated);
    } else {
      setBillingItems(prev => [...prev, {
        serviceId: service.id,
        serviceName: service.service_name,
        quantity: 1,
        unitCost: service.price,
      }]);
    }
    setSelectedServiceId('');
  };

  const handleRemoveBillingItem = (serviceId: number) => {
    setBillingItems(prev => prev.filter(item => item.serviceId !== serviceId));
  };

  // Validation
  const isValid = outcomeType !== '' && summary.trim().length > 0;
  const requiresPatientDecision = outcomeType === ConsultationOutcomeType.PROCEDURE_RECOMMENDED;
  const isValidWithDecision = isValid && (!requiresPatientDecision || patientDecision !== '');

  const isFollowUp = outcomeType === ConsultationOutcomeType.FOLLOW_UP_CONSULTATION_NEEDED;
  const isProcedure = outcomeType === ConsultationOutcomeType.PROCEDURE_RECOMMENDED;

  const [actionChoice, setActionChoice] = useState<'complete' | 'plan' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidWithDecision) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const dto: CompleteConsultationDto = {
        appointmentId: appointment.id,
        doctorId,
        outcome: summary.trim(),
        outcomeType: outcomeType as ConsultationOutcomeType,
        patientDecision: requiresPatientDecision ? (patientDecision as PatientDecision) : undefined,
        billingItems: billingItems.length > 0 ? billingItems.map(item => ({
          serviceId: item.serviceId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })) : undefined,
        customTotalAmount: billingItems.length > 0 ? billingTotal : undefined,
        discount: billingDiscount > 0 ? billingDiscount : undefined,
      };

      const response = await doctorApi.completeConsultation(dto);

      if (response.success) {
        if (isProcedure) {
          // Show success but ask for next step
          toast.success('Consultation completed. Patient added to surgery waiting list.');

          if (actionChoice === 'plan') {
            const operativeUrl = `/doctor/operative/plan/${appointment.id}/new`;
            onSuccess(operativeUrl);
          } else {
            onSuccess(); // Just close, return to dashboard
          }
        }
        else if (isFollowUp) {
          toast.success('Consultation completed. Redirecting to schedule follow-up...');
          const bookingUrl = `/doctor/appointments/new?patientId=${appointment.patientId}&type=Follow-up`;
          onSuccess(bookingUrl);
        } else {
          toast.success('Consultation completed successfully');
          onSuccess();
        }
      } else {
        toast.error(response.error || 'Failed to complete consultation');
      }
    } catch (error) {
      toast.error('An error occurred while completing consultation');
      console.error('Error completing consultation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Complete Consultation</DialogTitle>
          <DialogDescription>
            Finalize the consultation with outcome and summary. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <strong>Medico-legal notice:</strong> Once completed, this consultation cannot be edited.
                Ensure all information is accurate and complete.
              </div>
            </div>

            {/* Outcome Type - Required */}
            <div className="space-y-2">
              <Label htmlFor="outcome-type">
                Consultation Outcome <span className="text-destructive">*</span>
              </Label>
              <Select
                value={outcomeType}
                onValueChange={(value) => setOutcomeType(value as ConsultationOutcomeType)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="outcome-type">
                  <SelectValue placeholder="Select outcome type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ConsultationOutcomeType.PROCEDURE_RECOMMENDED}>
                    Procedure Recommended
                  </SelectItem>
                  <SelectItem value={ConsultationOutcomeType.CONSULTATION_ONLY}>
                    Consultation Only
                  </SelectItem>
                  <SelectItem value={ConsultationOutcomeType.FOLLOW_UP_CONSULTATION_NEEDED}>
                    Follow-Up Consultation Needed
                  </SelectItem>
                  <SelectItem value={ConsultationOutcomeType.PATIENT_DECIDING}>
                    Patient Deciding
                  </SelectItem>
                  <SelectItem value={ConsultationOutcomeType.REFERRAL_NEEDED}>
                    Referral Needed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Patient Decision - Required if Procedure Recommended */}
            {requiresPatientDecision && (
              <div className="space-y-2">
                <Label htmlFor="patient-decision">
                  Patient Decision <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={patientDecision}
                  onValueChange={(value) => setPatientDecision(value as PatientDecision)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="patient-decision">
                    <SelectValue placeholder="Select patient decision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PatientDecision.YES}>Yes - Proceed</SelectItem>
                    <SelectItem value={PatientDecision.NO}>No - Decline</SelectItem>
                    <SelectItem value={PatientDecision.PENDING}>Pending - Needs Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Consultation Summary - Required */}
            <div className="space-y-2">
              <Label htmlFor="summary">
                Consultation Summary <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="summary"
                placeholder="Chief complaint, examination findings, assessment, and plan..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
                disabled={isSubmitting}
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Include: Chief complaint, examination, assessment, and plan
              </p>
            </div>

            {/* Billing Section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Billing
                </Label>
                {billingItems.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {billingTotal.toLocaleString()} total
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                Add services to create an itemized bill. If no services are added, the default consultation fee will be used.
              </p>

              {/* Add Service */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    value={selectedServiceId}
                    onValueChange={setSelectedServiceId}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Add a service..." />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(service => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          <span>{service.service_name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({service.price.toLocaleString()})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddBillingService}
                  disabled={!selectedServiceId || isSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Billing Items List */}
              {billingItems.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {billingItems.map(item => (
                    <div
                      key={item.serviceId}
                      className="flex items-center justify-between py-1.5 px-2 bg-muted/50 rounded text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{item.serviceName}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => {
                            const qty = parseInt(e.target.value) || 1;
                            setBillingItems(prev =>
                              prev.map(i => i.serviceId === item.serviceId ? { ...i, quantity: qty } : i)
                            );
                          }}
                          className="w-14 h-7 text-xs text-center"
                          disabled={isSubmitting}
                        />
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          × {item.unitCost.toLocaleString()}
                        </span>
                        <span className="font-medium text-xs w-20 text-right">
                          {(item.quantity * item.unitCost).toLocaleString()}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveBillingItem(item.serviceId)}
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Discount and Total */}
                  <div className="flex items-center justify-between pt-2 border-t text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Discount:</span>
                      <Input
                        type="number"
                        min={0}
                        value={billingDiscount}
                        onChange={e => setBillingDiscount(parseFloat(e.target.value) || 0)}
                        className="w-20 h-7 text-xs"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="font-bold">
                      Total: {billingTotal.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            {isProcedure ? (
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={!isValidWithDecision || isSubmitting}
                  onClick={() => setActionChoice('complete')}
                  className="bg-slate-800 text-white min-w-[120px]"
                >
                  {isSubmitting && actionChoice === 'complete' ? 'Completing...' : 'Finish & Exit'}
                </Button>
                <Button
                  type="submit"
                  disabled={!isValidWithDecision || isSubmitting}
                  onClick={() => setActionChoice('plan')}
                  className="bg-primary text-primary-foreground min-w-[120px] gap-2"
                >
                  {isSubmitting && actionChoice === 'plan' ? 'Redirecting...' : 'Plan Surgery Now'}
                </Button>
              </div>
            ) : (
              <Button
                type="submit"
                disabled={!isValidWithDecision || isSubmitting}
                className="bg-primary text-primary-foreground min-w-[120px]"
              >
                {isSubmitting ? 'Completing...' : (isFollowUp ? 'Complete & Schedule' : 'Complete Consultation')}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
