import { renderPanelErrorHtml } from './render-panel-error-html';

describe('renderPanelErrorHtml', () => {
  const html = renderPanelErrorHtml({ title: 'MH-9 <b>', message: 'Plane request failed <img src=x onerror=alert(1)>', nonce: 'abc123', cspSource: 'vscode-webview://test' });

  it('escapes the title and the message', () => {
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('MH-9 &lt;b&gt;');
  });

  it('offers a Retry button that posts a retry message', () => {
    expect(html).toContain('id="retry"');
    expect(html).toContain("type: 'retry'");
  });

  it('allows only the nonce script and forbids base and form targets', () => {
    expect(html).toContain("script-src 'nonce-abc123'");
    expect(html).toContain("base-uri 'none'");
    expect(html).toContain("form-action 'none'");
    expect(html).toContain("default-src 'none'");
  });
});
