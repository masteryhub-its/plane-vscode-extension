import { PlaneErrorCode } from '../utils/enums/plane-error-code.enum';
import { isNotSignedInError, PlaneError } from './plane-error';

describe('plane-error', () => {
  it('detects not signed in', () => {
    expect(isNotSignedInError(new PlaneError('Sign in', PlaneErrorCode.NOT_SIGNED_IN))).toBe(true);
    expect(isNotSignedInError(new PlaneError('HTTP', PlaneErrorCode.HTTP_ERROR))).toBe(false);
  });
});
