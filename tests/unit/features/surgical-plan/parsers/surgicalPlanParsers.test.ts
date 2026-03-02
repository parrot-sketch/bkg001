/**
 * Unit Tests: Surgical Plan Parsers
 */

import { describe, it, expect } from 'vitest';
import {
  parseCaseIdParam,
  parseUpdateClinicalPlanRequest,
  parseSurgicalPlanDetailResponse,
  parseTimelineResultResponse,
} from '@/features/surgical-plan/shared/parsers/surgicalPlanParsers';
import { ValidationError } from '@/application/errors/ValidationError';

describe('surgicalPlanParsers', () => {
  describe('parseCaseIdParam', () => {
    it('should parse valid UUID case ID', () => {
      const params = { caseId: '123e4567-e89b-12d3-a456-426614174000' };
      const result = parseCaseIdParam(params);
      expect(result.caseId).toBe(params.caseId);
    });

    it('should throw ValidationError for invalid UUID', () => {
      const params = { caseId: 'invalid-id' };
      expect(() => parseCaseIdParam(params)).toThrow(ValidationError);
    });

    it('should throw ValidationError for missing caseId', () => {
      const params = {};
      expect(() => parseCaseIdParam(params)).toThrow(ValidationError);
    });
  });

  describe('parseUpdateClinicalPlanRequest', () => {
    it('should parse valid request with all fields', () => {
      const body = {
        procedureName: 'Total Knee Replacement',
        procedurePlan: 'Surgical plan details',
        riskFactors: 'Patient has diabetes',
        preOpNotes: 'Pre-op notes',
        anesthesiaPlan: 'GENERAL',
        specialInstructions: 'Special instructions',
        estimatedDurationMinutes: 120,
        readinessStatus: 'IN_PROGRESS',
      };
      const result = parseUpdateClinicalPlanRequest(body);
      expect(result).toEqual(body);
    });

    it('should parse valid request with partial fields', () => {
      const body = {
        procedureName: 'Total Knee Replacement',
        estimatedDurationMinutes: 120,
      };
      const result = parseUpdateClinicalPlanRequest(body);
      expect(result).toEqual(body);
    });

    it('should parse valid request with null estimatedDurationMinutes', () => {
      const body = {
        estimatedDurationMinutes: null,
      };
      const result = parseUpdateClinicalPlanRequest(body);
      expect(result.estimatedDurationMinutes).toBeNull();
    });

    it('should throw ValidationError for invalid duration (too low)', () => {
      const body = {
        estimatedDurationMinutes: 10, // Below minimum of 15
      };
      expect(() => parseUpdateClinicalPlanRequest(body)).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid duration (too high)', () => {
      const body = {
        estimatedDurationMinutes: 700, // Above maximum of 600
      };
      expect(() => parseUpdateClinicalPlanRequest(body)).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-integer duration', () => {
      const body = {
        estimatedDurationMinutes: 120.5,
      };
      expect(() => parseUpdateClinicalPlanRequest(body)).toThrow(ValidationError);
    });

    it('should throw ValidationError for unknown fields', () => {
      const body = {
        procedureName: 'Test',
        unknownField: 'should not be here',
      };
      expect(() => parseUpdateClinicalPlanRequest(body)).toThrow(ValidationError);
    });
  });

  describe('parseSurgicalPlanDetailResponse', () => {
    it('should parse valid response', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'PLANNING',
        urgency: 'ROUTINE',
        diagnosis: null,
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
          allergies: null,
        },
        primarySurgeon: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          name: 'Dr. Smith',
        },
        theaterBooking: null,
        casePlan: {
          id: 1,
          appointmentId: 1,
          procedurePlan: 'Plan details',
          riskFactors: null,
          preOpNotes: null,
          implantDetails: null,
          anesthesiaPlan: null,
          specialInstructions: null,
          estimatedDurationMinutes: 120,
          readinessStatus: 'IN_PROGRESS',
          readyForSurgery: false,
          updatedAt: '2024-01-01T00:00:00Z',
          consents: [],
          images: [],
          procedureRecord: null,
        },
        readinessChecklist: [
          { key: 'procedure', label: 'Procedure Plan', done: true },
          { key: 'consents', label: 'Consents', done: false },
        ],
      };
      const result = parseSurgicalPlanDetailResponse(data);
      expect(result.id).toBe(data.id);
      expect(result.patient?.firstName).toBe('John');
      expect(result.casePlan?.id).toBe(1);
    });

    it('should throw ValidationError for invalid UUID', () => {
      const data = {
        id: 'invalid-id',
        status: 'PLANNING',
        urgency: 'ROUTINE',
        diagnosis: null,
        procedureName: null,
        side: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        patient: null,
        primarySurgeon: null,
        theaterBooking: null,
        casePlan: null,
        readinessChecklist: [],
      };
      expect(() => parseSurgicalPlanDetailResponse(data)).toThrow(ValidationError);
    });
  });

  describe('parseTimelineResultResponse', () => {
    it('should parse valid timeline response', () => {
      const data = {
        caseId: '123e4567-e89b-12d3-a456-426614174000',
        caseStatus: 'IN_THEATER',
        timeline: {
          wheelsIn: '2024-01-01T08:00:00Z',
          anesthesiaStart: '2024-01-01T08:15:00Z',
          anesthesiaEnd: null,
          incisionTime: '2024-01-01T08:30:00Z',
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
      const result = parseTimelineResultResponse(data);
      expect(result.caseId).toBe(data.caseId);
      expect(result.timeline.wheelsIn).toBe(data.timeline.wheelsIn);
      expect(result.durations.orTimeMinutes).toBe(120);
    });

    it('should throw ValidationError for invalid case ID', () => {
      const data = {
        caseId: 'invalid-id',
        caseStatus: 'IN_THEATER',
        timeline: {
          wheelsIn: null,
          anesthesiaStart: null,
          anesthesiaEnd: null,
          incisionTime: null,
          closureTime: null,
          wheelsOut: null,
        },
        durations: {
          orTimeMinutes: null,
          surgeryTimeMinutes: null,
          prepTimeMinutes: null,
          closeOutTimeMinutes: null,
          anesthesiaTimeMinutes: null,
        },
        missingItems: [],
      };
      expect(() => parseTimelineResultResponse(data)).toThrow(ValidationError);
    });
  });
});
