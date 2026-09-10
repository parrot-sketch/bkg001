'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import {
  groupMissingChecklistItems,
  type MissingChecklistItem,
} from '@/domain/clinical-forms/NursePreopWardChecklist';

export function MissingItemsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: string[];
  /** Prefer structured items when available — enables section jump. */
  detailedItems?: MissingChecklistItem[];
  onJumpToSection?: (sectionKey: string) => void;
}) {
  const { open, onOpenChange, items, detailedItems, onJumpToSection } = props;

  const grouped =
    detailedItems && detailedItems.length > 0
      ? groupMissingChecklistItems(detailedItems)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            Cannot finalize yet
          </DialogTitle>
          <DialogDescription>
            Complete the required items below, then try Finalize again. Unsaved edits are
            saved automatically before finalizing.
          </DialogDescription>
        </DialogHeader>

        {grouped ? (
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.sectionKey} className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-slate-900">{group.sectionTitle}</p>
                  {onJumpToSection && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
                      onClick={() => {
                        onOpenChange(false);
                        onJumpToSection(group.sectionKey);
                      }}
                    >
                      Go to section
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  )}
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  {group.items.map((item, i) => (
                    <li key={`${item.label}-${i}`} className="text-sm text-slate-800">
                      <span className="font-medium">{item.fieldLabel}</span>
                      <span className="text-slate-600"> — {item.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul className="list-disc pl-6 space-y-1">
            {items.map((item, i) => (
              <li key={`${item}-${i}`} className="text-sm">
                {item}
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close &amp; fix
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
