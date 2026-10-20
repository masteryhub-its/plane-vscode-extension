import { priorityIconSvg, stateIconSvg } from './icons';

describe('inline icons', () => {
  it.each(['backlog', 'unstarted', 'started', 'completed', 'cancelled', undefined, 'custom'])('draws a state icon for %s', (group) => {
    const svg = stateIconSvg(group);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('currentColor');
    expect(svg).not.toMatch(/<script|on\w+=|javascript:/iu);
  });

  it('draws different shapes for different groups', () => {
    expect(stateIconSvg('started')).not.toBe(stateIconSvg('completed'));
    expect(stateIconSvg('backlog')).not.toBe(stateIconSvg('unstarted'));
  });

  it.each(['urgent', 'high', 'medium', 'low', 'none', '', 'weird'])('draws a priority icon for %j', (priority) => {
    const svg = priorityIconSvg(priority);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('aria-hidden="true"');
  });

  it('fills more bars as priority rises', () => {
    const filled = (priority: string): number => (priorityIconSvg(priority).match(/opacity="1"/gu) ?? []).length;
    expect(filled('low')).toBe(1);
    expect(filled('medium')).toBe(2);
    expect(filled('high')).toBe(3);
  });
});
