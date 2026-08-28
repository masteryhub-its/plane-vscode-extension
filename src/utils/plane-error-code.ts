import { PlaneErrorCode } from './enums/plane-error-code.enum';

export function parsePlaneErrorCode(value: unknown): PlaneErrorCode | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  return Object.values(PlaneErrorCode).includes(value as PlaneErrorCode) ? (value as PlaneErrorCode) : undefined;
}
