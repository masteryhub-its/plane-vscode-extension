import { renderIssueLoadingHtml } from './render-issue-loading-html';

describe('renderIssueLoadingHtml', () => {
  const html = renderIssueLoadingHtml({ title: 'ENG-12 <x>', nonce: 'abc', cspSource: 'vscode-webview://t' });

  it('shows placeholders instead of an empty panel, and says it is loading', () => {
    expect(html).toContain('class="skeleton title"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Loading');
  });

  it('escapes the title and runs no script', () => {
    expect(html).toContain('ENG-12 &lt;x&gt;');
    expect(html).not.toContain('<script');
  });
});
