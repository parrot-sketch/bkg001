'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import type { FrontdeskSurgicalCaseListItem } from '@/lib/api/frontdesk';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

interface EditSurgicalCaseDialogProps {
  open: boolean;
  caseItem: FrontdeskSurgicalCaseListItem | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const COMMON_PROCEDURES = [
  'Rhinoplasty',
  'Blepharoplasty',
  'Facelift',
  'Liposuction',
  'Breast Augmentation',
  'Tummy Tuck',
  'Liposuction with Fat Transfer',
  'Gynecomastia Surgery',
];

const PROCEDURE_CATEGORIES = [
  { value: 'FACIAL', label: 'Facial' },
  { value: 'BODY', label: 'Body' },
  { value: 'BREAST', label: 'Breast' },
  { value: 'SKIN_AND_SCAR', label: 'Skin & Scar' },
  { value: 'NON_SURGICAL', label: 'Non-Surgical' },
  { value: 'OTHER', label: 'Other' },
];

export function EditSurgicalCaseDialog({ open, caseItem, onOpenChange, onSuccess }: EditSurgicalCaseDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [formData, setFormData] = useState({
    procedureName: '',
    procedureDate: format(new Date(), 'yyyy-MM-dd'),
    primarySurgeonDoctorId: '',
    primarySurgeonName: '',
    isCustomSurgeon: false,
    diagnosis: '',
    procedureCategory: '',
    primaryOrRevision: '',
    admissionType: '',
    status: '',
  });

  useEffect(() => {
    if (open && caseItem) {
      const dateStr = caseItem.procedure_date ? format(new Date(caseItem.procedure_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      const isCustom = Boolean(caseItem.procedure_name && !COMMON_PROCEDURES.includes(caseItem.procedure_name));

      setFormData({
        procedureName: caseItem.procedure_name || '',
        procedureDate: dateStr,
        primarySurgeonDoctorId: caseItem.primary_surgeon?.id || '',
        primarySurgeonName: caseItem.primary_surgeon_name || '',
        isCustomSurgeon: !caseItem.primary_surgeon?.id && !!caseItem.primary_surgeon_name,
        diagnosis: caseItem.diagnosis || '',
        procedureCategory: caseItem.procedure_category || '',
        primaryOrRevision: caseItem.primary_or_revision || '',
        admissionType: caseItem.admission_type || '',
        status: caseItem.status,
      });
      setIsCustomCategory(!PROCEDURE_CATEGORIES.some(c => c.value === caseItem.procedure_category) && !!caseItem.procedure_category);
      setCustomCategory(caseItem.procedure_category || '');
      loadDoctors();
    }
  }, [open, caseItem]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseItem) return;

    if (!formData.procedureName || !formData.procedureDate) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!formData.primarySurgeonDoctorId && !formData.primarySurgeonName.trim()) {
      toast.error('Please select or enter a primary surgeon');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        procedureName: formData.procedureName,
        procedureDate: formData.procedureDate,
        primarySurgeonDoctorId: formData.primarySurgeonDoctorId || undefined,
        primarySurgeonName: formData.primarySurgeonName.trim() || undefined,
        diagnosis: formData.diagnosis || null,
        procedureCategory: isCustomCategory ? customCategory.trim() : (formData.procedureCategory || null),
        primaryOrRevision: formData.primaryOrRevision || null,
        admissionType: formData.admissionType || null,
        status: formData.status,
      };
      const response = await frontdeskApi.updateSurgicalCase(caseItem.id, payload);

      if (response.success) {
        toast.success('Surgical case updated');
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(response.error || 'Failed to update case');
      }
    } catch (error) {
      toast.error('Failed to update case');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSurgeonChange = (value: string) => {
    if (value === '__custom__') {
      setFormData(prev => ({ ...prev, isCustomSurgeon: true, primarySurgeonDoctorId: '', primarySurgeonName: '' }));
    } else {
      setFormData(prev => ({ ...prev, isCustomSurgeon: false, primarySurgeonDoctorId: value, primarySurgeonName: '' }));
    }
  };

  const handleCategoryChange = (value: string) => {
    if (value === '__custom__') {
      setIsCustomCategory(true);
      setFormData(prev => ({ ...prev, procedureCategory: '' }));
    } else {
      setIsCustomCategory(false);
      setFormData(prev => ({ ...prev, procedureCategory: value }));
    }
  };

  if (!caseItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Surgical Case</DialogTitle>
          <DialogDescription>
            Update procedure details, schedule, or surgeon assignment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="procedure">Procedure Name *</Label>
            <Input
              id="procedure"
              value={formData.procedureName}
              onChange={(e) => setFormData(prev => ({ ...prev, procedureName: e.target.value }))}
              placeholder="Type or select a procedure"
              list="procedure-list"
              required
            />
            <datalist id="procedure-list">
              {COMMON_PROCEDURES.map(proc => (
                <option key={proc} value={proc} />
              ))}
            </datalist>
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
            <Select value={formData.isCustomSurgeon ? '__custom__' : formData.primarySurgeonDoctorId} onValueChange={handleSurgeonChange}>
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
                <Label htmlFor="procedureCategory">Category</Label>
                <Select value={isCustomCategory ? '__custom__' : formData.procedureCategory} onValueChange={handleCategoryChange}>
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
                  <Input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category"
                    className="mt-2"
                    autoFocus
                  />
                )}
              </div>

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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
