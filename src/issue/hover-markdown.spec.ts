import { hoverMarkdownForText } from './hover-markdown';

describe('hoverMarkdownForText', () => {
  const catalog = [
    { projectIdentifier: 'MH', sequenceId: 42, name: 'Fix login' },
    { projectIdentifier: 'MH', sequenceId: 7, name: 'Docs' },
  ];

  it('returns a markdown hover for the first matching issue key', () => {
    expect(hoverMarkdownForText('See MH-42 in review', catalog)).toBe('**MH-42** Fix login');
  });

  it('returns undefined when no catalog match exists', () => {
    expect(hoverMarkdownForText('See AC-1', catalog)).toBeUndefined();
  });
});
