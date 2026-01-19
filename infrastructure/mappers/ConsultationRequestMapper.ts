/**
 * Mapper: ConsultationRequestMapper
 * 
 * Maps consultation request workflow fields between Prisma and application layer.
 * This handles the consultation_request_status, reviewed_by, reviewed_at, and review_notes fields
 * that are part of the consultation workflow but not part of the core Appointment entity.
 * 
 * These fields are stored in the Appointment table but managed separately from
 * the core appointment domain entity to keep the domain clean.
 */

import { ConsultationRequestStatus } from '../../domain/enums/ConsultationRequestStatus';
import { Prisma } from '@prisma/client';

export interface ConsultationRequestFields {
  consultationRequestStatus?: ConsultationRequestStatus | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  reviewNotes?: string | null;
}

/**
 * Extract consultation request fields from Prisma Appointment model
 */
export function extractConsultationRequestFields(prismaAppointment: {
  consultation_request_status?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: Date | null;
  review_notes?: string | null;
}): ConsultationRequestFields {
  return {
    consultationRequestStatus: prismaAppointment.consultation_request_status
      ? (prismaAppointment.consultation_request_status as ConsultationRequestStatus)
      : null,
    reviewedBy: prismaAppointment.reviewed_by ?? null,
    reviewedAt: prismaAppointment.reviewed_at ?? null,
    reviewNotes: prismaAppointment.review_notes ?? null,
  };
}

/**
 * Convert consultation request fields to Prisma AppointmentUpdateInput
 */
export function toPrismaConsultationRequestFields(
  fields: ConsultationRequestFields
): Prisma.AppointmentUpdateInput {
  const updateInput: Prisma.AppointmentUpdateInput = {};

  if (fields.consultationRequestStatus !== undefined) {
    updateInput.consultation_request_status = fields.consultationRequestStatus ?? null;
  }
  if (fields.reviewedBy !== undefined) {
    updateInput.reviewed_by = fields.reviewedBy ?? null;
  }
  if (fields.reviewedAt !== undefined) {
    updateInput.reviewed_at = fields.reviewedAt ?? null;
  }
  if (fields.reviewNotes !== undefined) {
    updateInput.review_notes = fields.reviewNotes ?? null;
  }

  return updateInput;
}

/**
 * Convert consultation request fields to Prisma AppointmentCreateInput
 */
export function toPrismaCreateConsultationRequestFields(
  fields: ConsultationRequestFields
): Partial<Prisma.AppointmentCreateInput> {
  const createInput: Partial<Prisma.AppointmentCreateInput> = {};

  if (fields.consultationRequestStatus !== undefined) {
    createInput.consultation_request_status = fields.consultationRequestStatus ?? null;
  }
  if (fields.reviewedBy !== undefined) {
    createInput.reviewed_by = fields.reviewedBy ?? null;
  }
  if (fields.reviewedAt !== undefined) {
    createInput.reviewed_at = fields.reviewedAt ?? null;
  }
  if (fields.reviewNotes !== undefined) {
    createInput.review_notes = fields.reviewNotes ?? null;
  }

  return createInput;
}