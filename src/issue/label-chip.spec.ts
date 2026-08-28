import { safeLabelColor } from './label-chip';

describe('safeLabelColor', () => {
  it('accepts hex colors', () => {
    expect(safeLabelColor('#ff0000')).toBe('#ff0000');
    expect(safeLabelColor('#abc')).toBe('#abc');
  });

  it('rejects non-hex values so they cannot break inline styles', () => {
    expect(safeLabelColor('red')).toBeUndefined();
    expect(safeLabelColor('url(javascript:alert(1))')).toBeUndefined();
  });
});
