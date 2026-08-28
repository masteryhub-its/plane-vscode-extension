import { PlaneTreeKind } from './enums/plane-tree-kind.enum';
import { parsePlaneTreeKind } from './plane-tree-kind';

describe('plane-tree-kind', () => {
  it('parses tree kinds', () => {
    expect(parsePlaneTreeKind(PlaneTreeKind.ISSUE)).toBe(PlaneTreeKind.ISSUE);
  });
});
