'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Activity, Save, Loader2 } from 'lucide-react';
import { frontdeskApi } from '@/lib/api/frontdesk';

interface RecordVitalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  patientName: string;
  onSuccess?: () => void;
}

export function RecordVitalsDialog({ open, onOpenChange, caseId, patientName, onSuccess }: RecordVitalsDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    bodyTemperature: '',
    systolic: '',
    diastolic: '',
    heartRate: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        bodyTemperature: '',
        systolic: '',
        diastolic: '',
        heartRate: '',
        respiratoryRate: '',
        oxygenSaturation: '',
        weight: '',
        height: '',
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasVitalSigns =
      formData.bodyTemperature ||
      formData.systolic ||
      formData.diastolic ||
      formData.heartRate ||
      formData.respiratoryRate ||
      formData.oxygenSaturation ||
      formData.weight ||
      formData.height;

    if (!hasVitalSigns) {
      toast.error('Please enter at least one vital sign');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/theater-tech/surgical-cases/${caseId}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bodyTemperature: formData.bodyTemperature ? parseFloat(formData.bodyTemperature) : undefined,
          systolic: formData.systolic ? parseInt(formData.systolic, 10) : undefined,
          diastolic: formData.diastolic ? parseInt(formData.diastolic, 10) : undefined,
          heartRate: formData.heartRate || undefined,
          respiratoryRate: formData.respiratoryRate ? parseInt(formData.respiratoryRate, 10) : undefined,
          oxygenSaturation: formData.oxygenSaturation ? parseInt(formData.oxygenSaturation, 10) : undefined,
          weight: formData.weight ? parseFloat(formData.weight) : undefined,
          height: formData.height ? parseFloat(formData.height) : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Vital signs recorded successfully');
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(data.error || 'Failed to record vital signs');
      }
    } catch (error) {
      toast.error('Failed to record vital signs');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-500" />
            Record Vitals
          </DialogTitle>
          <DialogDescription>
            Record pre-operative vital signs for {patientName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bodyTemperature">Temperature (°C)</Label>
              <Input
                id="bodyTemperature"
                type="number"
                step="0.1"
                placeholder="36.5"
                value={formData.bodyTemperature}
                onChange={(e) => updateField('bodyTemperature', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
              <Input
                id="heartRate"
                type="text"
                placeholder="72"
                value={formData.heartRate}
                onChange={(e) => updateField('heartRate', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="systolic">Blood Pressure Systolic (mmHg)</Label>
              <Input
                id="systolic"
                type="number"
                placeholder="120"
                value={formData.systolic}
                onChange={(e) => updateField('systolic', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diastolic">Blood Pressure Diastolic (mmHg)</Label>
              <Input
                id="diastolic"
                type="number"
                placeholder="80"
                value={formData.diastolic}
                onChange={(e) => updateField('diastolic', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="respiratoryRate">Respiratory Rate (/min)</Label>
              <Input
                id="respiratoryRate"
                type="number"
                placeholder="16"
                value={formData.respiratoryRate}
                onChange={(e) => updateField('respiratoryRate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oxygenSaturation">SpO2 (%)</Label>
              <Input
                id="oxygenSaturation"
                type="number"
                placeholder="98"
                value={formData.oxygenSaturation}
                onChange={(e) => updateField('oxygenSaturation', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="70"
                value={formData.weight}
                onChange={(e) => updateField('weight', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                placeholder="170"
                value={formData.height}
                onChange={(e) => updateField('height', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Vitals
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
