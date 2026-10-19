import { upsertPlaneKeysInMcpEnv } from './mcp-env';

describe('upsertPlaneKeysInMcpEnv', () => {
  it('replaces an existing PLANE_API_KEY line without quotes', () => {
    const input = 'GITLAB_TOKEN=x\nPLANE_API_KEY=plane_api_old\nPLANE_BASE_URL=https://plane.example.com\n';
    const out = upsertPlaneKeysInMcpEnv(input, {
      apiKey: 'plane_api_new',
      baseUrl: 'https://plane.example.com',
      workspaceSlug: 'acme',
    });
    expect(out).toContain('PLANE_API_KEY=plane_api_new\n');
    expect(out).not.toContain('plane_api_old');
    expect(out).toContain('PLANE_WORKSPACE_SLUG=acme\n');
  });

  it('appends missing Plane keys', () => {
    const out = upsertPlaneKeysInMcpEnv('FOO=1\n', {
      apiKey: 'plane_api_abc',
      baseUrl: 'https://plane.example.com',
      workspaceSlug: 'acme',
    });
    expect(out).toContain('FOO=1\n');
    expect(out).toContain('PLANE_API_KEY=plane_api_abc\n');
    expect(out).toContain('PLANE_BASE_URL=https://plane.example.com\n');
    expect(out).toContain('PLANE_WORKSPACE_SLUG=acme\n');
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

  it('writes values containing $-sequences literally', () => {
    const input = 'PLANE_API_KEY=plane_api_old\n';
    const out = upsertPlaneKeysInMcpEnv(input, {
      apiKey: 'pl$&abc$1x$`tail',
      baseUrl: 'https://plane.example.com',
      workspaceSlug: 'ws',
    });
    expect(out).toContain('PLANE_API_KEY=pl$&abc$1x$`tail\n');
  });

  it.each([
    ['apiKey', { apiKey: 'tok\nNODE_OPTIONS=--require /tmp/x.js', baseUrl: 'https://plane.example.com', workspaceSlug: 'ws' }],
    ['baseUrl', { apiKey: 'tok', baseUrl: 'https://plane.example.com\rEVIL=1', workspaceSlug: 'ws' }],
    ['workspaceSlug', { apiKey: 'tok', baseUrl: 'https://plane.example.com', workspaceSlug: 'ws\nEVIL=1' }],
  ])('refuses a %s value that spans lines', (_name, keys) => {
    expect(() => upsertPlaneKeysInMcpEnv('', keys)).toThrow('single line');
  });
});
