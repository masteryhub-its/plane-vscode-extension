import type { PlaneState } from '../client/plane.types';
import { PlaneStateGroup } from '../utils/enums/plane-state-group.enum';
import { sortStatesByGroup } from './state-group-order';

describe('sortStatesByGroup', () => {
  it('orders custom states by backlog, unstarted, started, completed, cancelled', () => {
    const states: readonly PlaneState[] = [
      { id: 'd', name: 'Done', group: PlaneStateGroup.COMPLETED, color: '#0f0' },
      { id: 'a', name: 'Icebox', group: PlaneStateGroup.BACKLOG, color: '#000' },
      { id: 'c', name: 'In Progress', group: PlaneStateGroup.STARTED, color: '#00f' },
      { id: 'b', name: 'Todo', group: PlaneStateGroup.UNSTARTED, color: '#aaa' },
      { id: 'e', name: 'Cancelled', group: PlaneStateGroup.CANCELLED, color: '#f00' },
    ];
    expect(sortStatesByGroup(states).map((state) => state.name)).toEqual(['Icebox', 'Todo', 'In Progress', 'Done', 'Cancelled']);
  });
});
