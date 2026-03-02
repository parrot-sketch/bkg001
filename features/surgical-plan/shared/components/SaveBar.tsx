/**
 * Save Bar Component
 * 
 * Reusable save button bar for surgical plan tabs.
 */

import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';

interface SaveBarProps {
  onSave: () => void | Promise<void>;
  saving?: boolean;
  disabled?: boolean;
  label?: string;
}

export function SaveBar({
  onSave,
  saving = false,
  disabled = false,
  label = 'Save',
}: SaveBarProps) {
  return (
    <div className="flex justify-end pt-4 border-t">
      <Button
        onClick={onSave}
        disabled={saving || disabled}
        className="min-w-[160px] gap-2"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {label}
      </Button>
    </div>
  );
}
