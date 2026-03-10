import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type { UserResponseDto } from '@/application/dtos/UserResponseDto';
import type { CreateStaffDto } from '@/application/dtos/CreateStaffDto';
import { Status } from '@/domain/enums/Status';

/**
 * Hook for fetching all staff members (Admin view)
 */
export function useAllStaff(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: async () => {
      const response = await adminApi.getAllStaff();
      if (!response.success) throw new Error(response.error || 'Failed to load staff');
      return (response.data as any)?.data ?? response.data ?? [];
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    refetchOnWindowFocus: true,
    enabled,
  });
}

/**
 * Hook for creating a staff member
 */
export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateStaffDto) => adminApi.createStaff(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] }),
  });
}

/**
 * Hook for updating a staff member's profile
 */
export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateStaffDto> }) =>
      adminApi.updateStaff(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] }),
  });
}

/**
 * Hook for toggling a staff member's status
 */
export function useUpdateStaffStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status, updatedBy }: { userId: string; status: Status; updatedBy: string }) =>
      adminApi.updateStaffStatus({ userId, status, updatedBy }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] }),
  });
}
