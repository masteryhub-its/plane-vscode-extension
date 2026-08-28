import { PlaneRelationType } from './enums/plane-relation-type.enum';

const VALUES: ReadonlySet<string> = new Set(Object.values(PlaneRelationType));

export function parsePlaneRelationType(value: unknown): PlaneRelationType {
  if (typeof value === 'string' && VALUES.has(value)) {
    return value as PlaneRelationType;
  }
  return PlaneRelationType.RELATES_TO;
}

export function planeRelationLabel(type: PlaneRelationType): string {
  switch (type) {
    case PlaneRelationType.BLOCKED_BY:
      return 'Blocked by';
    case PlaneRelationType.BLOCKING:
      return 'Blocking';
    case PlaneRelationType.RELATES_TO:
      return 'Relates to';
    case PlaneRelationType.DUPLICATE:
      return 'Duplicate';
  }
}
