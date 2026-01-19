'use client';

/**
 * Assign Patient Dialog
 * 
 * Modal dialog for assigning a patient to staff member.
 */

import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api/admin';
import { Button } from '../../ui/button';
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
import type { UserResponseDto } from '../../application/dtos/UserResponseDto';
import { Role } from '../../domain/enums/Role';

interface AssignPatientDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patient: PatientResponseDto;
  adminId: string;
}

export function AssignPatientDialog({
  open,
  onClose,
  onSuccess,
  patient,
  adminId,
}: AssignPatientDialogProps) {
  const [staff, setStaff] = useState<UserResponseDto[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);

  useEffect(() => {
    if (open) {
      loadStaff();
    }
  }, [open]);

  const loadStaff = async () => {
    setLoadingStaff(true);
    try {
      const response = await adminApi.getAllStaff();
      if (response.success && response.data) {
        // Filter for DOCTOR, NURSE, or FRONTDESK only
        const relevantStaff = response.data.filter(
          (s) => s.role === Role.DOCTOR || s.role === Role.NURSE || s.role === Role.FRONTDESK,
        );
        setStaff(relevantStaff);
      }
    } catch (error) {
      toast.error('Failed to load staff');
      console.error('Error loading staff:', error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStaffId) {
      toast.error('Please select a staff member');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await adminApi.assignPatient({
        patientId: patient.id,
        assignedToUserId: selectedStaffId,
        assignedBy: adminId,
        notes: notes.trim() || undefined,
      });

      if (response.success && response.data) {
        toast.success('Patient assigned successfully');
        onSuccess();
        setSelectedStaffId('');
        setNotes('');
      } else {
        toast.error(response.error || 'Failed to assign patient');
      }
    } catch (error) {
      toast.error('An error occurred while assigning patient');
      console.error('Error assigning patient:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Patient to Staff</DialogTitle>
          <DialogDescription>
            Assign {patient.firstName} {patient.lastName} to a staff member
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staff">Select Staff Member *</Label>
              {loadingStaff ? (
                <p className="text-sm text-muted-foreground">Loading staff...</p>
              ) : (
                <select
                  id="staff"
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">-- Select Staff Member --</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName || ''} {member.lastName || ''} ({member.email}) - {member.role}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Assignment Notes (Optional)</Label>
              <textarea
                id="notes"
                placeholder="Add any notes about this assignment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedStaffId}>
              {isSubmitting ? 'Assigning...' : 'Assign Patient'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
