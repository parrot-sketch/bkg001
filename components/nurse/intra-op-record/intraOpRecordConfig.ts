/**
 * Intra-Op Record Configuration
 *
 * Section icon mapping, props interface, section renderers, and utilities.
 * Extracted from page.tsx to keep the page shell thin.
 */

import type React from 'react';
import {
    LogIn, ShieldCheck, Clock, Users, Stethoscope, UserCheck,
    Droplets, Sparkles, Zap, Activity, ListCheck, Bandage,
    Droplet, Table,
} from 'lucide-react';
import type { NurseIntraOpRecordDraft } from '@/domain/clinical-forms/NurseIntraOpRecord';

import { PatientSection } from '@/components/nurse/intra-op-record/sections/PatientSection';
import { EntrySection } from '@/components/nurse/intra-op-record/sections/EntrySection';
import { SafetySection } from '@/components/nurse/intra-op-record/sections/SafetySection';
import { TimingsSection } from '@/components/nurse/intra-op-record/sections/TimingsSection';
import { StaffingSection } from '@/components/nurse/intra-op-record/sections/StaffingSection';
import { DiagnosesSection } from '@/components/nurse/intra-op-record/sections/DiagnosesSection';
import { PositioningSection } from '@/components/nurse/intra-op-record/sections/PositioningSection';
import { CatheterSection } from '@/components/nurse/intra-op-record/sections/CatheterSection';
import { SkinPrepSection } from '@/components/nurse/intra-op-record/sections/SkinPrepSection';
import { EquipmentSection } from '@/components/nurse/intra-op-record/sections/EquipmentSection';
import { SurgicalDetailsSection } from '@/components/nurse/intra-op-record/sections/SurgicalDetailsSection';
import { CountsSection } from '@/components/nurse/intra-op-record/sections/CountsSection';
import { ClosureAndFinalSection } from '@/components/nurse/intra-op-record/sections/ClosureSection';
import { FluidsSection } from '@/components/nurse/intra-op-record/sections/FluidsSection';
import { DynamicTableSection } from '@/components/nurse/intra-op-record/sections/DynamicTablesSection';
import { ItemsToReturnSection } from '@/components/nurse/intra-op-record/sections/ItemsToReturnSection';
import { BillingSection } from '@/components/nurse/intra-op-record/sections/BillingSection';

// ─── Types ────────────────────────────────────────────────────

export interface SectionProps {
    data: NurseIntraOpRecordDraft;
    onChange: (data: NurseIntraOpRecordDraft) => void;
    disabled: boolean;
    suggestedStaffing?: Record<string, string>;
    caseId?: string;
    patient?: { first_name: string; last_name: string; file_number: string; date_of_birth?: string | null; gender?: string | null };
    formResponseId?: string;
    surgeonName?: string | null;
}

// ─── Icon Map ─────────────────────────────────────────────────

export const SECTION_ICONS: Record<string, React.ElementType> = {
    entry: LogIn,
    safety: ShieldCheck,
    timings: Clock,
    staffing: Users,
    diagnoses: Stethoscope,
    positioning: UserCheck,
    catheter: Droplets,
    skinPrep: Sparkles,
    equipment: Zap,
    surgicalDetails: Activity,
    counts: ListCheck,
    closure: Bandage,
    fluids: Droplet,
    tables: Table,
};

// ─── Section Renderers ────────────────────────────────────────

export const SECTION_RENDERERS: Record<string, React.FC<SectionProps & { caseId?: string }>> = {
    patient: PatientSection,
    entry: EntrySection,
    safety: SafetySection,
    timings: TimingsSection,
    staffing: StaffingSection,
    diagnoses: DiagnosesSection,
    positioning: PositioningSection,
    catheter: CatheterSection,
    skinPrep: SkinPrepSection,
    equipment: EquipmentSection,
    surgicalDetails: SurgicalDetailsSection,
    counts: CountsSection,
    closure: ClosureAndFinalSection,
    fluids: FluidsSection,
    tables: DynamicTableSection,
    itemsToReturn: ItemsToReturnSection,
    billing: BillingSection,
};

// ─── Utilities ────────────────────────────────────────────────

export function formatDoctorName(name: string | null | undefined): string {
    if (!name) return '';
    return name.match(/^(Dr\.?|Dr\s)/i) ? name : `Dr. ${name}`;
}
