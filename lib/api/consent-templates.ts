/**
 * Consent Template API Client
 *
 * Type-safe API client for consent template management.
 */

import { apiClient, ApiResponse } from './client';
import { ConsentType, TemplateFormat, TemplateStatus, AuditAction } from '@prisma/client';
import { tokenStorage } from '@/lib/auth/token';

export interface ConsentTemplateDto {
    id: string;
    title: string;
    type: ConsentType;
    content?: string;
    pdf_url?: string | null;
    template_format: TemplateFormat;
    extracted_content?: string | null;
    version: number;
    is_active: boolean;
    status: TemplateStatus;
    description?: string | null;
    usage_count: number;
    last_used_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateConsentTemplateDto {
    title: string;
    type: ConsentType;
    content?: string; // Optional if PDF is provided
    pdf_url?: string; // Optional if content is provided
    template_format?: TemplateFormat; // Defaults to HTML if content, PDF if pdf_url
    extracted_content?: string; // Optional text extracted from PDF
    description?: string; // Template description/notes
}

export interface UpdateConsentTemplateDto {
    title?: string;
    content?: string;
    pdf_url?: string;
    template_format?: TemplateFormat;
    extracted_content?: string;
    description?: string;
    is_active?: boolean;
    version_notes?: string; // Why this version was created
}

export interface UploadPdfResponse {
    url: string; // Local file path (e.g., /api/files/consent-templates/{userId}/{filename})
    filename: string;
    size: number;
    uploadedAt: string;
}

export interface ConsentTemplateVersionDto {
    id: string;
    template_id: string;
    version_number: number;
    title: string;
    content: string;
    pdf_url?: string | null;
    template_format: TemplateFormat;
    created_by?: string | null;
    created_at: string;
    version_notes?: string | null;
}

export interface ConsentTemplateAuditDto {
    id: string;
    template_id: string;
    action: AuditAction;
    actor_user_id: string;
    actor_role: string;
    changes_json?: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
    created_at: string;
}

export const consentTemplateApi = {
    /**
     * Get all templates for the current doctor
     */
    async getAll(params?: {
        includeInactive?: boolean;
        type?: ConsentType;
        status?: TemplateStatus;
        search?: string;
    }): Promise<ApiResponse<ConsentTemplateDto[]>> {
        const searchParams = new URLSearchParams();
        if (params?.includeInactive) {
            searchParams.set('includeInactive', 'true');
        }
        if (params?.type) {
            searchParams.set('type', params.type);
        }
        if (params?.status) {
            searchParams.set('status', params.status);
        }
        if (params?.search) {
            searchParams.set('search', params.search);
        }
        const query = searchParams.toString();
        return apiClient.get<ConsentTemplateDto[]>(`/doctor/consents/templates${query ? `?${query}` : ''}`);
    },

    /**
     * Get a single template by ID
     */
    async getById(templateId: string): Promise<ApiResponse<ConsentTemplateDto>> {
        return apiClient.get<ConsentTemplateDto>(`/doctor/consents/templates/${templateId}`);
    },

    /**
     * Create a new template
     */
    async create(dto: CreateConsentTemplateDto): Promise<ApiResponse<ConsentTemplateDto>> {
        return apiClient.post<ConsentTemplateDto>('/doctor/consents/templates', dto);
    },

    /**
     * Update a template (creates new version)
     */
    async update(templateId: string, dto: UpdateConsentTemplateDto): Promise<ApiResponse<ConsentTemplateDto>> {
        return apiClient.patch<ConsentTemplateDto>(`/doctor/consents/templates/${templateId}`, dto);
    },

    /**
     * Deactivate a template (soft delete)
     */
    async delete(templateId: string): Promise<ApiResponse<ConsentTemplateDto>> {
        return apiClient.delete<ConsentTemplateDto>(`/doctor/consents/templates/${templateId}`);
    },

    /**
     * Upload a PDF file for use as a consent template
     */
    async uploadPdf(file: File): Promise<ApiResponse<UploadPdfResponse>> {
        const formData = new FormData();
        formData.append('file', file);

        // Get auth token from token storage
        const token = tokenStorage.getAccessToken();
        const headers: HeadersInit = {};

        // Add auth header if token is available
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/doctor/consents/templates/upload-pdf', {
            method: 'POST',
            headers,
            body: formData,
            // Don't set Content-Type - browser will set it with boundary for FormData
        });

        const json = await response.json();
        if (!response.ok) {
            return { success: false, error: json.error || 'Upload failed' };
        }
        return { success: true, data: json.data };
    },

    /**
     * Activate a template (DRAFT → ACTIVE)
     */
    async activate(templateId: string): Promise<ApiResponse<ConsentTemplateDto>> {
        return apiClient.post<ConsentTemplateDto>(`/doctor/consents/templates/${templateId}/activate`, {});
    },

    /**
     * Archive a template (ACTIVE → ARCHIVED)
     */
    async archive(templateId: string): Promise<ApiResponse<ConsentTemplateDto>> {
        return apiClient.post<ConsentTemplateDto>(`/doctor/consents/templates/${templateId}/archive`, {});
    },

    /**
     * Duplicate a template
     */
    async duplicate(templateId: string, newTitle: string): Promise<ApiResponse<ConsentTemplateDto>> {
        return apiClient.post<ConsentTemplateDto>(`/doctor/consents/templates/${templateId}/duplicate`, {
            title: newTitle,
        });
    },

    /**
     * Get version history for a template
     */
    async getVersions(templateId: string): Promise<ApiResponse<ConsentTemplateVersionDto[]>> {
        return apiClient.get<ConsentTemplateVersionDto[]>(`/doctor/consents/templates/${templateId}/versions`);
    },

    /**
     * Get audit log for a template
     */
    async getAuditLog(templateId: string, limit?: number): Promise<ApiResponse<ConsentTemplateAuditDto[]>> {
        const searchParams = new URLSearchParams();
        if (limit) {
            searchParams.set('limit', limit.toString());
        }
        const query = searchParams.toString();
        return apiClient.get<ConsentTemplateAuditDto[]>(`/doctor/consents/templates/${templateId}/audit${query ? `?${query}` : ''}`);
    },
    /**
     * Submit a template for approval (DRAFT → PENDING_APPROVAL)
     */
    async submitForApproval(templateId: string, notes?: string): Promise<ApiResponse<ConsentTemplateDto>> {
        return apiClient.post<ConsentTemplateDto>(
            `/doctor/consents/templates/${templateId}/submit-approval`,
            { notes }
        );
    },

    /**
     * Approve a template (PENDING_APPROVAL → ACTIVE) — admin only
     */
    async approve(templateId: string, releaseNotes?: string): Promise<ApiResponse<ConsentTemplateDto>> {
        return apiClient.post<ConsentTemplateDto>(
            `/doctor/consents/templates/${templateId}/approve`,
            { releaseNotes }
        );
    },

    /**
     * Reject a template (PENDING_APPROVAL → DRAFT) — admin only
     */
    async reject(templateId: string, reason: string): Promise<ApiResponse<ConsentTemplateDto>> {
        return apiClient.post<ConsentTemplateDto>(
            `/doctor/consents/templates/${templateId}/reject`,
            { reason }
        );
    },
};
