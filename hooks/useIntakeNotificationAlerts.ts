'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { NotificationResponseDto } from '@/lib/api/notifications';

export const PATIENT_INTAKE_SUBMITTED = 'PATIENT_INTAKE_SUBMITTED';

// Module-level so remounting the header (route changes) or rendering more than
// one bell never re-alerts for notifications that were already seen.
const seenIds = new Set<number>();
let initialised = false;

export function parseNotificationMetadata(metadata: unknown): Record<string, any> {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata as Record<string, any>;
  try {
    return JSON.parse(String(metadata));
  } catch {
    return {};
  }
}

function playChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [880, 1318.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.18;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.65);
    });
    setTimeout(() => ctx.close().catch(() => undefined), 1500);
  } catch {
    // Browsers may block audio until the user has interacted with the page.
  }
}

/**
 * Watches the notification list and, when a new patient-intake notification
 * arrives, plays a short chime and shows a toast whose single action opens the
 * patient's profile. Returns true while a fresh alert should keep the bell ringing.
 */
export function useIntakeNotificationAlerts(
  notifications: NotificationResponseDto[],
  loaded: boolean,
  onOpen: (notification: NotificationResponseDto) => void,
): boolean {
  const [ringing, setRinging] = useState(false);

  useEffect(() => {
    if (!loaded) return;

    if (!initialised) {
      notifications.forEach((n) => seenIds.add(n.id));
      initialised = true;
      return;
    }

    const fresh = notifications.filter(
      (n) =>
        !seenIds.has(n.id) &&
        n.status !== 'READ' &&
        parseNotificationMetadata(n.metadata).event === PATIENT_INTAKE_SUBMITTED,
    );
    notifications.forEach((n) => seenIds.add(n.id));
    if (fresh.length === 0) return;

    playChime();
    setRinging(true);
    const stop = setTimeout(() => setRinging(false), 4000);

    fresh.forEach((n) => {
      toast(n.subject || 'New patient registered', {
        id: `intake-notification-${n.id}`,
        description: n.message,
        duration: 20_000,
        action: { label: 'Open profile', onClick: () => onOpen(n) },
      });
    });

    return () => clearTimeout(stop);
  }, [notifications, loaded, onOpen]);

  return ringing;
}
