import { PlaneError, PlaneErrorCode } from './plane-error';
import { formatPlaneError } from './format-error';

describe('formatPlaneError', () => {
  it('uses PlaneError.message', () => {
    expect(formatPlaneError(new PlaneError('boom', PlaneErrorCode.HTTP_ERROR))).toBe('boom');
  });

  it('redacts plane_api tokens and bearer headers', () => {
    expect(formatPlaneError(new Error('Bearer plane_api_live_abc failed'))).toBe('Bearer [redacted] failed');
    expect(formatPlaneError(new Error('token plane_api_live_abc expired'))).toBe('token [redacted-token] expired');
    expect(formatPlaneError(new Error('sign-in failed password=secret'))).toBe('sign-in failed password=[redacted]');
  });

  it('falls back for unknown values', () => {
    expect(formatPlaneError(42)).toBe('Unexpected Plane error');
  });
});
