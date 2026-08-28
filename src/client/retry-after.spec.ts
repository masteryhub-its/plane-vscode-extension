import { retryAfterMessage } from './retry-after';

describe('retryAfterMessage', () => {
  it('uses Retry-After seconds when present', () => {
    expect(retryAfterMessage(new Map([['retry-after', '12']]))).toBe('Plane rate limit reached. Try again in 12 seconds.');
  });

  it('falls back when the header is missing', () => {
    expect(retryAfterMessage(new Map())).toBe('Plane rate limit reached. Try again in a minute.');
  });
});
