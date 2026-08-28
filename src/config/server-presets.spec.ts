import { DEFAULT_SERVER_URL } from '../constants';
import { PlaneServerPresetId } from '../utils/enums/plane-server-preset-id.enum';
import { PLANE_SERVER_PRESETS, selectedServerPresetId } from './server-presets';

describe('server-presets', () => {
  it('includes MasteryHub default', () => {
    expect(PLANE_SERVER_PRESETS.some((preset) => preset.url === DEFAULT_SERVER_URL)).toBe(true);
  });

  it('detects custom server', () => {
    expect(selectedServerPresetId('https://custom.test')).toBe(PlaneServerPresetId.CUSTOM);
  });
});
