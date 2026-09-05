import { upsertPlaneKeysInMcpEnv } from './mcp-env';

describe('upsertPlaneKeysInMcpEnv', () => {
  it('replaces an existing PLANE_API_KEY line without quotes', () => {
    const input = 'GITLAB_TOKEN=x\nPLANE_API_KEY=plane_api_old\nPLANE_BASE_URL=https://plane.example.com\n';
    const out = upsertPlaneKeysInMcpEnv(input, {
      apiKey: 'plane_api_new',
      baseUrl: 'https://plane.example.com',
      workspaceSlug: 'masteryhub-its',
    });
    expect(out).toContain('PLANE_API_KEY=plane_api_new\n');
    expect(out).not.toContain('plane_api_old');
    expect(out).toContain('PLANE_WORKSPACE_SLUG=masteryhub-its\n');
  });

  it('appends missing Plane keys', () => {
    const out = upsertPlaneKeysInMcpEnv('FOO=1\n', {
      apiKey: 'plane_api_abc',
      baseUrl: 'https://plane.masteryhub-its.com',
      workspaceSlug: 'masteryhub-its',
    });
    expect(out).toContain('FOO=1\n');
    expect(out).toContain('PLANE_API_KEY=plane_api_abc\n');
    expect(out).toContain('PLANE_BASE_URL=https://plane.masteryhub-its.com\n');
    expect(out).toContain('PLANE_WORKSPACE_SLUG=masteryhub-its\n');
  });

  it('strips quotes from Plane values when rewriting', () => {
    const input = 'PLANE_API_KEY="plane_api_old"\nPLANE_BASE_URL=\'https://plane.example.com\'\n';
    const out = upsertPlaneKeysInMcpEnv(input, {
      apiKey: 'plane_api_new',
      baseUrl: 'https://plane.example.com',
      workspaceSlug: 'ws',
    });
    expect(out).toMatch(/^PLANE_API_KEY=plane_api_new$/m);
    expect(out).toMatch(/^PLANE_BASE_URL=https:\/\/plane\.example\.com$/m);
  });
});
