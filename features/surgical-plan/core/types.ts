/**
 * Core Types for Surgical Plan Feature
 *
 * Shared type definitions used across the surgical plan feature module.
 */

import type { CasePlanDetailDto } from '@/lib/api/case-plan';
import type { TimelineResultDto } from '@/application/dtos/TheaterTechDtos';
import { Role } from '@/domain/enums/Role';

/**
 * Surgical case plan page data
 */
export interface SurgicalCasePlanPageData {
  casePlan: CasePlanDetailDto;
  timeline: TimelineResultDto | null;
}

/**
 * View model for surgical case plan page
 */
export interface SurgicalCasePlanViewModel {
  caseId: string;
  patient: {
    id: string;
    fullName: string;
    fileNumber: string | null;
    gender: string | null;
    dateOfBirth: string | null;
    age: string | null;
    allergies: string | null;
  } | null;
  case: {
    id: string;
    status: string;
    urgency: string;
    procedureName: string | null;
    side: string | null;
    diagnosis: string | null;
    createdAt: string;
  };
  casePlan: {
    id: number;
    procedurePlan: string | null;
    riskFactors: string | null;
    preOpNotes: string | null;
    anesthesiaPlan: string | null;
    specialInstructions: string | null;
    estimatedDurationMinutes: number | null;
    readinessStatus: string;
    readyForSurgery: boolean;
    consentsCount: number;
    imagesCount: number;
    staffCount: number;
  } | null;
  primarySurgeon: {
    id: string;
    name: string;
  } | null;
  consultation: {
    id: number;
    appointmentId: number;
  } | null;
  theaterBooking: {
    id: string;
    startTime: string;
    endTime: string;
    status: string;
    theaterName: string | null;
  } | null;
  teamMembers: TeamMember[];
  billingEstimate: BillingEstimateViewModel | null;
  readinessChecklist: Array<{
    key: string;
    label: string;
    done: boolean;
  }>;
  timeline: TimelineResultDto | null;
}

export interface TeamMember {
  id: string;
  role: string;
  name: string;
  userId?: string;
  isExternal?: boolean;
  externalName?: string;
  externalCredentials?: string;
  assignedAt?: string;
}

export interface BillingEstimateViewModel {
  id: string;
  surgeonFee: number;
  anaesthesiologistFee: number;
  theatreFee: number;
  subtotal: number;
  status: string;
  lineItems: BillingLineItem[];
}

export interface BillingLineItem {
  id: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  addedByRole: string;
  notes: string | null;
}

/**
 * Tab definition metadata
 */
export interface TabDefinition {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<{ caseId: string; readOnly?: boolean }>;
  permissionCheck?: (role: Role) => boolean;
  badgeCount?: (data: SurgicalCasePlanViewModel) => number;
  order: number;
}

/**
 * Update clinical plan request
 */
export interface UpdateClinicalPlanRequest {
  procedureName?: string;
  procedurePlan?: string;
  riskFactors?: string;
  preOpNotes?: string;
  anesthesiaPlan?: string;
  specialInstructions?: string;
  estimatedDurationMinutes?: number | null;
  readinessStatus?: string;
}
