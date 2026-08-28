import { sanitizeIssueHtml } from './sanitize-html';

describe('sanitizeIssueHtml', () => {
  it('strips script tags, event handlers, and javascript urls', () => {
    expect(sanitizeIssueHtml('<p onclick="x">Hi <script>alert(1)</script><a href="javascript:alert(1)">x</a></p>')).toBe('<p>Hi <a href="">x</a></p>');
  });
});
