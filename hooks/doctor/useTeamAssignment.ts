
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { casePlanApi } from '@/lib/api/case-plan';
import { toast } from 'sonner';

export function useTeamAssignment(caseId: string) {
    const queryClient = useQueryClient();

    const inviteStaff = useMutation({
        mutationFn: async (data: { invitedUserId: string; invitedRole: string; procedureRecordId?: string }) => {
            const response = await casePlanApi.inviteStaff(caseId, data);
            if (!response.success) throw new Error(response.error);
        },
        onSuccess: () => {
            toast.success('Staff invitation sent');
            queryClient.invalidateQueries({ queryKey: ['surgical-case', caseId] });
            queryClient.invalidateQueries({ queryKey: ['case-plan-detail', caseId] });
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to invite staff');
        }
    });

    const removeStaff = useMutation({
        mutationFn: async (staffId: number) => {
            const response = await casePlanApi.removeStaff(caseId, staffId);
            if (!response.success) throw new Error(response.error);
        },
        onSuccess: () => {
            toast.success('Staff removed from case');
            queryClient.invalidateQueries({ queryKey: ['surgical-case', caseId] });
            queryClient.invalidateQueries({ queryKey: ['case-plan-detail', caseId] });
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to remove staff');
        }
    });

    const cancelInvite = useMutation({
        mutationFn: async (inviteId: string) => {
            const response = await casePlanApi.cancelInvite(caseId, inviteId);
            if (!response.success) throw new Error(response.error);
        },
        onSuccess: () => {
            toast.success('Invitation cancelled');
            queryClient.invalidateQueries({ queryKey: ['surgical-case', caseId] });
            queryClient.invalidateQueries({ queryKey: ['case-plan-detail', caseId] });
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to cancel invite');
        }
    });

    return {
        inviteStaff,
        removeStaff,
        cancelInvite
    };
}
