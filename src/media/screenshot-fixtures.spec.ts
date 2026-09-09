import { renderIssuePreviewHtml } from '../issue/render-issue-html';
import { renderSidebarHtml } from '../sidebar/sidebar-html';
import { MarketplaceShotName } from '../utils/enums/marketplace-shot-name.enum';
import { previewIssueHtmlInput, signedInSidebarHtmlInput, signedOutSidebarHtmlInput } from './screenshot-fixtures';
import { wrapMarketplaceFrame } from './screenshot-frame';

describe('marketplace screenshot fixtures', () => {
  it('renders a signed-in sidebar with my issues on Plane Cloud', () => {
    const html = renderSidebarHtml(signedInSidebarHtmlInput());
    expect(html).toContain('Fix login timeout');
    expect(html).toContain('My issues');
    expect(html).toContain('https://app.plane.so');
    expect(html).not.toContain('plane.example.com');
  });

  it('renders a sign-in form for the signed-out shot', () => {
    const html = renderSidebarHtml(signedOutSidebarHtmlInput());
    expect(html).toContain('Sign in');
    expect(html).toContain('https://app.plane.so');
  });

  it('renders an issue preview with comments and attachments', () => {
    const html = renderIssuePreviewHtml(previewIssueHtmlInput());
    expect(html).toContain('ENG-12');
    expect(html).toContain('Fix login timeout');
    expect(html).toContain('Comments');
    expect(html).toContain('spec.pdf');
  });

  it('wraps the real webview HTML in an editor chrome', () => {
    const html = wrapMarketplaceFrame({
      kind: MarketplaceShotName.SIDEBAR,
      sidebarHtml: renderSidebarHtml(signedInSidebarHtmlInput()),
      previewHtml: undefined,
    });
    expect(html).toContain('Activity Bar');
    expect(html).toContain('Fix login timeout');
    expect(html).toContain('Visual Studio Code');
  });
});
