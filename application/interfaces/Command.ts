/**
 * Application Layer — Command Interface
 *
 * Represents an intent to change state.
 * Commands are validated, authorized, and executed by the Application Layer.
 */

export interface Command<TRequest, TResponse = void> {
  execute(request: TRequest): Promise<TResponse>;
}
