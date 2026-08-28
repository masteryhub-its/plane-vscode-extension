import { isPlaneError } from './plane-error';

const REDACTED_BEARER = 'Bearer [redacted]';
const REDACTED_API_KEY = '[redacted-token]';

function redactSensitiveText(message: string): string {
  return message
    .replace(/\bBearer\s+\S+/giu, REDACTED_BEARER)
    .replace(/\bplane_api_[A-Za-z0-9_-]+/giu, REDACTED_API_KEY)
    .replace(/\bX-API-Key:\s*\S+/giu, 'X-API-Key: [redacted]')
    .replace(/\bcookie=[^;\s]+/giu, 'cookie=[redacted]')
    .replace(/\bpassword=[^&\s]+/giu, 'password=[redacted]')
    .replace(/("password"\s*:\s*")[^"]+/giu, '$1[redacted]');
}

export function formatPlaneError(error: unknown): string {
  if (isPlaneError(error)) {
    return redactSensitiveText(error.message);
  }
  if (error instanceof Error) {
    return redactSensitiveText(error.message);
  }
  return 'Unexpected Plane error';
}
