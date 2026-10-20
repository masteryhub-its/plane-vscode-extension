import { readableTextColor, safeLabelColor } from './label-chip';

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

describe('readableTextColor', () => {
  it.each([
    ['#ffffff', '#000000'],
    ['#fff', '#000000'],
    ['#ffeb3b', '#000000'],
    ['#000000', '#ffffff'],
    ['#1a237e', '#ffffff'],
    ['#d9534f', '#000000'],
    ['#ff000080', '#000000'],
  ])('picks readable text for %s', (background, expected) => {
    expect(readableTextColor(background)).toBe(expected);
  });

  it('falls back to light text for a value that is not a hex colour', () => {
    expect(readableTextColor('red')).toBe('#ffffff');
  });
});
