'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import {
  humanizeIntraOpMissingItems,
  NOR_FIELD_GROUPS,
} from '@/domain/clinical-forms/NurseIntraOpRecord';

export function IntraOpMissingItemsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: string[];
  onJumpToSection?: (sectionId: string) => void;
}) {
  const { open, onOpenChange, items, onJumpToSection } = props;
  const humanized = humanizeIntraOpMissingItems(items);

  const grouped = humanized.reduce<
    Array<{ sectionId: string; title: string; items: typeof humanized }>
  >((acc, item) => {
    const existing = acc.find((g) => g.sectionId === item.sectionId);
    if (existing) {
      existing.items.push(item);
      return acc;
    }
    const meta = NOR_FIELD_GROUPS.find((g) => g.id === item.sectionId);
    acc.push({
      sectionId: item.sectionId,
      title: meta?.title ?? 'Form',
      items: [item],
    });
    return acc;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            Cannot finalize yet
          </DialogTitle>
          <DialogDescription>
            Complete the required items below, then try Finalize again. Unsaved edits are saved
            automatically before finalizing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {grouped.map((group) => (
            <div
              key={group.sectionId}
              className="rounded-lg border border-amber-200 bg-amber-50/60 p-3"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-slate-900">{group.title}</p>
                {onJumpToSection && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
                    onClick={() => {
                      onOpenChange(false);
                      onJumpToSection(group.sectionId);
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
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close &amp; fix
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
