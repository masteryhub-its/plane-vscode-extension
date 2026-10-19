import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { exportPatToMcpEnv, mcpEnvWritePreview, resolveMcpEnvPath } from './export-pat-to-mcp-env';
import type { AuthService } from './auth-service';
import type { SettingsReader } from '../config/settings.types';

function fakeAuth(token: string): AuthService {
  return {
    readToken: () => Promise.resolve(token),
    createClient: () => ({
      currentUser: () => Promise.resolve({ id: 'u1', email: 'dev@example.com', displayName: 'Dev' }),
    }),
  } as unknown as AuthService;
}

function fixedSettings(serverUrl: string, workspaceSlug = 'acme'): SettingsReader {
  return {
    read: () => ({ serverUrl, defaultWorkspaceSlug: workspaceSlug.trim().length === 0 ? undefined : workspaceSlug, defaultProjectId: undefined, showAssignedBadge: false, mcpEnvPath: undefined }),
  };
}

describe('exportPatToMcpEnv', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'plane-mcp-env-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('writes plane keys and sets 0600 permissions on a pre-existing file', async () => {
    const envPath = path.join(tmpDir, 'mcp.env');
    await fs.writeFile(envPath, 'OTHER=1\n', { mode: 0o644 });
    const result = await exportPatToMcpEnv({
      auth: fakeAuth('pl$&abc$1x'),
      settings: fixedSettings('https://plane.example.com/'),
      envPath,
    });
    expect(result.envPath).toBe(envPath);
    const body = await fs.readFile(envPath, 'utf8');
    expect(body).toContain('PLANE_API_KEY=pl$&abc$1x\n');
    expect(body).toContain('PLANE_BASE_URL=https://plane.example.com\n');
    expect(body).toContain('PLANE_WORKSPACE_SLUG=acme\n');
    const stats = await fs.stat(envPath);
    expect(stats.mode & 0o777).toBe(0o600);
  });

  it('throws when not signed in', async () => {
    const auth = { readToken: () => Promise.resolve(undefined) } as unknown as AuthService;
    await expect(exportPatToMcpEnv({ auth, settings: fixedSettings('https://plane.example.com'), envPath: path.join(tmpDir, 'mcp.env') })).rejects.toThrow('Sign in to Plane first');
  });

  it('throws when defaultWorkspaceSlug is missing', async () => {
    await expect(exportPatToMcpEnv({ auth: fakeAuth('tok'), settings: fixedSettings('https://plane.example.com', ''), envPath: path.join(tmpDir, 'mcp.env') })).rejects.toThrow(
      'plane.defaultWorkspaceSlug'
    );
  });

  it('refuses a workspace slug that could inject extra env lines', async () => {
    const envPath = path.join(tmpDir, 'mcp.env');
    await expect(exportPatToMcpEnv({ auth: fakeAuth('tok'), settings: fixedSettings('https://plane.example.com', 'x\nNODE_OPTIONS=--require /tmp/evil.js'), envPath })).rejects.toThrow(
      'workspace slug'
    );
    await expect(fs.stat(envPath)).rejects.toThrow();
  });
});

describe('resolveMcpEnvPath', () => {
  it('uses the default path when unset', () => {
    expect(resolveMcpEnvPath(undefined, '/home/dev')).toBe(path.join('/home/dev', '.config', 'masteryhub', 'mcp.env'));
    expect(resolveMcpEnvPath('  ', '/home/dev')).toBe(path.join('/home/dev', '.config', 'masteryhub', 'mcp.env'));
  });

  it('expands a leading ~', () => {
    expect(resolveMcpEnvPath('~/.config/tools/mcp.env', '/home/dev')).toBe(path.join('/home/dev', '.config/tools/mcp.env'));
  });

  it('keeps an absolute path', () => {
    expect(resolveMcpEnvPath('/etc/tools/mcp.env', '/home/dev')).toBe('/etc/tools/mcp.env');
  });

  it('rejects a relative path', () => {
    expect(() => resolveMcpEnvPath('mcp.env', '/home/dev')).toThrow('absolute');
    expect(() => resolveMcpEnvPath('../mcp.env', '/home/dev')).toThrow('absolute');
  });
});

describe('mcpEnvWritePreview', () => {
  it('lists exactly the lines that will be written, hiding the token', () => {
    const preview = mcpEnvWritePreview(
      { serverUrl: 'https://plane.example.com/', defaultWorkspaceSlug: 'acme', defaultProjectId: undefined, showAssignedBadge: false, mcpEnvPath: '/etc/tools/mcp.env' },
      '/home/dev'
    );
    expect(preview.envPath).toBe('/etc/tools/mcp.env');
    expect(preview.lines).toEqual(['PLANE_API_KEY=<your token>', 'PLANE_BASE_URL=https://plane.example.com', 'PLANE_WORKSPACE_SLUG=acme']);
  });

  it('throws when the workspace slug is missing', () => {
    expect(() =>
      mcpEnvWritePreview({ serverUrl: 'https://plane.example.com', defaultWorkspaceSlug: undefined, defaultProjectId: undefined, showAssignedBadge: false, mcpEnvPath: undefined }, '/home/dev')
    ).toThrow('plane.defaultWorkspaceSlug');
  });
});
