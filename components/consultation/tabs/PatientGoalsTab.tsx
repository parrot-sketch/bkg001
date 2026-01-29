'use client';

/**
 * Chief Complaint Tab
 * 
 * Capture patient's primary concern and presenting complaint.
 * Critical for aesthetic surgery: understanding patient expectations and goals.
 */

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
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
  onSave,
  isSaving = false,
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
    <div className="space-y-4">
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

      {/* Save Button */}
      {!isReadOnly && onSave && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving || !goals.trim()}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Chief Complaint'}
          </Button>
        </div>
      )}
    </div>
  );
}
