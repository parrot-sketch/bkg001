'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function MissingItemsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: string[];
}) {
  const { open, onOpenChange, items } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-amber-600">Missing Required Items</DialogTitle>
          <DialogDescription>Please complete the following required items before finalizing:</DialogDescription>
        </DialogHeader>
        <ul className="list-disc pl-6 space-y-1">
          {items.map((item, i) => (
            <li key={`${item}-${i}`} className="text-sm">
              {item}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

