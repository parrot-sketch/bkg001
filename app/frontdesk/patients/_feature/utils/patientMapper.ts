import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { PatientRegistryDto } from '@/application/dtos/PatientRegistryDto';

/**
 * Maps a full `PatientResponseDto` (returned by the single-patient endpoint)
 * into the lightweight `PatientRegistryDto` shape used by the list view.
 *
 * This is needed by the recently-viewed feature, which fetches individual
 * patients but needs to render them in the same list format.
 */
export function mapResponseToRegistry(p: PatientResponseDto): PatientRegistryDto {
  return {
    id: p.id,
    fileNumber: p.fileNumber,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth:
      p.dateOfBirth instanceof Date
        ? p.dateOfBirth.toISOString()
        : String(p.dateOfBirth),
    gender: p.gender,
    email: p.email,
    phone: p.phone,
    profileImage: p.profileImage,
    colorCode: p.colorCode,
    createdAt:
      p.createdAt instanceof Date
        ? p.createdAt.toISOString()
        : String(p.createdAt ?? ''),
    totalVisits: (p as unknown as Record<string, unknown>).totalVisits as number ?? 0,
    lastVisitAt:
      (p as unknown as Record<string, unknown>).lastVisitDate
        ? new Date(
            (p as unknown as Record<string, unknown>).lastVisitDate as string,
          ).toISOString()
        : null,
    queueStatus: null,
    outstandingBalance: 0,
  };
}
