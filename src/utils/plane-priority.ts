import { PlanePriority } from './enums/plane-priority.enum';

const VALUES: ReadonlySet<string> = new Set(Object.values(PlanePriority));

export function parsePlanePriority(value: unknown): PlanePriority {
  if (typeof value === 'string' && VALUES.has(value)) {
    return value as PlanePriority;
  }
  return PlanePriority.NONE;
}

export function planePriorityLabel(priority: PlanePriority): string {
  switch (priority) {
    case PlanePriority.URGENT:
      return 'Urgent';
    case PlanePriority.HIGH:
      return 'High';
    case PlanePriority.MEDIUM:
      return 'Medium';
    case PlanePriority.LOW:
      return 'Low';
    case PlanePriority.NONE:
      return 'None';
  }
}
