'use server';

import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { revalidateDoctorDashboard } from '@/actions/doctor/get-dashboard-data';
import type { Prisma } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const VALID_TEAM_ROLES = [
  'PRIMARY_SURGEON',
  'CO_SURGEON',
  'ANAESTHESIOLOGIST',
  'SCRUB_NURSE',
  'CIRCULATING_NURSE',
  'THEATER_TECH',
  'OBSERVER',
] as const;

type SurgicalTeamRole = (typeof VALID_TEAM_ROLES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Resolve session → doctor record + verify role */
async function requireDoctor() {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' as const, doctor: null };

  if (user.role !== 'DOCTOR' && user.role !== 'ADMIN') {
    return { error: 'Forbidden' as const, doctor: null };
  }

  const doctor = await db.doctor.findUnique({ where: { user_id: user.userId } });
  if (!doctor) return { error: 'Doctor profile not found' as const, doctor: null };

  return { error: null, doctor };
}

/** Verify the actor owns the case (primary surgeon) */
async function verifyCaseOwner(caseId: string, doctorId: string) {
  const sc = await db.surgicalCase.findUnique({
    where: { id: caseId },
    select: { id: true, primary_surgeon_id: true, status: true, patient_id: true },
  });
  if (!sc) return { error: 'Case not found', sc: null };
  if (sc.primary_surgeon_id !== doctorId) return { error: 'You are not the primary surgeon on this case', sc: null };
  return { error: null, sc };
}

// ─────────────────────────────────────────────────────────────────────────────
// READ: getSurgicalPlanPageData
// ─────────────────────────────────────────────────────────────────────────────

export async function getSurgicalPlanPageData(caseId: string) {
  const { error, doctor } = await requireDoctor();
  if (error || !doctor) return { success: false, msg: error ?? 'Unauthorized' };

  const sc = await db.surgicalCase.findUnique({
    where: { id: caseId },
    include: {
      patient: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          file_number: true,
          date_of_birth: true,
          gender: true,
          allergies: true,
        },
      },
      primary_surgeon: { select: { id: true, name: true } },
      case_plan: true,
      team_members: {
        orderBy: { assigned_at: 'asc' },
        include: {
          assigned_by_doctor: { select: { id: true, name: true } },
        },
      },
      theater_booking: {
        include: { theater: { select: { name: true } } },
      },
      billing_estimate: {
        include: { line_items: { orderBy: { created_at: 'asc' } } },
      },
      consultation: true,
    },
  });

  if (!sc) return { success: false, msg: 'Case not found' };

  // Confirm actor is primary surgeon OR admin
  const { error: ownerError } = await verifyCaseOwner(caseId, doctor.id);
  if (ownerError && doctor.id !== sc.primary_surgeon_id) {
    // Still allow read if they're an admin
    const user = await getCurrentUser();
    if (user?.role !== 'ADMIN') return { success: false, msg: ownerError };
  }

  return { success: true, data: sc };
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATE: saveProcedureDetails
// ─────────────────────────────────────────────────────────────────────────────

export interface SaveProcedureDetailsInput {
  procedureName?: string;
  diagnosis?: string;
  side?: string;
  procedurePlan?: string;
  riskFactors?: string;
  preOpNotes?: string;
  implantsDetails?: string;
  equipmentNotes?: string;
  patientPositioning?: string;
  postOpInstructions?: string;
  surgeonNarrative?: string;
  anesthesiaPlan?: string;
  specialInstructions?: string;
  estimatedDurationMinutes?: number | null;
  readinessStatus?: string;
}

