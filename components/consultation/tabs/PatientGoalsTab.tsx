'use client';

/**
 * Chief Complaint Tab
 * 
 * Capture patient's primary concern and presenting complaint.
 * Critical for aesthetic surgery: understanding patient expectations and goals.
 */

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface PatientGoalsTabProps {
  initialValue?: string;
  onChange: (value: string) => void;
  isReadOnly?: boolean;
}

export function PatientGoalsTab({
  initialValue = '',
  onChange,
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
        <Textarea
          id="chief-complaint"
          placeholder="Document the patient's primary concern, aesthetic goals, and expectations..."
          value={goals}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isReadOnly}
          rows={12}
          className="font-mono text-sm resize-none"
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
