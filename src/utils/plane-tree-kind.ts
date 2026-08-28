import { PlaneTreeKind } from './enums/plane-tree-kind.enum';

const VALUES: ReadonlySet<string> = new Set(Object.values(PlaneTreeKind));

export function parsePlaneTreeKind(value: unknown): PlaneTreeKind | undefined {
  if (typeof value !== 'string' || !VALUES.has(value)) {
    return undefined;
  }
  return value as PlaneTreeKind;
}
