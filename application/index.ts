/**
 * Application Layer — Barrel Exports
 *
 * Public entry point for the Application Layer.
 *
 * Consumers must import from this entry point only.
 * Internal paths are private and may change without notice.
 */

// Re-export shared result utilities (values)
export { success, failure, isSuccess, isFailure } from './results/index';

// Re-export shared result types
export type {
  Result,
  Success,
  Failure,
} from './results/index';

// Re-export base CQRS contracts
export type { Command, Query } from './interfaces/index';

// Directory namespaces for incremental adoption
export * as commands from './commands/index';
export * as queries from './queries/index';
export * as results from './results/index';
export * as interfaces from './interfaces/index';
export * as orchestrators from './orchestrators/index';
export * as consultationUseCases from './use-cases/consultation/index';
export * as patientUseCases from './use-cases/patient/index';
export * as queueUseCases from './use-cases/queue/index';
export * as consultationDtos from './dto/consultation/index';
export * as patientDtos from './dto/patient/index';
export * as queueDtos from './dto/queue/index';
export * as shims from './shims/index';
