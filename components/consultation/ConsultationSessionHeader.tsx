'use client';

/**
 * Consultation Session Header
 * 
 * Clinical workstation header showing:
 * - Patient name
 * - Consultation timer
 * - Auto-save indicator
 * - Quick actions
 * 
 * Designed for surgeon efficiency - minimal clutter, maximum information density.
 */

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Clock, Save, Camera, History, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConsultationState } from '@/domain/enums/ConsultationState';
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import { Role } from '@/domain/enums/Role';

interface ConsultationSessionHeaderProps {
  patientName: string;
  consultation: ConsultationResponseDto | null;
  userRole?: Role;
  onSaveDraft: () => void;
  onUploadPhoto: () => void;
  onViewHistory: () => void;
  onComplete: () => void;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isSaving?: boolean;
}

export function ConsultationSessionHeader({
  patientName,
  consultation,
  userRole,
  onSaveDraft,
  onUploadPhoto,
  onViewHistory,
  onComplete,
  autoSaveStatus,
  isSaving = false,
}: ConsultationSessionHeaderProps) {
  const isActive = consultation?.state === ConsultationState.IN_PROGRESS;
  const isCompleted = consultation?.state === ConsultationState.COMPLETED;
  const startedAt = consultation?.startedAt;

  // Role-aware: Only doctors can complete consultations
  const canCompleteConsultation = userRole === Role.DOCTOR;

  // Real-time timer update
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!startedAt) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [startedAt]);

  // Calculate elapsed time
  const elapsedTime = startedAt
    ? formatDistanceToNow(new Date(startedAt), { addSuffix: false })
    : null;

  return (
    <div className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 sticky top-0 z-10">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: Patient Name & Timer */}
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{patientName}</h1>
            {startedAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Started {elapsedTime} ago</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Auto-save Indicator */}
        <div className="flex items-center gap-2">
          {isActive && (
            <AutoSaveIndicator status={autoSaveStatus} isSaving={isSaving} />
          )}
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2">
          {isActive && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveDraft}
                disabled={isSaving}
                className="h-8"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onUploadPhoto}
                className="h-8"
              >
                <Camera className="h-3.5 w-3.5 mr-1.5" />
                Photo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onViewHistory}
                className="h-8"
              >
                <History className="h-3.5 w-3.5 mr-1.5" />
                History
              </Button>
            </>
          )}
          {isActive && canCompleteConsultation && (
            <Button
              onClick={onComplete}
              size="sm"
              className="h-8 bg-primary text-primary-foreground"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Complete Consultation
            </Button>
          )}
          {isCompleted && (
            <div className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Consultation Completed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Auto-save Indicator
 * Subtle but reassuring - shows save status without being intrusive
 */
function AutoSaveIndicator({
  status,
  isSaving,
}: {
  status: 'idle' | 'saving' | 'saved' | 'error';
  isSaving: boolean;
}) {
  if (status === 'saving' || isSaving) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span>Saving...</span>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
        <span>Saved</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive">
        <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
        <span>Save failed</span>
      </div>
    );
  }

  return null;
}
