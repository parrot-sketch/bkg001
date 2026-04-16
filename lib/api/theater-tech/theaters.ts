import { apiClient, type ApiResponse } from '@/lib/api/client';
import type { Theater, TheaterFormData } from '@/app/admin/theaters/_components/types';

export const theaterTechTheaterApi = {
  async getAll(): Promise<ApiResponse<Theater[]>> {
    return apiClient.get<Theater[]>('/theater-tech/theaters');
  },

  async create(data: TheaterFormData): Promise<ApiResponse<Theater>> {
    return apiClient.post<Theater>('/theater-tech/theaters', data);
  },

  async update(
    id: string,
    data: Partial<Theater> | TheaterFormData | (Partial<Theater> & { rate_per_minute?: number }),
  ): Promise<ApiResponse<Theater>> {
    return apiClient.put<Theater>(`/theater-tech/theaters/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/theater-tech/theaters/${id}`);
  },
};

