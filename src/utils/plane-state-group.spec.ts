import { PlaneStateGroup } from './enums/plane-state-group.enum';
import { parsePlaneStateGroup } from './plane-state-group';

describe('plane-state-group', () => {
  it('parses known groups', () => {
    expect(parsePlaneStateGroup(PlaneStateGroup.STARTED)).toBe(PlaneStateGroup.STARTED);
    expect(parsePlaneStateGroup('unknown')).toBeUndefined();
  });
});
