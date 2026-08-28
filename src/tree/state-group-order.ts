import type { PlaneState } from '../client/plane.types';
import { PlaneStateGroup } from '../utils/enums/plane-state-group.enum';

const GROUP_ORDER: ReadonlyMap<string, number> = new Map([
  [PlaneStateGroup.BACKLOG, 0],
  [PlaneStateGroup.UNSTARTED, 1],
  [PlaneStateGroup.STARTED, 2],
  [PlaneStateGroup.COMPLETED, 3],
  [PlaneStateGroup.CANCELLED, 4],
]);

function groupRank(group: string): number {
  return GROUP_ORDER.get(group) ?? 99;
}

export function sortStatesByGroup(states: readonly PlaneState[]): readonly PlaneState[] {
  return [...states].sort((left, right) => {
    const rank = groupRank(left.group) - groupRank(right.group);
    if (rank !== 0) {
      return rank;
    }
    return left.name.localeCompare(right.name);
  });
}
