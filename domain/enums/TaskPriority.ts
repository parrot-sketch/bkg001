/**
 * Domain Enum: TaskPriority
 * 
 * Represents the priority level of a clinical task.
 */
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export function isTaskPriority(value: string): value is TaskPriority {
  return Object.values(TaskPriority).includes(value as TaskPriority);
}

export function getTaskPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    [TaskPriority.LOW]: 'text-gray-600 bg-gray-100',
    [TaskPriority.MEDIUM]: 'text-blue-600 bg-blue-100',
    [TaskPriority.HIGH]: 'text-orange-600 bg-orange-100',
    [TaskPriority.URGENT]: 'text-red-600 bg-red-100',
  };
  return colors[priority];
}
