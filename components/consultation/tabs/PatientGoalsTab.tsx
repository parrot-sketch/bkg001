'use client';

/**
 * Chief Complaint Tab
 * 
 * Capture patient's primary concern and presenting complaint.
 * Critical for aesthetic surgery: understanding patient expectations and goals.
 * 
 * Note: Auto-saves via parent context - no per-tab save button needed.
 */

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';

interface PatientGoalsTabProps {
  initialValue?: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  isReadOnly?: boolean;
}

export function PatientGoalsTab({
  initialValue = '',
  onChange,
  // onSave and isSaving are passed for interface consistency but auto-save is handled by parent
  onSave: _onSave,
  isSaving: _isSaving,
  isReadOnly = false,
}: PatientGoalsTabProps) {
  const [goals, setGoals] = useState(initialValue);

  useEffect(() => {
    setGoals(initialValue);
  }, [initialValue]);

  const handleChange = (value: string) => {
    setGoals(value);
    onChange(value);
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <Label htmlFor="chief-complaint" className="text-sm font-semibold">
          Chief Complaint
        </Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          What brings the patient in today? Document the primary concern and aesthetic goals.
        </p>
        <RichTextEditor
          content={goals}
          onChange={handleChange}
          placeholder="Document the patient's primary concern, aesthetic goals, and expectations..."
          readOnly={isReadOnly}
          minHeight="400px"
        />
      </div>

      {/* Common Concerns Checklist (for quick selection) */}
      {!isReadOnly && (
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Common Concerns (click to add)
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                'Facial rejuvenation',
                'Body contouring',
                'Breast enhancement',
                'Rhinoplasty',
                'Skin tightening',
                'Scar revision',
              ].map((concern) => (
                <button
                  key={concern}
                  type="button"
                  onClick={() => {
                    const newGoals = goals
                      ? `${goals}\n• ${concern}`
                      : `• ${concern}`;
                    handleChange(newGoals);
                  }}
                  className="text-xs px-2 py-1 border rounded hover:bg-muted transition-colors"
                >
                  {concern}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
