'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Plus, X } from 'lucide-react';
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

interface SelectedProcedure extends Omit<ProcedureOption, 'is_active' | 'estimated_duration_minutes' | 'default_price'> {
  isCustom?: boolean;
  is_active?: boolean;
  estimated_duration_minutes?: number | null;
  default_price?: number | null;
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
  const [selectedProcedures, setSelectedProcedures] = useState<SelectedProcedure[]>([]);
  const [procedureSearch, setProcedureSearch] = useState('');
  const [procedureDropdownOpen, setProcedureDropdownOpen] = useState(false);
  const procedureInputRef = useRef<HTMLInputElement>(null);

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

  const addExistingProcedure = (proc: ProcedureOption) => {
    if (!selectedProcedures.find(p => p.id === proc.id)) {
      setSelectedProcedures(prev => [...prev, proc]);
    }
    setProcedureSearch('');
    setProcedureDropdownOpen(false);
    procedureInputRef.current?.focus();
  };

  const handleCreateAndAddProcedure = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const categoryCode = isCustomCategory ? 'OTHER' : selectedCategory;
    if (!categoryCode) {
      toast.error('Please select a category first');
      return;
    }

    try {
      const response = await frontdeskApi.createProcedureOption({
        name: trimmed,
        category: categoryCode,
        subcategory: isCustomCategory ? customCategoryName.trim() : undefined,
      });
      if (response.success) {
        const newProcedure: SelectedProcedure = {
          id: response.data.id,
          name: response.data.name,
          category: response.data.category,
          subcategory: response.data.subcategory,
          description: response.data.description,
          isCustom: true,
        };
        setSelectedProcedures(prev => [...prev, newProcedure]);
        setProcedureOptions(prev => [...prev, response.data]);
        setProcedureSearch('');
        setProcedureDropdownOpen(false);
        procedureInputRef.current?.focus();
        toast.success(`Procedure "${trimmed}" added`);
      } else {
        toast.error(response.error || 'Failed to create procedure');
      }
    } catch (error) {
      toast.error('Failed to create procedure');
    }
  };

  const removeProcedure = (procedureId: string) => {
    setSelectedProcedures(prev => prev.filter(p => p.id !== procedureId));
  };

  const handleProcedureKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = procedureSearch.trim();
      if (!trimmed) return;

      const exactMatch = procedureOptions.find(
        p => p.name.toLowerCase() === trimmed.toLowerCase()
      );

      if (exactMatch) {
        addExistingProcedure(exactMatch);
      } else {
        handleCreateAndAddProcedure(trimmed);
      }
    }
    if (e.key === 'Escape') {
      setProcedureDropdownOpen(false);
    }
  };

  const filteredProcedures = useMemo(() => {
    if (!procedureSearch) return procedureOptions;
    const lower = procedureSearch.toLowerCase();
    return procedureOptions.filter(p => p.name.toLowerCase().includes(lower));
  }, [procedureSearch, procedureOptions]);

  const exactMatch = useMemo(() => {
    if (!procedureSearch) return false;
    return procedureOptions.some(p => p.name.toLowerCase() === procedureSearch.trim().toLowerCase());
  }, [procedureSearch, procedureOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient || selectedProcedures.length === 0 || !formData.procedureDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.primarySurgeonDoctorId && !formData.primarySurgeonName.trim()) {
      toast.error('Please select or enter a primary surgeon');
      return;
    }

    setIsSubmitting(true);
    try {
      const procedureIds = selectedProcedures.map(p => p.id);
      const response = await frontdeskApi.scheduleSurgicalCase({
        patientId: selectedPatient.id,
        procedureIds,
        procedureDate: formData.procedureDate,
        primarySurgeonDoctorId: formData.primarySurgeonDoctorId || undefined,
        primarySurgeonName: formData.primarySurgeonName.trim() || undefined,
        diagnosis: formData.diagnosis || undefined,
        procedureCategory: isCustomCategory ? customCategoryName.trim() || undefined : selectedCategory || undefined,
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
    setSelectedProcedures([]);
    setProcedureSearch('');
    setProcedureDropdownOpen(false);
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
    setSelectedProcedures([]);
    setProcedureSearch('');
  };

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

          <div className="space-y-2">
            <Label>Procedures *</Label>
            
            {selectedProcedures.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedProcedures.map((proc, idx) => (
                  <span
                    key={proc.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#e7d6bf] bg-[#e7d6bf]/10 text-xs font-medium text-[#2c2e4b]"
                  >
                    <span className="text-[#caa26a] font-bold">{idx + 1}.</span>
                    {proc.name}
                    {proc.subcategory && (
                      <span className="text-[#2c2e4b]/40 ml-1">({proc.subcategory})</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeProcedure(proc.id)}
                      className="ml-1 text-[#2c2e4b]/40 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <Input
                ref={procedureInputRef}
                value={procedureSearch}
                onChange={(e) => {
                  setProcedureSearch(e.target.value);
                  setProcedureDropdownOpen(true);
                }}
                onFocus={() => {
                  if (procedureSearch || filteredProcedures.length > 0) {
                    setProcedureDropdownOpen(true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setProcedureDropdownOpen(false), 150);
                }}
                onKeyDown={handleProcedureKeyDown}
                placeholder={selectedCategory ? 'Type to search or add procedures...' : 'Select a category first...'}
                disabled={!selectedCategory && !isCustomCategory}
                className={!selectedCategory && !isCustomCategory ? 'bg-[#e7d6bf]/10 cursor-not-allowed' : ''}
              />
              
              {procedureDropdownOpen && selectedCategory && (procedureSearch || filteredProcedures.length > 0) && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-[#e7d6bf] rounded-lg shadow-lg max-h-[240px] overflow-y-auto">
                  {filteredProcedures.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-[#2c2e4b]/40 uppercase tracking-wider">
                        Existing Procedures
                      </div>
                      {filteredProcedures.map(proc => (
                        <button
                          key={proc.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addExistingProcedure(proc)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[#e7d6bf]/10 flex items-center justify-between transition-colors"
                        >
                          <span className="text-[#2c2e4b]">{proc.name}</span>
                          {proc.subcategory && (
                            <span className="text-xs text-[#2c2e4b]/40">({proc.subcategory})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {procedureSearch.trim() && !exactMatch && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleCreateAndAddProcedure(procedureSearch.trim())}
                      className="w-full text-left px-3 py-2.5 text-sm text-[#caa26a] hover:bg-[#e7d6bf]/10 flex items-center gap-2 border-t border-[#e7d6bf] transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add "{procedureSearch.trim()}" as new procedure
                    </button>
                  )}
                  
                  {procedureSearch && filteredProcedures.length === 0 && !exactMatch && (
                    <div className="px-3 py-3 text-center text-xs text-[#2c2e4b]/40">
                      No matching procedures found.
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {!selectedCategory && !isCustomCategory && (
              <p className="text-[11px] text-[#2c2e4b]/40">
                Please select a category first to search or add procedures.
              </p>
            )}
          </div>

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
                  <SelectItem key={doctor.id} value={doctor.id}>{doctor.name}</SelectItem>
                ))}
                <SelectItem value="__custom__">Custom...</SelectItem>
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
            <Button type="submit" disabled={isSubmitting || selectedProcedures.length === 0}>
              {isSubmitting ? 'Scheduling...' : `Schedule Procedure${selectedProcedures.length > 1 ? `s (${selectedProcedures.length})` : ''}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
