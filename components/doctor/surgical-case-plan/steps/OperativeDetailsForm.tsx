'use client';

import { useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StepProps } from './types';

export interface OperativeDetailsFormProps extends StepProps {
  initialData?: {
    anaesthesiaType: string;
    skinToSkinMinutes: number | null;
    totalTheatreMinutes: number | null;
    admissionType: string;
  };
  onBack: () => void;
}

export function OperativeDetailsForm({
  caseId,
  onComplete,
  onError,
  initialData,
  onBack,
}: OperativeDetailsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    anaesthesiaType: initialData?.anaesthesiaType ?? '',
    skinToSkinMinutes: initialData?.skinToSkinMinutes?.toString() ?? '',
    totalTheatreMinutes: initialData?.totalTheatreMinutes?.toString() ?? '',
    admissionType: initialData?.admissionType ?? '',
  });

  const anaesthesias = [
    { value: 'GENERAL', label: 'General' },
    { value: 'LOCAL', label: 'Local' },
    { value: 'REGIONAL', label: 'Regional' },
  ];

  const admissionTypes = [
    { value: 'DAYCASE', label: 'Daycase' },
    { value: 'OVERNIGHT', label: 'Overnight' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/doctor/surgical-cases/${caseId}/plan/page2`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            anaesthesiaType: formData.anaesthesiaType || undefined,
            skinToSkinMinutes: formData.skinToSkinMinutes
              ? parseInt(formData.skinToSkinMinutes)
              : undefined,
            totalTheatreMinutes: formData.totalTheatreMinutes
              ? parseInt(formData.totalTheatreMinutes)
              : undefined,
            admissionType: formData.admissionType || undefined,
          }),
        }
      );

      const data = await res.json();
      if (!data.success) {
        onError(data.error ?? 'Failed to save');
        return;
      }
      onComplete();
    } catch (err: any) {
      onError(err.message ?? 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Anaesthesia Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Anaesthesia Type <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
          {anaesthesias.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                'px-2 md:px-3 py-2.5 md:py-2 border rounded-lg text-sm font-medium transition-colors touch-manipulation',
                formData.anaesthesiaType === opt.value
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 hover:border-slate-400'
              )}
              onClick={() =>
                setFormData((prev) => ({ ...prev, anaesthesiaType: opt.value }))
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Theatre Times */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Skin-to-Skin Time (minutes)
          </label>
          <input
            type="number"
            min="0"
            className="w-full px-3 py-2.5 md:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-transparent text-base md:text-sm"
            placeholder="e.g. 120"
            value={formData.skinToSkinMinutes}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                skinToSkinMinutes: e.target.value,
              }))
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Total Theatre Time (minutes)
          </label>
          <input
            type="number"
            min="0"
            className="w-full px-3 py-2.5 md:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-transparent text-base md:text-sm"
            placeholder="e.g. 180"
            value={formData.totalTheatreMinutes}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                totalTheatreMinutes: e.target.value,
              }))
            }
          />
        </div>
      </div>

      {/* Admission Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Admission Type
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
          {admissionTypes.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                'px-3 py-2.5 md:py-2 border rounded-lg text-sm font-medium transition-colors touch-manipulation',
                formData.admissionType === opt.value
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 hover:border-slate-400'
              )}
              onClick={() =>
                setFormData((prev) => ({ ...prev, admissionType: opt.value }))
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !formData.anaesthesiaType}
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save &amp; Continue
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </form>
  );
}
