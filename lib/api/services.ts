import { apiClient, ApiResponse } from './client';

export interface ServiceDto {
    id: number;
    service_name: string;
    description: string | null;
    price: number;
    category: string | null;
}

export const servicesApi = {
    getAll: async (): Promise<ApiResponse<ServiceDto[]>> => {
        return apiClient.get<ServiceDto[]>('/services');
    },
};
