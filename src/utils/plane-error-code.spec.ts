import { PlaneErrorCode } from './enums/plane-error-code.enum';
import { parsePlaneErrorCode } from './plane-error-code';

describe('plane-error-code', () => {
  it('parses known codes', () => {
    expect(parsePlaneErrorCode(PlaneErrorCode.NOT_SIGNED_IN)).toBe(PlaneErrorCode.NOT_SIGNED_IN);
  });
});
