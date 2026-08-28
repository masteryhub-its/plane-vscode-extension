const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u;

export function safeLabelColor(color: string): string | undefined {
  return HEX_COLOR.test(color) ? color : undefined;
}
