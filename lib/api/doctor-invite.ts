/**
 * Doctor Invite API endpoints
 * 
 * Type-safe API client methods for doctor invitation activation.
 */

import { apiClient, ApiResponse } from './client';
import type { ActivateDoctorInviteDto, ActivateDoctorInviteResponseDto } from '../../application/dtos/InviteDoctorDto';

/**
 * Doctor Invite API client
 */
export const doctorInviteApi = {
  /**
   * Activate a doctor invitation via token
   */
  async activateInvite(dto: ActivateDoctorInviteDto): Promise<ApiResponse<ActivateDoctorInviteResponseDto>> {
    return apiClient.post<ActivateDoctorInviteResponseDto>('/doctor/activate-invite', dto);
  },
};
