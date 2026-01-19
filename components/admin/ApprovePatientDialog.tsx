'use client';

/**
 * Approve Patient Dialog
 * 
 * Modal dialog for approving patient registration.
 */

import { useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

interface ApprovePatientDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patient: PatientResponseDto;
  adminId: string;
}

export function ApprovePatientDialog({
  open,
  onClose,
  onSuccess,
  patient,
  adminId,
}: ApprovePatientDialogProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      const response = await adminApi.approvePatient({
        patientId: patient.id,
        approvedBy: adminId,
        notes: notes.trim() || undefined,
      });

      if (response.success && response.data) {
        toast.success('Patient approved successfully');
        onSuccess();
        setNotes('');
      } else if (!response.success) {
        toast.error(response.error || 'Failed to approve patient');
      } else {
        toast.error('Failed to approve patient');
      }
    } catch (error) {
      toast.error('An error occurred while approving patient');
      console.error('Error approving patient:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Approve Patient Registration</DialogTitle>
          <DialogDescription>
            Approve registration for {patient.firstName} {patient.lastName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Patient Information</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium">Name:</span> {patient.firstName} {patient.lastName}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {patient.email}
                </p>
                {patient.phone && (
                  <p>
                    <span className="font-medium">Phone:</span> {patient.phone}
                  </p>
                )}
                {patient.dateOfBirth && (
                  <p>
                    <span className="font-medium">Age:</span> {patient.age} years
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Approval Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this approval..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Approving...' : 'Approve Patient'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
