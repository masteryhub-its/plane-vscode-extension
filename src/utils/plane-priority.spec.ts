import { PlanePriority } from './enums/plane-priority.enum';
import { parsePlanePriority, planePriorityLabel } from './plane-priority';

describe('plane-priority', () => {
  it('labels priorities', () => {
    expect(planePriorityLabel(PlanePriority.HIGH)).toBe('High');
  });

  it('defaults unknown values to none', () => {
    expect(parsePlanePriority('unknown')).toBe(PlanePriority.NONE);
  });
});
