import { apiClient, ApiResponse } from './client';
import { Theater, TheaterFormData } from '@/app/admin/theaters/_components/types';

export const theaterApi = {
  /**
   * Get all theaters with today's bookings
   */
  async getAll(): Promise<ApiResponse<Theater[]>> {
    return apiClient.get<Theater[]>('/admin/theaters');
  },

  /**
   * Get a single theater by ID with full schedule
   */
  async getById(id: string): Promise<ApiResponse<Theater>> {
    return apiClient.get<Theater>(`/admin/theaters/${id}`);
  },

  /**
   * Create a new theater
   */
  async create(data: TheaterFormData): Promise<ApiResponse<Theater>> {
    return apiClient.post<Theater>('/admin/theaters', data);
  },

  /**
   * Update an existing theater
   */
  async update(id: string, data: Partial<Theater>): Promise<ApiResponse<Theater>> {
    return apiClient.put<Theater>(`/admin/theaters/${id}`, data);
  },

  /**
   * Delete a theater
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/admin/theaters/${id}`);
  },
};
