import { credentialHeaders } from './credential-headers';

describe('credentialHeaders', () => {
  it('sets X-API-Key header', () => {
    expect(credentialHeaders('plane_api_secret')).toEqual({ 'X-API-Key': 'plane_api_secret' });
  });
});
