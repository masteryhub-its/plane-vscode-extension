import { isAllowedHttpUrl } from './allowed-http-url';

describe('allowed-http-url', () => {
  it('accepts https URLs', () => {
    expect(isAllowedHttpUrl('https://plane.test/issue')).toBe(true);
  });

  it('rejects javascript URLs', () => {
    expect(isAllowedHttpUrl('javascript:alert(1)')).toBe(false);
  });
});
