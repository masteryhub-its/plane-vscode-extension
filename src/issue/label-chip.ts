const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u;

export function safeLabelColor(color: string): string | undefined {
  return HEX_COLOR.test(color) ? color : undefined;
}

function channel(hex: string, start: number): number {
  const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Black or white, whichever reads better on a label's own background colour (WCAG relative luminance). */
export function readableTextColor(background: string): '#000000' | '#ffffff' {
  const safe = safeLabelColor(background);
  if (safe === undefined) {
    return '#ffffff';
  }
  const digits = safe.slice(1);
  const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join('') : digits.slice(0, 6);
  const luminance = 0.2126 * channel(full, 0) + 0.7152 * channel(full, 2) + 0.0722 * channel(full, 4);
  return luminance > 0.179 ? '#000000' : '#ffffff';
}
