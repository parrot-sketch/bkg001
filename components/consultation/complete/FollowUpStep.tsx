'use client';

import { FollowUpScheduler } from './FollowUpScheduler';

interface FollowUpStepProps {
  appointmentType?: string;
  onChange: (data: {
    followUpDate?: Date;
    followUpTime?: string;
    followUpType?: string;
  }) => void;
}

export function FollowUpStep({ appointmentType, onChange }: FollowUpStepProps) {
  return (
    <div className="space-y-4">
      <FollowUpScheduler
        appointmentType={appointmentType}
        onChange={onChange}
      />
    </div>
  );
}
