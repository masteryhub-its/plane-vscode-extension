import type { BoundPlaneCredential } from '../client/plane.types';
import { PlaneError, PlaneErrorCode } from '../errors/plane-error';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function serializeBoundCredential(bound: BoundPlaneCredential): string {
  return JSON.stringify(bound);
}

export function deserializeBoundCredential(raw: string): BoundPlaneCredential {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (cause: unknown) {
    throw new PlaneError('Stored credential is not valid JSON', PlaneErrorCode.UNEXPECTED_RESPONSE, { cause });
  }

  if (!isRecord(parsed)) {
    throw new PlaneError('Stored credential is malformed', PlaneErrorCode.UNEXPECTED_RESPONSE);
  }

  const serverUrl = parsed['serverUrl'];
  const token = parsed['token'];
  if (typeof serverUrl !== 'string' || serverUrl.trim().length === 0) {
    throw new PlaneError('Stored credential is not bound to a server URL', PlaneErrorCode.UNEXPECTED_RESPONSE);
  }
  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new PlaneError('Stored Plane PAT is empty', PlaneErrorCode.UNEXPECTED_RESPONSE);
  }

  return {
    serverUrl: serverUrl.trim(),
    token: token.trim(),
  };
}
