import { PlaneServerPresetId } from '../utils/enums/plane-server-preset-id.enum';

export interface PlaneServerPreset {
  readonly id: PlaneServerPresetId;
  readonly label: string;
  readonly url: string;
}

export const PLANE_SERVER_PRESETS: readonly PlaneServerPreset[] = [{ id: PlaneServerPresetId.CLOUD, label: 'Plane Cloud', url: 'https://app.plane.so' }];

export function selectedServerPresetId(serverUrl: string): PlaneServerPresetId {
  const match = PLANE_SERVER_PRESETS.find((preset) => preset.url === serverUrl);
  return match?.id ?? PlaneServerPresetId.CUSTOM;
}
