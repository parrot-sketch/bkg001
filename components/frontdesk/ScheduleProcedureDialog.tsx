'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { doctorApi } from '@/lib/api/doctor';
import { queryKeys } from '@/lib/constants/queryKeys';
import { PatientCombobox } from '@/components/frontdesk/PatientCombobox';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import type { ProcedureOption } from '@/lib/api/frontdesk';

interface ScheduleProcedureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PROCEDURE_CATEGORIES = [
  { value: 'FACIAL', label: 'Facial' },
  { value: 'BODY', label: 'Body' },
  { value: 'BREAST', label: 'Breast' },
  { value: 'SKIN_AND_SCAR', label: 'Skin & Scar' },
  { value: 'NON_SURGICAL', label: 'Non-Surgical' },
  { value: 'OTHER', label: 'Other' },
];

export function ScheduleProcedureDialog({ open, onOpenChange, onSuccess }: ScheduleProcedureDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');

  const [procedureOptions, setProcedureOptions] = useState<ProcedureOption[]>([]);
  const [selectedProcedureId, setSelectedProcedureId] = useState('');
  const [isCustomProcedure, setIsCustomProcedure] = useState(false);
  const [customProcedureName, setCustomProcedureName] = useState('');

  const [formData, setFormData] = useState({
    procedureDate: format(new Date(), 'yyyy-MM-dd'),
    primarySurgeonDoctorId: '',
    primarySurgeonName: '',
    isCustomSurgeon: false,
    diagnosis: '',
    primaryOrRevision: '',
    admissionType: '',
  });

  useEffect(() => {
    if (open) {
      loadDoctors();
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (selectedCategory && !isCustomCategory) {
      loadProcedureOptions(selectedCategory);
    } else {
      setProcedureOptions([]);
      setSelectedProcedureId('');
    }
  }, [selectedCategory, isCustomCategory]);

  const loadDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const response = await doctorApi.getAllDoctors();
      if (response.success && response.data) {
        setDoctors(response.data);
      }
    } catch (error) {
      console.error('Failed to load doctors:', error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const loadProcedureOptions = async (category: string) => {
    try {
      const response = await frontdeskApi.getProcedureOptions({ category });
      if (response.success && response.data) {
        setProcedureOptions(response.data);
      }
    } catch (error) {
      console.error('Failed to load procedure options:', error);
    }
  };

  const handleCreateCustomCategory = async () => {
    if (!customCategoryName.trim()) return;
    const name = customCategoryName.trim();
    const categoryCode = 'OTHER';
    try {
      const response = await frontdeskApi.createProcedureOption({
        name: name,
        category: categoryCode,
        subcategory: name,
      });
      if (response.success) {
        toast.success(`Category "${name}" created`);
        setSelectedCategory(categoryCode);
        setIsCustomCategory(false);
        setCustomCategoryName('');
        await loadProcedureOptions(categoryCode);
      } else {
        toast.error(response.error || 'Failed to create category');
      }
    } catch (error) {
      toast.error('Failed to create category');
    }
  };

  const handleCreateCustomProcedure = async () => {
    if (!customProcedureName.trim() || !selectedCategory) return;
    const name = customProcedureName.trim();
    const categoryCode = isCustomCategory ? 'OTHER' : selectedCategory;
    try {
      const response = await frontdeskApi.createProcedureOption({
        name,
        category: categoryCode,
        subcategory: isCustomCategory ? customCategoryName.trim() : undefined,
      });
      if (response.success) {
        toast.success(`Procedure "${name}" added`);
        setSelectedProcedureId(response.data.id);
        setIsCustomProcedure(false);
        setCustomProcedureName('');
        if (isCustomCategory) {
          await loadProcedureOptions('OTHER');
        } else {
          await loadProcedureOptions(selectedCategory);
        }
      } else {
        toast.error(response.error || 'Failed to create procedure');
      }
    } catch (error) {
      toast.error('Failed to create procedure');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const effectiveCategory = isCustomCategory ? customCategoryName.trim() : selectedCategory;
    const effectiveProcedure = isCustomProcedure ? customProcedureName.trim() : procedureOptions.find(p => p.id === selectedProcedureId)?.name;

    if (!selectedPatient || !effectiveProcedure || !formData.procedureDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.primarySurgeonDoctorId && !formData.primarySurgeonName.trim()) {
      toast.error('Please select or enter a primary surgeon');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await frontdeskApi.scheduleSurgicalCase({
        patientId: selectedPatient.id,
        procedureName: effectiveProcedure,
        procedureDate: formData.procedureDate,
        primarySurgeonDoctorId: formData.primarySurgeonDoctorId || undefined,
        primarySurgeonName: formData.primarySurgeonName.trim() || undefined,
        diagnosis: formData.diagnosis || undefined,
        procedureCategory: effectiveCategory || undefined,
        primaryOrRevision: formData.primaryOrRevision || undefined,
        admissionType: formData.admissionType || undefined,
      });

      if (response.success && response.data) {
        toast.success(`Surgical case scheduled for ${response.data.patientName}`);
        onOpenChange(false);
        onSuccess?.();
        queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaterQueue() });
        queryClient.invalidateQueries({ queryKey: queryKeys.shared.surgicalCases() });
        resetForm();
      } else {
        toast.error(response.error || 'Failed to schedule procedure');
      }
    } catch (error) {
      toast.error('Failed to schedule procedure');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setSelectedCategory('');
    setIsCustomCategory(false);
    setCustomCategoryName('');
    setProcedureOptions([]);
    setSelectedProcedureId('');
    setIsCustomProcedure(false);
    setCustomProcedureName('');
    setFormData({
      procedureDate: format(new Date(), 'yyyy-MM-dd'),
      primarySurgeonDoctorId: '',
      primarySurgeonName: '',
      isCustomSurgeon: false,
      diagnosis: '',
      primaryOrRevision: '',
      admissionType: '',
    });
  };

  const handleCategoryChange = (value: string) => {
    if (value === '__custom__') {
      setIsCustomCategory(true);
      setSelectedCategory('');
    } else {
      setIsCustomCategory(false);
      setSelectedCategory(value);
    }
    setSelectedProcedureId('');
    setIsCustomProcedure(false);
  };

  const handleProcedureChange = (value: string) => {
    if (value === '__custom__') {
      setIsCustomProcedure(true);
      setSelectedProcedureId('');
    } else {
      setIsCustomProcedure(false);
      setSelectedProcedureId(value);
    }
  };

  const selectedProcedureName = useMemo(() => {
    if (isCustomProcedure) return customProcedureName;
    return procedureOptions.find(p => p.id === selectedProcedureId)?.name || '';
  }, [isCustomProcedure, customProcedureName, procedureOptions, selectedProcedureId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Procedure</DialogTitle>
          <DialogDescription>
            Create a new surgical case and schedule it for the selected date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="patient">Patient *</Label>
            <PatientCombobox
              value={selectedPatient?.id || ''}
              onSelect={(patientId, patient) => {
                setSelectedPatient(patient || null);
              }}
            />
            {selectedPatient && (
              <p className="text-xs text-[#2c2e4b]/50">
                {selectedPatient.email} • {selectedPatient.phone || 'No phone'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={isCustomCategory ? '__custom__' : selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {PROCEDURE_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
                <SelectItem value="__custom__">Custom...</SelectItem>
              </SelectContent>
            </Select>
            {isCustomCategory && (
              <div className="flex gap-2 mt-2">
                <Input
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  placeholder="Enter new category name"
                  className="flex-1"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateCustomCategory}
                  disabled={!customCategoryName.trim()}
                  className="bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b]"
                >
                  Add
                </Button>
              </div>
            )}
          </div>

          {selectedCategory && !isCustomCategory && (
            <div className="space-y-2">
              <Label htmlFor="procedure">Procedure Name *</Label>
              <Select value={isCustomProcedure ? '__custom__' : selectedProcedureId} onValueChange={handleProcedureChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select procedure" />
                </SelectTrigger>
                <SelectContent>
                  {procedureOptions.map(proc => (
                    <SelectItem key={proc.id} value={proc.id}>
                      {proc.name} {proc.subcategory ? `(${proc.subcategory})` : ''}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">Custom...</SelectItem>
                </SelectContent>
              </Select>
              {isCustomProcedure && (
                <div className="flex gap-2 mt-2">
                  <Input
                    value={customProcedureName}
                    onChange={(e) => setCustomProcedureName(e.target.value)}
                    placeholder="Enter new procedure name"
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateCustomProcedure}
                    disabled={!customProcedureName.trim()}
                    className="bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b]"
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
          )}

          {isCustomCategory && customCategoryName && (
            <div className="space-y-2">
              <Label htmlFor="customProcedure">Procedure Name *</Label>
              <div className="flex gap-2">
                <Input
                  value={customProcedureName}
                  onChange={(e) => setCustomProcedureName(e.target.value)}
                  placeholder="Enter procedure name"
                  className="flex-1"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateCustomProcedure}
                  disabled={!customProcedureName.trim()}
                  className="bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b]"
                >
                  Add
                </Button>
              </div>
              <p className="text-[11px] text-[#2c2e4b]/50">
                Custom procedure will be saved under "{customCategoryName}".
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="procedureDate">Procedure Date *</Label>
              <Input
                id="procedureDate"
                type="date"
                value={formData.procedureDate}
                onChange={(e) => setFormData(prev => ({ ...prev, procedureDate: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admissionType">Admission Type</Label>
              <Select value={formData.admissionType} onValueChange={(value) => setFormData(prev => ({ ...prev, admissionType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAYCASE">Daycase</SelectItem>
                  <SelectItem value="OVERNIGHT">Overnight</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="surgeon">Primary Surgeon</Label>
            <Select value={formData.isCustomSurgeon ? '__custom__' : formData.primarySurgeonDoctorId} onValueChange={(value) => {
              if (value === '__custom__') {
                setFormData(prev => ({ ...prev, isCustomSurgeon: true, primarySurgeonDoctorId: '', primarySurgeonName: '' }));
              } else {
                setFormData(prev => ({ ...prev, isCustomSurgeon: false, primarySurgeonDoctorId: value, primarySurgeonName: '' }));
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a surgeon or enter custom name" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map(doctor => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name} {doctor.specialization ? `(${doctor.specialization})` : ''}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">External surgeon...</SelectItem>
              </SelectContent>
            </Select>
            {formData.isCustomSurgeon && (
              <Input
                value={formData.primarySurgeonName}
                onChange={(e) => setFormData(prev => ({ ...prev, primarySurgeonName: e.target.value }))}
                placeholder="Enter surgeon name"
                className="mt-2"
                autoFocus
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Input
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
              placeholder="Enter diagnosis"
            />
          </div>

          <div className="border border-[#e7d6bf] rounded-lg p-4 bg-[#e7d6bf]/5">
            <div className="flex items-center gap-2 mb-3">
              <Label className="text-xs font-bold text-[#2c2e4b] uppercase tracking-wider">Procedure Details</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryOrRevision">Primary / Revision</Label>
                <Select value={formData.primaryOrRevision} onValueChange={(value) => setFormData(prev => ({ ...prev, primaryOrRevision: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIMARY">Primary</SelectItem>
                    <SelectItem value="REVISION">Revision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedProcedureName}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Procedure'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