export async function saveProcedureDetails(caseId: string, input: SaveProcedureDetailsInput) {
  try {
    const { error, doctor } = await requireDoctor();
    if (error || !doctor) return { success: false, msg: error ?? 'Unauthorized' };

    const { error: ownerErr } = await verifyCaseOwner(caseId, doctor.id);
    if (ownerErr) return { success: false, msg: ownerErr };

    // Update top-level case fields
    const caseUpdates: Prisma.SurgicalCaseUpdateInput = {};
    if (input.procedureName !== undefined) caseUpdates.procedure_name = input.procedureName;
    if (input.diagnosis !== undefined) caseUpdates.diagnosis = input.diagnosis;
    if (input.side !== undefined) caseUpdates.side = input.side;

    if (Object.keys(caseUpdates).length > 0) {
      await db.surgicalCase.update({ where: { id: caseId }, data: caseUpdates });
    }

    // Upsert CasePlan
    const sc = await db.surgicalCase.findUnique({ where: { id: caseId }, select: { case_plan: true, consultation: { select: { appointment_id: true } }, patient_id: true } });
    const casePlanData: Record<string, unknown> = {};
    if (input.procedurePlan !== undefined) casePlanData.procedure_plan = input.procedurePlan;
    if (input.riskFactors !== undefined) casePlanData.risk_factors = input.riskFactors;
    if (input.preOpNotes !== undefined) casePlanData.pre_op_notes = input.preOpNotes;
    if (input.implantsDetails !== undefined) casePlanData.implant_details = input.implantsDetails;
    if (input.equipmentNotes !== undefined) casePlanData.equipment_notes = input.equipmentNotes;
    if (input.patientPositioning !== undefined) casePlanData.patient_positioning = input.patientPositioning;
    if (input.postOpInstructions !== undefined) casePlanData.post_op_instructions = input.postOpInstructions;
    if (input.surgeonNarrative !== undefined) casePlanData.surgeon_narrative = input.surgeonNarrative;
    if (input.anesthesiaPlan !== undefined) casePlanData.planned_anesthesia = input.anesthesiaPlan;
    if (input.specialInstructions !== undefined) casePlanData.special_instructions = input.specialInstructions;
    if (input.estimatedDurationMinutes !== undefined) casePlanData.estimated_duration_minutes = input.estimatedDurationMinutes;
    if (input.readinessStatus !== undefined) casePlanData.readiness_status = input.readinessStatus;

    if (Object.keys(casePlanData).length > 0) {
      await db.casePlan.upsert({
        where: { surgical_case_id: caseId },
        update: casePlanData,
        create: {
          ...casePlanData,
          surgical_case_id: caseId,
          // These fallbacks are for legacy cases where CasePlan wasn't auto-created
          appointment_id: sc?.consultation?.appointment_id ?? 0, 
          patient_id: sc?.patient_id ?? '',
          doctor_id: doctor.id,
        } as any,
      });
    }

    revalidatePath(`/doctor/surgical-cases/${caseId}/plan`);
    return { success: true, msg: 'Plan saved' };
  } catch (err) {
    console.error('[saveProcedureDetails]', err);
    return { success: false, msg: 'Failed to save procedure details' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATE: assignTeamMember
// ─────────────────────────────────────────────────────────────────────────────

export interface AssignTeamMemberInput {
  role: SurgicalTeamRole;
  // System user
  userId?: string;
  // External professional
  isExternal?: boolean;
  externalName?: string;
  externalCredentials?: string;
}

export async function assignTeamMember(caseId: string, input: AssignTeamMemberInput) {
  try {
    const { error, doctor } = await requireDoctor();
    if (error || !doctor) return { success: false, msg: error ?? 'Unauthorized' };

    const { error: ownerErr } = await verifyCaseOwner(caseId, doctor.id);
    if (ownerErr) return { success: false, msg: ownerErr };

    if (!VALID_TEAM_ROLES.includes(input.role)) {
      return { success: false, msg: `Invalid role: ${input.role}` };
    }

    if (input.isExternal && !input.externalName?.trim()) {
      return { success: false, msg: 'External member name is required' };
    }

    if (!input.isExternal && !input.userId) {
      return { success: false, msg: 'User ID is required for system users' };
    }

    // Resolve display name for system user
    let name = input.externalName ?? '';
    if (!input.isExternal && input.userId) {
      const linked = await db.doctor.findFirst({ where: { user_id: input.userId }, select: { name: true } })
        ?? await db.user.findUnique({ where: { id: input.userId }, select: { first_name: true, last_name: true } });
      if (!linked) return { success: false, msg: 'User not found' };
      name = 'name' in linked ? linked.name : `${linked.first_name} ${linked.last_name}`;
    }

    // Upsert: one member per role per case
    const existing = await db.surgicalCaseTeamMember.findFirst({
      where: { surgical_case_id: caseId, role: input.role },
    });

    const memberData = {
      surgical_case_id: caseId,
      role: input.role,
      name,
      user_id: input.isExternal ? null : (input.userId ?? null),
      is_external: input.isExternal ?? false,
      external_name: input.isExternal ? (input.externalName ?? null) : null,
      external_credentials: input.isExternal ? (input.externalCredentials ?? null) : null,
      assigned_by_doctor_id: doctor.id,
      assigned_at: new Date(),
    };

    if (existing) {
      await db.surgicalCaseTeamMember.update({ where: { id: existing.id }, data: memberData });
    } else {
      await db.surgicalCaseTeamMember.create({ data: memberData });
    }

    // Sync calendar event for the assigned user (if system doctor)
    if (!input.isExternal && input.userId) {
      await _syncCalendarEvent(caseId, input.userId, input.role);
    }

    revalidatePath(`/doctor/surgical-cases/${caseId}/plan`);
    return { success: true, msg: 'Team member assigned' };
  } catch (err) {
    console.error('[assignTeamMember]', err);
    return { success: false, msg: 'Failed to assign team member' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATE: removeTeamMember
// ─────────────────────────────────────────────────────────────────────────────

export async function removeTeamMember(caseId: string, teamMemberId: string) {
  try {
    const { error, doctor } = await requireDoctor();
    if (error || !doctor) return { success: false, msg: error ?? 'Unauthorized' };

    const { error: ownerErr } = await verifyCaseOwner(caseId, doctor.id);
    if (ownerErr) return { success: false, msg: ownerErr };

    const member = await db.surgicalCaseTeamMember.findFirst({
      where: { id: teamMemberId, surgical_case_id: caseId },
    });
    if (!member) return { success: false, msg: 'Team member not found' };

    await db.surgicalCaseTeamMember.delete({ where: { id: teamMemberId } });

    // Cancel calendar event if system user
    if (member.user_id) {
      await _cancelCalendarEvent(caseId, member.user_id);
    }

    revalidatePath(`/doctor/surgical-cases/${caseId}/plan`);
    return { success: true, msg: 'Team member removed' };
  } catch (err) {
    console.error('[removeTeamMember]', err);
    return { success: false, msg: 'Failed to remove team member' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATE: saveBillingEstimate
// ─────────────────────────────────────────────────────────────────────────────

export interface SaveBillingEstimateInput {
  surgeonFee: number;
  anaesthesiologistFee: number;
  theatreFee: number;
}

export async function saveBillingEstimate(caseId: string, input: SaveBillingEstimateInput) {
  try {
    const { error, doctor } = await requireDoctor();
    if (error || !doctor) return { success: false, msg: error ?? 'Unauthorized' };

    const { error: ownerErr } = await verifyCaseOwner(caseId, doctor.id);
    if (ownerErr) return { success: false, msg: ownerErr };

    const subtotal = (input.surgeonFee ?? 0) + (input.anaesthesiologistFee ?? 0) + (input.theatreFee ?? 0);

    const existing = await db.surgicalBillingEstimate.findUnique({ where: { surgical_case_id: caseId } });

    if (existing) {
      await db.surgicalBillingEstimate.update({
        where: { surgical_case_id: caseId },
        data: {
          surgeon_fee: input.surgeonFee,
          anaesthesiologist_fee: input.anaesthesiologistFee,
          theatre_fee: input.theatreFee,
          subtotal,
        },
      });
    } else {
      await db.surgicalBillingEstimate.create({
        data: {
          surgical_case_id: caseId,
          surgeon_fee: input.surgeonFee,
          anaesthesiologist_fee: input.anaesthesiologistFee,
          theatre_fee: input.theatreFee,
          subtotal,
          created_by_doctor_id: doctor.id,
        },
      });
    }

    revalidatePath(`/doctor/surgical-cases/${caseId}/plan`);
    return { success: true, msg: 'Billing estimate saved' };
  } catch (err) {
    console.error('[saveBillingEstimate]', err);
    return { success: false, msg: 'Failed to save billing estimate' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATE: completeSurgicalPlan
// ─────────────────────────────────────────────────────────────────────────────

export async function completeSurgicalPlan(caseId: string) {
  try {
    const { error, doctor } = await requireDoctor();
    if (error || !doctor) return { success: false, msg: error ?? 'Unauthorized' };

    const { error: ownerErr, sc } = await verifyCaseOwner(caseId, doctor.id);
    if (ownerErr || !sc) return { success: false, msg: ownerErr ?? 'Case not found' };

    if (!['DRAFT', 'PLANNING'].includes(sc.status)) {
      return { success: false, msg: `Case cannot be completed from status: ${sc.status}` };
    }

    // Validate CasePlan exists
    const casePlan = await db.casePlan.findUnique({ where: { surgical_case_id: caseId } });
    if (!casePlan) return { success: false, msg: 'Case plan must be created before completing' };
    if (!casePlan.procedure_plan?.trim()) return { success: false, msg: 'Procedure plan is required' };

    await db.surgicalCase.update({
      where: { id: caseId },
      data: { status: 'READY_FOR_SCHEDULING' },
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // NOTIFICATIONS & AUDIT
    // ─────────────────────────────────────────────────────────────────────────────
    
    // 1. Audit log
    await db.auditLog.create({
      data: {
        user_id: doctor.user_id,
        record_id: caseId,
        action: 'UPDATE',
        model: 'SurgicalCase',
        details: `Case marked READY_FOR_SCHEDULING. (via completeSurgicalPlan)`,
      },
    });

    // 2. Notify Theater Tech
    try {
      const theaterTechUsers = await db.user.findMany({
        where: { role: 'THEATER_TECHNICIAN' },
        select: { id: true },
      });

      const patient = await db.patient.findUnique({
        where: { id: sc.patient_id },
        select: { first_name: true, last_name: true },
      });

      for (const tech of theaterTechUsers) {
        await db.notification.create({
          data: {
            user_id: tech.id,
            type: 'IN_APP',
            status: 'PENDING',
            subject: 'New Case Ready for Theater Prep',
            message: `Dr. ${doctor.name} has completed the surgical plan for ${patient?.first_name} ${patient?.last_name}. Please add team members and planned items.`,
            metadata: JSON.stringify({
              event: 'THEATER_PREP_REQUIRED',
              surgicalCaseId: caseId,
              navigateTo: '/theater-tech/dashboard',
            }),
          },
        });
      }

      // 3. Notify Admin
      const adminUsers = await db.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      for (const admin of adminUsers) {
        await db.notification.create({
          data: {
            user_id: admin.id,
            type: 'IN_APP',
            status: 'PENDING',
            subject: 'Surgical Case Ready for Scheduling',
            message: `Dr. ${doctor.name} completed the plan for ${patient?.first_name} ${patient?.last_name}. Case is awaiting theater prep and scheduling.`,
            metadata: JSON.stringify({
              event: 'CASE_READY_FOR_SCHEDULING',
              surgicalCaseId: caseId,
              navigateTo: '/admin/surgical-cases',
            }),
          },
        });
      }
    } catch (notifError) {
      console.error('[completeSurgicalPlan] Failed to send notifications:', notifError);
    }

    // Update calendar events to CONFIRMED where start_time known, else leave as TENTATIVE
    await db.calendarEvent.updateMany({
      where: { surgical_case_id: caseId, status: 'TENTATIVE' },
      data: { status: 'TENTATIVE' }, // stays tentative until theater booking confirmed
    });

    revalidatePath(`/doctor/surgical-cases/${caseId}/plan`);
    await revalidateDoctorDashboard(doctor.id);
    return { success: true, msg: 'Plan submitted for scheduling', status: 'READY_FOR_SCHEDULING' };
  } catch (err) {
    console.error('[completeSurgicalPlan]', err);
    return { success: false, msg: 'Failed to complete surgical plan' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL: Calendar sync helpers
// ─────────────────────────────────────────────────────────────────────────────

async function _syncCalendarEvent(caseId: string, assignedUserId: string, role: string) {
  try {
    // Resolve doctor record from user_id
    const doctor = await db.doctor.findFirst({ where: { user_id: assignedUserId }, select: { id: true } });
    if (!doctor) return; // Not a doctor — skip (nurse, tech, etc.)

    const sc = await db.surgicalCase.findUnique({
      where: { id: caseId },
      select: {
        procedure_name: true,
        patient: { select: { first_name: true, last_name: true, file_number: true } },
        theater_booking: { select: { start_time: true, end_time: true, theater: { select: { name: true } } } },
      },
    });
    if (!sc) return;

    const patientInitials = sc.patient
      ? `${sc.patient.first_name[0]}${sc.patient.last_name[0]}`.toUpperCase()
      : 'PT';
    const title = `[${role.replace(/_/g, ' ')}] ${sc.procedure_name ?? 'Surgery'} — ${patientInitials}`;

    await db.calendarEvent.upsert({
      where: { doctor_id_surgical_case_id: { doctor_id: doctor.id, surgical_case_id: caseId } },
      create: {
        doctor_id: doctor.id,
        surgical_case_id: caseId,
        type: 'SURGICAL_CASE',
        team_member_role: role,
        title,
        start_time: sc.theater_booking?.start_time ?? null,
        end_time: sc.theater_booking?.end_time ?? null,
        location: sc.theater_booking?.theater?.name ?? null,
        status: sc.theater_booking ? 'CONFIRMED' : 'TENTATIVE',
      },
      update: {
        team_member_role: role,
        title,
        start_time: sc.theater_booking?.start_time ?? null,
        end_time: sc.theater_booking?.end_time ?? null,
        location: sc.theater_booking?.theater?.name ?? null,
        status: sc.theater_booking ? 'CONFIRMED' : 'TENTATIVE',
      },
    });
  } catch (err) {
    console.error('[_syncCalendarEvent]', err);
  }
}

async function _cancelCalendarEvent(caseId: string, removedUserId: string) {
  try {
    const doctor = await db.doctor.findFirst({ where: { user_id: removedUserId }, select: { id: true } });
    if (!doctor) return;

    await db.calendarEvent.updateMany({
      where: { doctor_id: doctor.id, surgical_case_id: caseId },
      data: { status: 'CANCELLED' },
    });
  } catch (err) {
    console.error('[_cancelCalendarEvent]', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED: Public calendar sync (called externally when booking is confirmed)
// ─────────────────────────────────────────────────────────────────────────────

export async function syncSurgicalCaseCalendarEvents(caseId: string) {
  try {
    const members = await db.surgicalCaseTeamMember.findMany({
      where: { surgical_case_id: caseId, is_external: false },
      select: { user_id: true, role: true },
    });

    await Promise.all(
      members
        .filter((m) => m.user_id !== null)
        .map((m) => _syncCalendarEvent(caseId, m.user_id!, m.role))
    );

    return { success: true };
  } catch (err) {
    console.error('[syncSurgicalCaseCalendarEvents]', err);
    return { success: false };
  }
}
