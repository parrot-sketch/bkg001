/**
 * Schedule Constants
 * 
 * Shared constants for schedule components.
 */

import { Stethoscope, Scissors, Briefcase } from 'lucide-react';
import { SlotType } from '@/domain/types/schedule';

export const BASE_DATE = new Date(2000, 0, 2);
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SLOT_TYPE_CONFIG: Record<SlotType, { color: string; icon: any; label: string }> = {
  CLINIC: { color: '#059669', icon: Stethoscope, label: 'Clinic' },
  SURGERY: { color: '#3b82f6', icon: Scissors, label: 'Surgery' },
  ADMIN: { color: '#6b7280', icon: Briefcase, label: 'Admin' },
};
