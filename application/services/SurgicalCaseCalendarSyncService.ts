import {
  CalendarEventStatus,
  CalendarEventType,
  InviteStatus,
  PrismaClient,
  TheaterBookingStatus,
} from '@prisma/client';

function parseSelectedSurgeonIds(raw: string | null | undefined, primarySurgeonId?: string | null): string[] {
  if (!raw) {
    return primarySurgeonId ? [primarySurgeonId] : [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === 'string');
    }
  } catch {
    // Fall through to primary surgeon fallback.
  }

  return primarySurgeonId ? [primarySurgeonId] : [];
}

function deriveCalendarStatus(input: {
  caseStatus: string;
  bookingStatus?: TheaterBookingStatus | null;
}): CalendarEventStatus {
  if (input.caseStatus === 'CANCELLED') {
    return CalendarEventStatus.CANCELLED;
  }

  if (input.caseStatus === 'COMPLETED') {
    return CalendarEventStatus.COMPLETED;
  }

  if (input.caseStatus === 'IN_THEATER') {
    return CalendarEventStatus.IN_PROGRESS;
  }

  if (input.bookingStatus === TheaterBookingStatus.CONFIRMED) {
    return CalendarEventStatus.CONFIRMED;
  }

  return CalendarEventStatus.TENTATIVE;
}

export async function syncDoctorCalendarEventsForSurgicalCase(
  prisma: PrismaClient,
  caseId: string,
): Promise<void> {
  const surgicalCase = await prisma.surgicalCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      status: true,
      procedure_name: true,
      procedure_date: true,
      total_theatre_minutes: true,
      surgeon_ids: true,
      primary_surgeon_id: true,
      patient: {
        select: {
          first_name: true,
          last_name: true,
          file_number: true,
        },
      },
      theater_booking: {
        select: {
          start_time: true,
          end_time: true,
          status: true,
          theater: {
            select: {
              name: true,
            },
          },
        },
      },
      staff_invites: {
        where: {
          status: InviteStatus.ACCEPTED,
        },
        select: {
          invited_user_id: true,
          invited_role: true,
        },
      },
    },
  });

  if (!surgicalCase) {
    return;
  }

  if (surgicalCase.status === 'CANCELLED') {
    await prisma.calendarEvent.updateMany({
      where: { surgical_case_id: caseId, status: { not: CalendarEventStatus.CANCELLED } },
      data: { status: CalendarEventStatus.CANCELLED },
    });
    return;
  }

  const selectedSurgeonIds = new Set(
    parseSelectedSurgeonIds(surgicalCase.surgeon_ids, surgicalCase.primary_surgeon_id),
  );

  const desiredParticipants = new Map<string, string>();

  if (surgicalCase.primary_surgeon_id) {
    desiredParticipants.set(surgicalCase.primary_surgeon_id, 'SURGEON');
    selectedSurgeonIds.add(surgicalCase.primary_surgeon_id);
  }

  const acceptedDoctorProfiles = surgicalCase.staff_invites.length
    ? await prisma.doctor.findMany({
        where: {
          user_id: { in: surgicalCase.staff_invites.map((invite) => invite.invited_user_id) },
        },
        select: {
          id: true,
          user_id: true,
        },
      })
    : [];

  const doctorIdByUserId = new Map(acceptedDoctorProfiles.map((doctor) => [doctor.user_id, doctor.id]));

  for (const invite of surgicalCase.staff_invites) {
    const doctorId = doctorIdByUserId.get(invite.invited_user_id);
    if (!doctorId || !selectedSurgeonIds.has(doctorId)) {
      continue;
    }

    if (!desiredParticipants.has(doctorId)) {
      desiredParticipants.set(doctorId, invite.invited_role);
    }
  }

  const existingEvents = await prisma.calendarEvent.findMany({
    where: { surgical_case_id: caseId },
    select: {
      id: true,
      doctor_id: true,
    },
  });

  const desiredDoctorIds = new Set(desiredParticipants.keys());
  const staleEventIds = existingEvents
    .filter((event) => !desiredDoctorIds.has(event.doctor_id))
    .map((event) => event.id);

  if (staleEventIds.length > 0) {
    await prisma.calendarEvent.updateMany({
      where: { id: { in: staleEventIds } },
      data: { status: CalendarEventStatus.CANCELLED },
    });
  }

  if (desiredParticipants.size === 0) {
    return;
  }

  const patientName = [surgicalCase.patient?.first_name, surgicalCase.patient?.last_name].filter(Boolean).join(' ').trim();
  const fileSuffix = surgicalCase.patient?.file_number ? ` (${surgicalCase.patient.file_number})` : '';
  const title = patientName
    ? `${patientName}${fileSuffix}`
    : surgicalCase.procedure_name || 'Surgical Case';

  const booking = surgicalCase.theater_booking;
  const bookingIsActive = booking && booking.status !== TheaterBookingStatus.CANCELLED;
  const status = deriveCalendarStatus({
    caseStatus: surgicalCase.status,
    bookingStatus: booking?.status,
  });

  for (const [doctorId, role] of desiredParticipants.entries()) {
    await prisma.calendarEvent.upsert({
      where: {
        doctor_id_surgical_case_id: {
          doctor_id: doctorId,
          surgical_case_id: caseId,
        },
      },
      create: {
        doctor_id: doctorId,
        surgical_case_id: caseId,
        type: CalendarEventType.SURGICAL_CASE,
        team_member_role: role,
        title,
        start_time: bookingIsActive ? booking.start_time : null,
        end_time: bookingIsActive ? booking.end_time : null,
        location: bookingIsActive ? booking?.theater?.name || null : null,
        status,
        notes: surgicalCase.procedure_name || null,
      },
      update: {
        team_member_role: role,
        title,
        start_time: bookingIsActive ? booking.start_time : null,
        end_time: bookingIsActive ? booking.end_time : null,
        location: bookingIsActive ? booking?.theater?.name || null : null,
        status,
        notes: surgicalCase.procedure_name || null,
      },
    });
  }
}
