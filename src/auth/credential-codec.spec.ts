import { deserializeBoundCredential, serializeBoundCredential } from './credential-codec';
import { PlaneError } from '../errors/plane-error';

describe('credential-codec', () => {
  it('round-trips bound credentials', () => {
    const raw = serializeBoundCredential({ serverUrl: 'https://plane.test', token: 'plane_api_abc' });
    expect(deserializeBoundCredential(raw)).toEqual({ serverUrl: 'https://plane.test', token: 'plane_api_abc' });
  });

  it('rejects malformed JSON', () => {
    expect(() => deserializeBoundCredential('not-json')).toThrow(PlaneError);
  });

  it('rejects missing token', () => {
    expect(() => deserializeBoundCredential(JSON.stringify({ serverUrl: 'https://plane.test' }))).toThrow(PlaneError);
  });
});
