import { resolveIssueDescriptionHtml } from './description-html';

describe('resolveIssueDescriptionHtml', () => {
  it('prefers description_html when present', () => {
    expect(resolveIssueDescriptionHtml('<p>Html</p>', 'plain')).toBe('<p>Html</p>');
  });

  it('falls back to escaped plain text paragraphs', () => {
    expect(resolveIssueDescriptionHtml('', 'Line 1\nLine 2 <script>')).toBe('<p>Line 1<br>Line 2 &lt;script&gt;</p>');
  });

  it('returns empty when both are blank', () => {
    expect(resolveIssueDescriptionHtml('  ', '')).toBe('');
  });
});
