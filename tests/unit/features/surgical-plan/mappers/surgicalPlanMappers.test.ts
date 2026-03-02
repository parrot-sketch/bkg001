/**
 * Unit Tests: Surgical Plan Mappers
 */

import { describe, it, expect } from 'vitest';
import { mapCasePlanDetailDtoToViewModel } from '@/features/surgical-plan/shared/mappers/surgicalPlanMappers';
import type { CasePlanDetailDto } from '@/lib/api/case-plan';
import type { TimelineResultDto } from '@/application/dtos/TheaterTechDtos';

describe('surgicalPlanMappers', () => {
  describe('mapCasePlanDetailDtoToViewModel', () => {
    const baseDto: CasePlanDetailDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'PLANNING',
      urgency: 'ROUTINE',
      diagnosis: 'Osteoarthritis',
      procedureName: 'Total Knee Replacement',
      side: 'LEFT',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      patient: {
        id: '123e4567-e89b-12d3-a456-426614174001',
        firstName: 'John',
        lastName: 'Doe',
        fileNumber: 'NS001',
        gender: 'MALE',
        dateOfBirth: '1980-01-01',
        allergies: 'Penicillin',
      },
      primarySurgeon: {
        id: '123e4567-e89b-12d3-a456-426614174002',
        name: 'Dr. Smith',
      },
      consultation: null,
      theaterBooking: {
        id: '123e4567-e89b-12d3-a456-426614174003',
        startTime: '2024-01-15T08:00:00Z',
        endTime: '2024-01-15T10:00:00Z',
        status: 'CONFIRMED',
        theaterName: 'Theater 1',
      },
      casePlan: {
        id: 1,
        appointmentId: 1,
        procedurePlan: 'Surgical plan details',
        riskFactors: 'Patient has diabetes',
        preOpNotes: 'Pre-op notes',
        implantDetails: null,
        anesthesiaPlan: 'GENERAL',
        specialInstructions: 'Special instructions',
        estimatedDurationMinutes: 120,
        readinessStatus: 'IN_PROGRESS',
        readyForSurgery: false,
        updatedAt: '2024-01-01T00:00:00Z',
        consents: [
          { id: '1', title: 'Consent 1', type: 'GENERAL_PROCEDURE', status: 'SIGNED', signedAt: '2024-01-01T00:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
        ],
        images: [
          { id: 1, imageUrl: 'url1', thumbnailUrl: null, angle: 'FRONT', timepoint: 'PRE_OP', description: null, consentForMarketing: false, takenAt: '2024-01-01T00:00:00Z' },
        ],
        procedureRecord: {
          id: 1,
          anesthesiaType: 'GENERAL',
          urgency: 'ROUTINE',
          staff: [
            {
              id: 1,
              role: 'SCRUB_NURSE',
              userId: '123e4567-e89b-12d3-a456-426614174004',
              user: {
                id: '123e4567-e89b-12d3-a456-426614174004',
                firstName: 'Jane',
                lastName: 'Nurse',
                role: 'NURSE',
              },
            },
          ],
        },
      },
      readinessChecklist: [
        { key: 'procedure', label: 'Procedure Plan', done: true },
        { key: 'consents', label: 'Consents', done: false },
      ],
    };

    it('should map DTO to view model correctly', () => {
      const viewModel = mapCasePlanDetailDtoToViewModel(baseDto);

      expect(viewModel.caseId).toBe(baseDto.id);
      expect(viewModel.patient?.fullName).toBe('John Doe');
      expect(viewModel.patient?.fileNumber).toBe('NS001');
      expect(viewModel.patient?.age).toBe('46y'); // 2026 - 1980 = 46
      expect(viewModel.patient?.allergies).toBe('Penicillin');
      expect(viewModel.case.procedureName).toBe('Total Knee Replacement');
      expect(viewModel.casePlan?.estimatedDurationMinutes).toBe(120);
      expect(viewModel.casePlan?.consentsCount).toBe(1);
      expect(viewModel.casePlan?.imagesCount).toBe(1);
      expect(viewModel.casePlan?.staffCount).toBe(1);
      expect(viewModel.primarySurgeon?.name).toBe('Dr. Smith');
      expect(viewModel.theaterBooking?.theaterName).toBe('Theater 1');
      expect(viewModel.readinessChecklist).toHaveLength(2);
    });

    it('should handle null patient', () => {
      const dtoWithoutPatient = { ...baseDto, patient: null };
      const viewModel = mapCasePlanDetailDtoToViewModel(dtoWithoutPatient);

      expect(viewModel.patient).toBeNull();
    });

    it('should handle null casePlan', () => {
      const dtoWithoutCasePlan = { ...baseDto, casePlan: null };
      const viewModel = mapCasePlanDetailDtoToViewModel(dtoWithoutCasePlan);

      expect(viewModel.casePlan).toBeNull();
    });

    it('should calculate age correctly', () => {
      const dtoWithRecentBirth = {
        ...baseDto,
        patient: {
          ...baseDto.patient!,
          dateOfBirth: '2020-01-01', // 6 years old in 2026
        },
      };
      const viewModel = mapCasePlanDetailDtoToViewModel(dtoWithRecentBirth);

      expect(viewModel.patient?.age).toBe('6y');
    });

    it('should handle null dateOfBirth', () => {
      const dtoWithoutDob = {
        ...baseDto,
        patient: {
          ...baseDto.patient!,
          dateOfBirth: null,
        },
      };
      const viewModel = mapCasePlanDetailDtoToViewModel(dtoWithoutDob);

      expect(viewModel.patient?.age).toBeNull();
    });

    it('should include timeline when provided', () => {
      const timeline: TimelineResultDto = {
        caseId: baseDto.id,
        caseStatus: 'IN_THEATER',
        timeline: {
          wheelsIn: '2024-01-15T08:00:00Z',
          anesthesiaStart: '2024-01-15T08:15:00Z',
          anesthesiaEnd: null,
          incisionTime: '2024-01-15T08:30:00Z',
          closureTime: null,
          wheelsOut: null,
        },
        durations: {
          orTimeMinutes: 120,
          surgeryTimeMinutes: 90,
          prepTimeMinutes: 15,
          closeOutTimeMinutes: null,
          anesthesiaTimeMinutes: null,
        },
        missingItems: [],
      };

      const viewModel = mapCasePlanDetailDtoToViewModel(baseDto, timeline);

      expect(viewModel.timeline).toBe(timeline);
      expect(viewModel.timeline?.caseId).toBe(baseDto.id);
    });

    it('should handle null timeline', () => {
      const viewModel = mapCasePlanDetailDtoToViewModel(baseDto, null);

      expect(viewModel.timeline).toBeNull();
    });

    it('should handle casePlan without procedureRecord', () => {
      const dtoWithoutProcedureRecord = {
        ...baseDto,
        casePlan: {
          ...baseDto.casePlan!,
          procedureRecord: null,
        },
      };
      const viewModel = mapCasePlanDetailDtoToViewModel(dtoWithoutProcedureRecord);

      expect(viewModel.casePlan?.staffCount).toBe(0);
    });
  });
});
