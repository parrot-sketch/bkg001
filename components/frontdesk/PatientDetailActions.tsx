'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { PatientEditDialog } from '@/components/frontdesk/PatientEditDialog';
import type { PatientDetailDto } from '@/application/dtos/PatientDetailDto';
import { useQueryClient } from '@tanstack/react-query';

export function PatientDetailActions({ patient }: { patient: PatientDetailDto }) {
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setEditOpen(true)}
        className="gap-1.5 rounded-none border-white/40 bg-transparent text-white shadow-none hover:bg-white/10 hover:text-white"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>

      <PatientEditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
          // Force server component re-render
          window.location.reload();
        }}
        patient={patient}
      />
    </>
  );
}
