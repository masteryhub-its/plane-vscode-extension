import { renderDocumentShell } from './document-shell';

describe('renderDocumentShell', () => {
  const html = renderDocumentShell({ title: 'ENG-1 <x>', nonce: 'n0nce', cspSource: 'vscode-webview://abc', body: '<p>hello</p>', script: "console.log('hi')" });

  it('escapes the title', () => {
    expect(html).toContain('<title>ENG-1 &lt;x&gt;</title>');
  });

  it('forbids everything except the nonce script, the webview styles and webview images', () => {
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src 'nonce-n0nce'");
    expect(html).toContain('style-src vscode-webview://abc');
    expect(html).toContain('img-src vscode-webview://abc;');
    expect(html).toContain("base-uri 'none'");
    expect(html).toContain("form-action 'none'");
  });

  it('puts the body and the nonce-tagged script in the page', () => {
    expect(html).toContain('<p>hello</p>');
    expect(html).toContain('<script nonce="n0nce">');
    expect(html).toContain("console.log('hi')");
  });

  it('omits the script tag when there is no script', () => {
    expect(renderDocumentShell({ title: 't', nonce: 'n', cspSource: 'c', body: '' })).not.toContain('<script');
  });

  it('includes the shared stylesheet', () => {
    expect(html).toContain('var(--vscode-foreground)');
  });
});
