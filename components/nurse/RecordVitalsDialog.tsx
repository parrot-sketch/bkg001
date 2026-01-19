'use client';

/**
 * Record Vitals Dialog
 * 
 * Modal dialog for recording patient vital signs.
 * Allows nurses to record comprehensive vital signs data.
 */

import { useState } from 'react';
import { nurseApi } from '../../lib/api/nurse';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { toast } from 'sonner';
import type { PatientResponseDto } from '../../application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '../../application/dtos/AppointmentResponseDto';
import type { RecordVitalsDto } from '../../lib/api/nurse';

interface RecordVitalsDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patient: PatientResponseDto;
  appointment: AppointmentResponseDto | null;
  nurseId: string;
}

export function RecordVitalsDialog({
  open,
  onClose,
  onSuccess,
  patient,
  appointment,
  nurseId,
}: RecordVitalsDialogProps) {
  const [formData, setFormData] = useState<Partial<RecordVitalsDto>>({
    patientId: patient.id,
    appointmentId: appointment?.id,
    bodyTemperature: undefined,
    systolic: undefined,
    diastolic: undefined,
    heartRate: undefined,
    respiratoryRate: undefined,
    oxygenSaturation: undefined,
    weight: undefined,
    height: undefined,
    recordedBy: nurseId,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      const dto: RecordVitalsDto = {
        patientId: formData.patientId!,
        appointmentId: formData.appointmentId,
        bodyTemperature: formData.bodyTemperature ? parseFloat(formData.bodyTemperature.toString()) : undefined,
        systolic: formData.systolic ? parseInt(formData.systolic.toString()) : undefined,
        diastolic: formData.diastolic ? parseInt(formData.diastolic.toString()) : undefined,
        heartRate: formData.heartRate || undefined,
        respiratoryRate: formData.respiratoryRate ? parseInt(formData.respiratoryRate.toString()) : undefined,
        oxygenSaturation: formData.oxygenSaturation
          ? parseInt(formData.oxygenSaturation.toString())
          : undefined,
        weight: formData.weight ? parseFloat(formData.weight.toString()) : undefined,
        height: formData.height ? parseFloat(formData.height.toString()) : undefined,
        recordedBy: nurseId,
      };

      const response = await nurseApi.recordVitals(dto);

      if (response.success) {
        toast.success('Vital signs recorded successfully');
        onSuccess();
        // Reset form
        setFormData({
          patientId: patient.id,
          appointmentId: appointment?.id,
          bodyTemperature: undefined,
          systolic: undefined,
          diastolic: undefined,
          heartRate: undefined,
          respiratoryRate: undefined,
          oxygenSaturation: undefined,
          weight: undefined,
          height: undefined,
          recordedBy: nurseId,
        });
      } else {
        toast.error(response.error || 'Failed to record vital signs');
      }
    } catch (error) {
      toast.error('An error occurred while recording vital signs');
      console.error('Error recording vitals:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Vital Signs</DialogTitle>
          <DialogDescription>
            Record vital signs for {patient.firstName} {patient.lastName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4 py-4">
            {/* Vital Signs */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="text-sm font-semibold">Vital Signs</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bodyTemperature">Body Temperature (°C)</Label>
                  <Input
                    id="bodyTemperature"
                    type="number"
                    step="0.1"
                    placeholder="36.5"
                    value={formData.bodyTemperature || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bodyTemperature: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                  <Input
                    id="heartRate"
                    placeholder="72"
                    value={formData.heartRate || ''}
                    onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="systolic">Systolic BP (mmHg)</Label>
                  <Input
                    id="systolic"
                    type="number"
                    placeholder="120"
                    value={formData.systolic || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        systolic: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diastolic">Diastolic BP (mmHg)</Label>
                  <Input
                    id="diastolic"
                    type="number"
                    placeholder="80"
                    value={formData.diastolic || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        diastolic: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="respiratoryRate">Respiratory Rate (per min)</Label>
                  <Input
                    id="respiratoryRate"
                    type="number"
                    placeholder="16"
                    value={formData.respiratoryRate || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        respiratoryRate: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oxygenSaturation">Oxygen Saturation (%)</Label>
                  <Input
                    id="oxygenSaturation"
                    type="number"
                    placeholder="98"
                    value={formData.oxygenSaturation || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        oxygenSaturation: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    placeholder="70.5"
                    value={formData.weight || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weight: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    placeholder="170"
                    value={formData.height || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        height: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Record Vitals'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
