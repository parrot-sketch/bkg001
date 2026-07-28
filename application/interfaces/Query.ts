/**
 * Query Interface
 *
 * Represents a request for data.
 * Queries have no side effects.
 */

export interface Query<TRequest, TResponse> {
  execute(request: TRequest): Promise<TResponse>;
}
