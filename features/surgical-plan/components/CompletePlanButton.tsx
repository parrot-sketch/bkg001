'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { completeSurgicalPlan } from '@/actions/doctor/surgical-plan';
import { useState } from 'react';

interface CompletePlanButtonProps {
  caseId: string;
  disabled?: boolean;
  missingItems?: Array<{ key: string; label: string; done: boolean; required: boolean }>;
}

export function CompletePlanButton({
  caseId,
  disabled = false,
  missingItems = [],
}: CompletePlanButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showMissingModal, setShowMissingModal] = useState(false);

  const requiredIncomplete = missingItems.filter((i) => i.required && !i.done);

  const handleComplete = () => {
    if (requiredIncomplete.length > 0) {
      setShowMissingModal(true);
      return;
    }

    startTransition(async () => {
      const result = await completeSurgicalPlan(caseId);
      if (result.success) {
        toast.success('Plan submitted for scheduling');
        router.push('/doctor/surgical-cases');
      } else {
        toast.error(result.msg);
      }
    });
  };

  return (
    <>
      <Button
        onClick={handleComplete}
        disabled={isPending || disabled}
        className="bg-stone-900 hover:bg-black text-white"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        )}
        Complete Plan
      </Button>

      <Dialog open={showMissingModal} onOpenChange={setShowMissingModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-stone-900">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Incomplete Plan
            </DialogTitle>
            <DialogDescription>
              Complete these required items before sending to theater scheduling.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <ul className="space-y-2.5">
              {missingItems
                .filter((item) => item.required)
                .map((item, index) => (
                  <li key={item.key || `item-${index}`} className="flex items-start gap-2.5 text-sm">
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-stone-300 shrink-0 mt-0.5" />
                    )}
                    <span className={item.done ? 'text-stone-400 line-through' : 'text-stone-700'}>
                      {item.label}
                    </span>
                  </li>
                ))}
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMissingModal(false)}>
              Continue Editing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
