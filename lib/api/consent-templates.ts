/**
 * Consent Template API Client
 *
 * Type-safe API client for consent template management.
 */

import { apiClient, ApiResponse } from './client';
import { ConsentType, TemplateFormat } from '@prisma/client';

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
}

export interface UpdateConsentTemplateDto {
    title?: string;
    content?: string;
    pdf_url?: string;
    template_format?: TemplateFormat;
    extracted_content?: string;
    is_active?: boolean;
}

export interface UploadPdfResponse {
    url: string;
    publicId: string;
    format: string;
    size: number;
}

export const consentTemplateApi = {
    /**
     * Get all templates for the current doctor
     */
    async getAll(params?: { includeInactive?: boolean; type?: ConsentType }): Promise<ApiResponse<ConsentTemplateDto[]>> {
        const searchParams = new URLSearchParams();
        if (params?.includeInactive) {
            searchParams.set('includeInactive', 'true');
        }
        if (params?.type) {
            searchParams.set('type', params.type);
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

        const response = await fetch('/api/doctor/consents/templates/upload-pdf', {
            method: 'POST',
            body: formData,
        });

        const json = await response.json();
        if (!response.ok) {
            return { success: false, error: json.error || 'Upload failed' };
        }
        return { success: true, data: json.data };
    },
};
