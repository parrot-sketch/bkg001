import { useQuery, useMutation } from '@tanstack/react-query';
import { adminApi, GenerateReportDto } from '@/lib/api/admin';

/**
 * Hook for fetching audit logs with pagination
 */
export function useAuditLogs(limit: number, offset: number, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', limit, offset],
    queryFn: async () => {
      const response = await adminApi.getAuditLogs(limit, offset);
      if (!response.success) throw new Error(response.error || 'Failed to load audit logs');
      return {
        data: response.data ?? [],
        meta: response.meta ?? { total: 0, limit, offset }
      };
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for generating a system analytics report
 */
export function useGenerateReport() {
  return useMutation({
    mutationFn: async (dto: GenerateReportDto) => {
      const response = await adminApi.generateReport(dto);
      if (!response.success) throw new Error(response.error || 'Failed to generate report');
      return response.data;
    },
  });
}
