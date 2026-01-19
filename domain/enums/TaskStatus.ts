/**
 * Domain Enum: TaskStatus
 * 
 * Represents the status of a clinical task.
 */
export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export function isTaskStatus(value: string): value is TaskStatus {
  return Object.values(TaskStatus).includes(value as TaskStatus);
}
