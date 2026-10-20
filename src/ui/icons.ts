const OPEN = '<svg class="icon" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">';
const CLOSE = '</svg>';

const STATE_SHAPES: ReadonlyMap<string, string> = new Map([
  ['backlog', '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.2 2.2"/>'],
  ['unstarted', '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.4"/>'],
  ['started', '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 4.2a3.8 3.8 0 0 1 0 7.6z" fill="currentColor"/>'],
  [
    'completed',
    '<circle cx="8" cy="8" r="6" fill="currentColor"/><path d="m5.2 8.2 2 2 3.6-4" fill="none" stroke="var(--vscode-editor-background)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
  ],
  [
    'cancelled',
    '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="m5.6 5.6 4.8 4.8M10.4 5.6l-4.8 4.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  ],
]);

/** A small shape per state group, drawn in the current text colour so it follows the theme. */
export function stateIconSvg(group: string | undefined): string {
  const shape = (group === undefined ? undefined : STATE_SHAPES.get(group)) ?? STATE_SHAPES.get('unstarted') ?? '';
  return `${OPEN}${shape}${CLOSE}`;
}

const BAR_COUNT: ReadonlyMap<string, number> = new Map([
  ['low', 1],
  ['medium', 2],
  ['high', 3],
]);

/** Three bars filled by priority, or a marked square for urgent. */
export function priorityIconSvg(priority: string): string {
  if (priority === 'urgent') {
    return `${OPEN}<rect x="2.5" y="2.5" width="11" height="11" rx="2.5" fill="currentColor"/><path d="M8 5v3.6M8 10.6v.1" stroke="var(--vscode-editor-background)" stroke-width="1.5" stroke-linecap="round"/>${CLOSE}`;
  }
  const filled = BAR_COUNT.get(priority) ?? 0;
  const bar = (index: number, x: number, y: number, height: number): string =>
    `<rect x="${x}" y="${y}" width="2.4" height="${height}" rx=".6" fill="currentColor" opacity="${index < filled ? '1' : '.3'}"/>`;
  return `${OPEN}${bar(0, 3, 9, 4)}${bar(1, 6.8, 6, 7)}${bar(2, 10.6, 3, 10)}${CLOSE}`;
}
