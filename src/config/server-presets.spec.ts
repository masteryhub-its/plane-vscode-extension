import { PlaneServerPresetId } from '../utils/enums/plane-server-preset-id.enum';
import { PLANE_SERVER_PRESETS, selectedServerPresetId } from './server-presets';

describe('server-presets', () => {
  it('includes Plane Cloud', () => {
    expect(PLANE_SERVER_PRESETS.some((preset) => preset.url === 'https://app.plane.so')).toBe(true);
  });

  it('detects custom server', () => {
    expect(selectedServerPresetId('https://custom.test')).toBe(PlaneServerPresetId.CUSTOM);
  });
});
