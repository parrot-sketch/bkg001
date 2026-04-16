/**
 * useDoctorSurgicalCasesPipeline Hook
 * 
 * Fetches surgical cases for the doctor grouped by pipeline stage.
 * Used by: Doctor dashboard - Case Pipeline (Zone 3)
 * 
 * Pipeline Tabs:
 * - Surgical Planning: PLANNING, READY_FOR_WARD_PREP
 * - Pre-Op (Ward Prep): IN_WARD_PREP
 * - Scheduled / Pre-Op: SCHEDULED, IN_PREP, READY_FOR_THEATER_BOOKING
 * - In Theater: IN_THEATER
 * - Recovery & Post-Op: RECOVERY, COMPLETED (last 7 days)
 * 
 * Excludes: DRAFT, CANCELLED
 * 
 * Polling: 60 seconds (less critical than queue)
 */

import { useQuery } from '@tanstack/react-query';
import { surgicalCasesApi, SurgicalCaseListItemDto } from '@/lib/api/surgical-cases';

export interface SurgicalCasePipeline {
  planning: SurgicalCaseListItemDto[];
  preOp: SurgicalCaseListItemDto[];
  scheduled: SurgicalCaseListItemDto[];
  inTheater: SurgicalCaseListItemDto[];
  recovery: SurgicalCaseListItemDto[];
}

export interface SurgicalCasePipelineWithCounts {
  pipeline: SurgicalCasePipeline;
  counts: {
    planning: number;
    preOp: number;
    scheduled: number;
    inTheater: number;
    recovery: number;
    total: number;
  };
}

// Status categories for each pipeline tab
const PLANNING_STATUSES = ['PLANNING', 'READY_FOR_WARD_PREP'];
const PREOP_STATUSES = ['IN_WARD_PREP'];
const SCHEDULED_STATUSES = ['SCHEDULED', 'IN_PREP', 'READY_FOR_THEATER_BOOKING'];
const IN_THEATER_STATUSES = ['IN_THEATER'];
const RECOVERY_STATUSES = ['RECOVERY', 'COMPLETED'];

export function useDoctorSurgicalCasesPipeline(enabled = true) {
  return useQuery<SurgicalCasePipelineWithCounts>({
    queryKey: ['doctor', 'surgical-cases', 'pipeline'],
    queryFn: async () => {
      // Fetch all active cases (not DRAFT, CANCELLED)
      const response = await surgicalCasesApi.getMyCases({
        pageSize: 100, // Get all relevant cases
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load surgical cases');
      }

      const allCases = response.data.items;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Group cases by pipeline stage
      const pipeline: SurgicalCasePipeline = {
        planning: [],
        preOp: [],
        scheduled: [],
        inTheater: [],
        recovery: [],
      };

      allCases.forEach((surgicalCase) => {
        // Skip DRAFT and CANCELLED
        if (surgicalCase.status === 'DRAFT' || surgicalCase.status === 'CANCELLED') {
          return;
        }

        // Surgical Planning tab
        if (PLANNING_STATUSES.includes(surgicalCase.status)) {
          pipeline.planning.push(surgicalCase);
        }
        // Pre-Op / Ward Prep tab
        else if (PREOP_STATUSES.includes(surgicalCase.status)) {
          pipeline.preOp.push(surgicalCase);
        }
        // Scheduled / Pre-Op tab
        else if (SCHEDULED_STATUSES.includes(surgicalCase.status)) {
          pipeline.scheduled.push(surgicalCase);
        }
        // In Theater tab
        else if (IN_THEATER_STATUSES.includes(surgicalCase.status)) {
          pipeline.inTheater.push(surgicalCase);
        }
        // Recovery & Post-Op tab - only last 7 days for COMPLETED
        else if (RECOVERY_STATUSES.includes(surgicalCase.status)) {
          if (surgicalCase.status === 'RECOVERY') {
            pipeline.recovery.push(surgicalCase);
          } else if (surgicalCase.status === 'COMPLETED') {
            const createdAt = new Date(surgicalCase.createdAt);
            if (createdAt >= sevenDaysAgo) {
              pipeline.recovery.push(surgicalCase);
            }
          }
        }
      });

      // Sort each pipeline by updatedAt (most recent first)
      const sortByUpdated = (a: SurgicalCaseListItemDto, b: SurgicalCaseListItemDto) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

      pipeline.planning.sort(sortByUpdated);
      pipeline.scheduled.sort(sortByUpdated);
      pipeline.inTheater.sort(sortByUpdated);
      pipeline.recovery.sort(sortByUpdated);

      return {
        pipeline,
        counts: {
          planning: pipeline.planning.length,
          preOp: pipeline.preOp.length,
          scheduled: pipeline.scheduled.length,
          inTheater: pipeline.inTheater.length,
          recovery: pipeline.recovery.length,
          total: pipeline.planning.length + pipeline.preOp.length + pipeline.scheduled.length + 
                 pipeline.inTheater.length + pipeline.recovery.length,
        },
      };
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: 60000, // Poll every 60 seconds
    networkMode: 'offlineFirst',
    enabled,
  });
}
