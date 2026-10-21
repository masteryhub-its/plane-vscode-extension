export interface PlaneSettings {
  readonly serverUrl: string;
  readonly defaultWorkspaceSlug: string | undefined;
  readonly defaultProjectId: string | undefined;
  readonly showAssignedBadge: boolean;
  readonly mcpEnvPath: string | undefined;
}

export interface RawPlaneSettings {
  readonly serverUrl: string;
  readonly defaultWorkspaceSlug: string;
  readonly defaultProjectId: string;
  readonly showAssignedBadge: boolean;
  readonly mcpEnvPath?: string;
}

export interface SettingsReader {
  read(): PlaneSettings;
}

export interface SettingsWriter {
  writeServerUrl(serverUrl: string): Promise<void>;
  writeDefaultWorkspaceSlug(slug: string): Promise<void>;
}

export interface SettingsStore extends SettingsReader, SettingsWriter {}

export interface SecretStore {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}
