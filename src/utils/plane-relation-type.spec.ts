import { PlaneRelationType } from './enums/plane-relation-type.enum';
import { parsePlaneRelationType, planeRelationLabel } from './plane-relation-type';

describe('plane-relation-type', () => {
  it('parses known relation types and defaults unknown values', () => {
    expect(parsePlaneRelationType(PlaneRelationType.BLOCKED_BY)).toBe(PlaneRelationType.BLOCKED_BY);
    expect(parsePlaneRelationType('nope')).toBe(PlaneRelationType.RELATES_TO);
    expect(planeRelationLabel(PlaneRelationType.BLOCKED_BY)).toBe('Blocked by');
  });
});
