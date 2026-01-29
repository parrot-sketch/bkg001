'use client';

/**
 * Examination Tab
 * 
 * Physical examination findings.
 * Structured for aesthetic surgery: body areas, measurements, findings.
 */

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';

interface ExaminationTabProps {
  initialValue?: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  isReadOnly?: boolean;
}

export function ExaminationTab({
  initialValue = '',
  onChange,
  onSave,
  isSaving = false,
  isReadOnly = false,
}: ExaminationTabProps) {
  const [examination, setExamination] = useState(initialValue);

  useEffect(() => {
    setExamination(initialValue);
  }, [initialValue]);

  const handleChange = (value: string) => {
    setExamination(value);
    onChange(value);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="examination" className="text-sm font-medium">
          Physical Examination
        </Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Document examination findings, measurements, and observations.
        </p>
        <RichTextEditor
          content={examination}
          onChange={handleChange}
          placeholder="Examination findings, measurements, body areas examined..."
          readOnly={isReadOnly}
          minHeight="500px"
        />
      </div>

      {/* Save Button */}
      {!isReadOnly && onSave && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving || !examination.trim()}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Examination'}
          </Button>
        </div>
      )}
    </div>
  );
}
