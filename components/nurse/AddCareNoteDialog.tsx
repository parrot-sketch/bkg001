'use client';

/**
 * Add Care Note Dialog
 * 
 * Modal dialog for adding care notes for patients.
 * Supports pre-op, post-op, and general care notes.
 */

import { useState } from 'react';
import { nurseApi } from '../../lib/api/nurse';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
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
import type { AddCareNoteDto } from '../../lib/api/nurse';

interface AddCareNoteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patient: PatientResponseDto;
  appointment: AppointmentResponseDto | null;
  nurseId: string;
  defaultNoteType?: 'PRE_OP' | 'POST_OP' | 'GENERAL';
}

export function AddCareNoteDialog({
  open,
  onClose,
  onSuccess,
  patient,
  appointment,
  nurseId,
  defaultNoteType = 'GENERAL',
}: AddCareNoteDialogProps) {
  const [note, setNote] = useState('');
  const [noteType, setNoteType] = useState<'PRE_OP' | 'POST_OP' | 'GENERAL'>(defaultNoteType);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!note.trim()) {
      toast.error('Please enter a care note');
      return;
    }

    setIsSubmitting(true);

    try {
      const dto: AddCareNoteDto = {
        patientId: patient.id,
        appointmentId: appointment?.id,
        note: note.trim(),
        noteType,
        recordedBy: nurseId,
      };

      const response = await nurseApi.addCareNote(dto);

      if (response.success) {
        toast.success('Care note added successfully');
        onSuccess();
        setNote('');
        setNoteType(defaultNoteType);
      } else {
        toast.error(response.error || 'Failed to add care note');
      }
    } catch (error) {
      toast.error('An error occurred while adding care note');
      console.error('Error adding care note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Care Note</DialogTitle>
          <DialogDescription>
            Add a care note for {patient.firstName} {patient.lastName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="noteType">Note Type</Label>
              <select
                id="noteType"
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as 'PRE_OP' | 'POST_OP' | 'GENERAL')}
                disabled={isSubmitting}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="GENERAL">General</option>
                <option value="PRE_OP">Pre-op</option>
                <option value="POST_OP">Post-op</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Care Note *</Label>
              <Textarea
                id="note"
                placeholder="Enter care notes, observations, treatments administered..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
                disabled={isSubmitting}
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
