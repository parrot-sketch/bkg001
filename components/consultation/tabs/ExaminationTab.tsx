'use client';

/**
 * Examination Tab
 * 
 * Physical examination findings.
 * Structured for aesthetic surgery: body areas, measurements, findings.
 */

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ExaminationTabProps {
  initialValue?: string;
  onChange: (value: string) => void;
  isReadOnly?: boolean;
}

export function ExaminationTab({
  initialValue = '',
  onChange,
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
        <Textarea
          id="examination"
          placeholder="Examination findings, measurements, body areas examined..."
          value={examination}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isReadOnly}
          rows={16}
          className="font-mono text-sm resize-none"
        />
      </div>
    </div>
  );
}
