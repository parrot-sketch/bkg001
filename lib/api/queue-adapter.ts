/**
 * Infrastructure Adapter — HttpQueueApi
 *
 * HTTP implementation of the `QueueApi` port.
 *
 * Responsibilities:
 * - Translate `QueueOutcome<T>` requests into HTTP calls.
 * - Map transport and HTTP failures to the `ClinicalError` taxonomy.
 * - Preserve authentication, retry, and polling semantics of the
 *   underlying `apiClient`.
 *
 * **Must NOT:**
 * - Expose HTTP details (URLs, status codes, headers) through the port.
 * - Introduce new network behavior (timeouts, retries) that diverges from
 * - the existing `apiClient`.
 *
 * **Future transport note:**
 * This adapter uses HTTP GET today. Future adapters may use WebSockets,
 * Server-Sent Events, or push notifications without changing the port.
 */

import { QueueApi, QueueOutcome, QueuePatient } from '@/domain/interfaces/services/QueueApi';
import { apiClient, ApiError } from '@/lib/api/client';
import { mapApiError, mapNetworkError } from '@/lib/api/adapter-utils';
import type { ClinicalError } from '@/shared-kernel/errors/types';
import {
  ClinicalErrorCode,
  ClinicalErrorCategory,
} from '@/shared-kernel/errors/codes';

const QUEUE_ERROR_CONFIG = {
  notFoundCode: ClinicalErrorCode.QUEUE_ITEM_MISSING,
  notFoundCategory: ClinicalErrorCategory.QUEUE,
};

/**
 * HttpQueueApi — concrete HTTP adapter for QueueApi.
 *
 * Uses the existing `apiClient` to preserve all current
 * request/response contracts, authentication behavior, and retry semantics.
 *
 * **Future transport note:**
 * This adapter uses HTTP GET today. Future adapters may use WebSockets,
 * Server-Sent Events, or push notifications without changing the port.
 */
export class HttpQueueApi implements QueueApi {
  async loadQueue(clinicianId: string): Promise<QueueOutcome<QueuePatient[]>> {
    try {
      const response = await apiClient.get<QueuePatient[]>(`/api/doctor/${clinicianId}/queue`);
      if (!response.success) {
        return { success: false, error: mapApiError(response, QUEUE_ERROR_CONFIG) };
      }
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: mapNetworkError(error) };
    }
  }
}
