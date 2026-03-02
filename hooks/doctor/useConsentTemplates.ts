/**
 * React Query hooks for consent template management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consentTemplateApi, ConsentTemplateDto, CreateConsentTemplateDto, UpdateConsentTemplateDto } from '@/lib/api/consent-templates';
import { ConsentType, TemplateStatus } from '@prisma/client';
import { toast } from 'sonner';

// ─── Query Keys ────────────────────────────────────────────────────────────

export const consentTemplateKeys = {
    all: ['consent-templates'] as const,
    lists: () => [...consentTemplateKeys.all, 'list'] as const,
    list: (filters?: { includeInactive?: boolean; type?: ConsentType; status?: TemplateStatus; search?: string }) =>
        [...consentTemplateKeys.lists(), filters] as const,
    details: () => [...consentTemplateKeys.all, 'detail'] as const,
    detail: (id: string) => [...consentTemplateKeys.details(), id] as const,
};

// ─── Queries ───────────────────────────────────────────────────────────────

/**
 * Get all consent templates for the current doctor
 */
export function useConsentTemplates(filters?: { includeInactive?: boolean; type?: ConsentType; status?: TemplateStatus; search?: string }) {
    return useQuery<ConsentTemplateDto[]>({
        queryKey: consentTemplateKeys.list(filters),
        queryFn: async () => {
            const response = await consentTemplateApi.getAll(filters);
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch templates');
            }
            return response.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

/**
 * Get a single template by ID
 */
export function useConsentTemplate(templateId: string | null) {
    return useQuery<ConsentTemplateDto>({
        queryKey: consentTemplateKeys.detail(templateId || ''),
        queryFn: async () => {
            if (!templateId) throw new Error('Template ID required');
            const response = await consentTemplateApi.getById(templateId);
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch template');
            }
            return response.data;
        },
        enabled: !!templateId,
        staleTime: 1000 * 60 * 5,
    });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Create a new consent template
 */
export function useCreateConsentTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (dto: CreateConsentTemplateDto) => {
            const response = await consentTemplateApi.create(dto);
            if (!response.success) {
                throw new Error(response.error || 'Failed to create template');
            }
            return response.data;
        },
        onSuccess: () => {
            toast.success('Template created successfully');
            queryClient.invalidateQueries({ queryKey: consentTemplateKeys.lists() });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

/**
 * Update a consent template
 */
export function useUpdateConsentTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ templateId, dto }: { templateId: string; dto: UpdateConsentTemplateDto }) => {
            const response = await consentTemplateApi.update(templateId, dto);
            if (!response.success) {
                throw new Error(response.error || 'Failed to update template');
            }
            return response.data;
        },
        onSuccess: (data) => {
            toast.success('Template updated successfully');
            queryClient.invalidateQueries({ queryKey: consentTemplateKeys.lists() });
            queryClient.invalidateQueries({ queryKey: consentTemplateKeys.detail(data.id) });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

/**
 * Delete (deactivate) a consent template
 */
export function useDeleteConsentTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (templateId: string) => {
            const response = await consentTemplateApi.delete(templateId);
            if (!response.success) {
                throw new Error(response.error || 'Failed to delete template');
            }
            return response.data;
        },
        onSuccess: () => {
            toast.success('Template deactivated successfully');
            queryClient.invalidateQueries({ queryKey: consentTemplateKeys.lists() });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}
