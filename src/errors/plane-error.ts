import { PlaneErrorCode } from '../utils/enums/plane-error-code.enum';

export { PlaneErrorCode };

export interface PlaneErrorOptions {
  readonly cause?: unknown;
}

export class PlaneError extends Error {
  public readonly code: PlaneErrorCode;

  public constructor(message: string, code: PlaneErrorCode, options?: PlaneErrorOptions) {
    super(message, options);
    this.name = 'PlaneError';
    this.code = code;
  }
}

export function isPlaneError(error: unknown): error is PlaneError {
  return error instanceof PlaneError;
}

const AUTH_ERROR_CODES: ReadonlySet<PlaneErrorCode> = new Set([PlaneErrorCode.AUTHENTICATION_REQUIRED, PlaneErrorCode.UNAUTHENTICATED, PlaneErrorCode.NOT_SIGNED_IN]);

export function isNotSignedInError(error: unknown): boolean {
  return isPlaneError(error) && error.code === PlaneErrorCode.NOT_SIGNED_IN;
}

export function isAuthPlaneError(error: unknown): boolean {
  return isPlaneError(error) && AUTH_ERROR_CODES.has(error.code);
}
