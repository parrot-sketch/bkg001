'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import type { UserResponseDto } from '@/application/dtos/UserResponseDto';
import { Status } from '@/domain/enums/Status';

interface StaffStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: UserResponseDto | null;
  isPending: boolean;
  onConfirm: () => void;
}

export function StaffStatusDialog({
  open,
  onOpenChange,
  staff,
  isPending,
  onConfirm,
}: StaffStatusDialogProps) {
  if (!staff) return null;

  const isDeactivating = staff.status === Status.ACTIVE;
  const fullName = `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.email;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold text-slate-900">
            {isDeactivating ? 'Deactivate Account' : 'Reactivate Account'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-500 font-medium leading-relaxed">
            {isDeactivating
              ? `You are about to deactivate ${fullName}'s account. They will immediately lose access to the system and cannot log in.`
              : `You are about to reactivate ${fullName}'s account. They will regain full system access based on their assigned role.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-3">
          <AlertDialogCancel
            disabled={isPending}
            className="rounded-xl font-bold border-slate-200 hover:bg-slate-50"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className={`rounded-xl font-bold px-6 ${
              isDeactivating
                ? 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/10'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/10'
            }`}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeactivating ? 'Deactivate Account' : 'Reactivate Account'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
