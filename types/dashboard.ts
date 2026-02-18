/**
 * Type Definitions for Frontdesk Dashboard
 * 
 * Centralized type definitions for dashboard components and hooks
 */

import { LucideIcon } from 'lucide-react';

// ============================================================================
// Dashboard Stats Types
// ============================================================================

export interface DashboardStats {
    expectedPatients: number;
    checkedInPatients: number;
    pendingCheckIns: number;
    pendingIntakeCount: number;
}

// ============================================================================
// Quick Action Types
// ============================================================================

export type QuickActionColor = 'blue' | 'amber' | 'green' | 'cyan' | 'indigo';

export interface QuickActionCardProps {
    title: string;
    count?: number;
    icon: LucideIcon;
    color: QuickActionColor;
    href: string;
    description?: string;
    loading?: boolean;
    actionText?: string;
}

// ============================================================================
// Status Card Types
// ============================================================================

export interface StatusCardProps {
    label: string;
    value: number | string;
    icon: LucideIcon;
    color: QuickActionColor;
}

// ============================================================================
// Doctor Availability Types
// ============================================================================

export interface WorkingDay {
    day: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
}

export interface DoctorAvailability {
    doctorId: string;
    doctorName: string;
    specialization: string;
    profileImage?: string;
    workingDays: WorkingDay[];
}

export interface DoctorCardProps {
    doctor: DoctorAvailability;
    onBookAppointment?: (doctorId: string) => void;
}

// ============================================================================
// Appointment Types
// ============================================================================

export interface AppointmentRowProps {
    id: number;
    patientName: string;
    doctorName: string;
    time: string;
    type: string;
    status: string;
    onViewDetails?: (id: number) => void;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseDashboardDataReturn {
    stats: DashboardStats;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

export interface UseDoctorAvailabilityReturn {
    doctors: DoctorAvailability[];
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}
