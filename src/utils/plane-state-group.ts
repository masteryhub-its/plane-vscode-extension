import { PlaneStateGroup } from './enums/plane-state-group.enum';

const VALUES: ReadonlySet<string> = new Set(Object.values(PlaneStateGroup));

export function parsePlaneStateGroup(value: unknown): PlaneStateGroup | undefined {
  if (typeof value !== 'string' || !VALUES.has(value)) {
    return undefined;
  }
  return value as PlaneStateGroup;
}
