import { UrlProtocol } from './enums/url-protocol.enum';
import { cspImgSrc, isAllowedUrlProtocol } from './url-protocol';

describe('url-protocol', () => {
  it('allows http and https', () => {
    expect(isAllowedUrlProtocol(UrlProtocol.HTTPS)).toBe(true);
    expect(isAllowedUrlProtocol('ftp:')).toBe(false);
  });

  it('returns self for CSP img-src', () => {
    expect(cspImgSrc()).toBe("'self'");
  });
});
