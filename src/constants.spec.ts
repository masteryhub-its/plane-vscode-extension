import { buildUserAgent } from './constants';

describe('buildUserAgent', () => {
  it('appends the extension version', () => {
    expect(buildUserAgent('1.1.0')).toBe('Plane-VSCode/1.1.0');
    expect(buildUserAgent('1.2.0-pre.1')).toBe('Plane-VSCode/1.2.0-pre.1');
  });

  it('falls back to the bare product token for a missing or odd version', () => {
    expect(buildUserAgent(undefined)).toBe('Plane-VSCode');
    expect(buildUserAgent('')).toBe('Plane-VSCode');
    expect(buildUserAgent('1.0 (evil)\r\nX: y')).toBe('Plane-VSCode');
  });
});
