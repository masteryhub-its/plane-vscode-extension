import { escapeHtml } from '../sidebar/escape-html';
import { MarketplaceShotName } from '../utils/enums/marketplace-shot-name.enum';
import { SCREENSHOT_HOVER_ISSUE_ID } from './screenshot-fixtures';
import { VSCODE_DARK_THEME_CSS } from './screenshot-theme';

export const MARKETPLACE_SHOT_WIDTH = 1280;
export const MARKETPLACE_SHOT_HEIGHT = 800;

export interface MarketplaceFrameInput {
  readonly kind: MarketplaceShotName;
  readonly sidebarHtml: string;
  readonly previewHtml: string | undefined;
}

interface ParsedWebview {
  readonly styles: string;
  readonly body: string;
}

function stripScripts(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

function parseWebview(html: string): ParsedWebview {
  const styleMatch = /<style>([\s\S]*?)<\/style>/i.exec(html);
  const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  return {
    styles: styleMatch?.[1] ?? '',
    body: stripScripts(bodyMatch?.[1] ?? ''),
  };
}

function activityIcon(): string {
  return `<svg class="activity-logo" viewBox="0 0 85 52" aria-hidden="true"><path fill="currentColor" d="M44.3223 2.9264C44.3223 0.754665 46.6083 -0.65811 48.5508 0.313121L80.4551 16.2653C82.9294 17.5024 84.4922 20.0321 84.4922 22.7985V48.2487C84.4922 50.4204 82.2071 51.833 80.2646 50.8619L62.3281 41.8932V22.7975C62.3281 20.0311 60.7653 17.5015 58.291 16.2643L44.3223 9.27992V2.9264ZM0 2.92543C8.01645e-05 0.753753 2.28609 -0.659069 4.22852 0.312144L22.1582 9.27699V28.3766C22.1582 31.1428 23.7213 33.6716 26.1953 34.9088L40.1699 41.8952V48.2487C40.1697 50.4202 37.8847 51.832 35.9424 50.861L4.03711 34.9088C1.56305 33.6716 0 31.1428 0 28.3766V2.92543ZM22.1582 2.92543C22.1583 0.753753 24.4443 -0.659069 26.3867 0.312144L44.3223 9.27992V28.3776C44.3223 31.1439 45.8861 33.6727 48.3604 34.9098L62.3281 41.8932V48.2487C62.3279 50.4202 60.0429 51.832 58.1006 50.861L40.1699 41.8952V22.7975C40.1699 20.0311 38.6071 17.5015 36.1328 16.2643L22.1582 9.27699V2.92543Z"/></svg>`;
}

function editorPlaceholder(): string {
  return `
    <main class="editor">
      <div class="tabs"><span class="tab active">extension.ts</span></div>
      <pre class="code"><span class="kw">export</span> <span class="kw">function</span> <span class="fn">activate</span>() {
  <span class="cm">// Plane lives in the activity bar</span>
}</pre>
    </main>`;
}

function previewPane(preview: ParsedWebview): string {
  return `
    <main class="editor preview-host">
      <div class="tabs"><span class="tab active">ENG-12</span></div>
      <div class="preview-scroll">
        <style>${preview.styles}</style>
        ${preview.body}
      </div>
    </main>`;
}

export function wrapMarketplaceFrame(input: MarketplaceFrameInput): string {
  const sidebar = parseWebview(input.sidebarHtml);
  const preview = input.previewHtml === undefined ? undefined : parseWebview(input.previewHtml);
  const isPreview = input.kind === MarketplaceShotName.PREVIEW;
  const title = input.kind === MarketplaceShotName.SIGN_IN ? 'Sign in to Plane' : 'Plane by MasteryHub';
  const main = isPreview && preview !== undefined ? previewPane(preview) : editorPlaceholder();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${VSCODE_DARK_THEME_CSS}
    html, body { margin: 0; height: 100%; background: #1f1f1f; font-family: var(--vscode-font-family); overflow: hidden; }
    .chrome { display: flex; flex-direction: column; height: 100%; color: #cccccc; }
    .titlebar { height: 36px; display: flex; align-items: center; padding: 0 14px; background: #181818; border-bottom: 1px solid #2b2b2b; font-size: 12px; }
    .workbench { flex: 1; display: flex; min-height: 0; }
    .activity { width: 48px; background: #181818; border-right: 1px solid #2b2b2b; display: flex; flex-direction: column; align-items: center; padding-top: 12px; gap: 16px; }
    .activity-logo { width: 26px; height: 16px; fill: #cccccc; color: #cccccc; }
    .activity-dot { width: 22px; height: 22px; border-radius: 4px; background: #2b2b2b; }
    .sidebar { width: ${isPreview ? '300px' : '380px'}; background: var(--vscode-sideBar-background); border-right: 1px solid #2b2b2b; overflow: auto; }
    .sidebar .webview { min-height: 100%; }
    .editor { flex: 1; background: var(--vscode-editor-background); display: flex; flex-direction: column; min-width: 0; }
    .tabs { height: 35px; display: flex; align-items: stretch; background: #181818; border-bottom: 1px solid #2b2b2b; }
    .tab { display: flex; align-items: center; padding: 0 16px; font-size: 12px; background: #1e1e1e; border-right: 1px solid #2b2b2b; }
    .code { margin: 24px; font-family: var(--vscode-editor-font-family); font-size: 13px; line-height: 1.6; color: #d4d4d4; }
    .kw { color: #569cd6; }
    .fn { color: #dcdcaa; }
    .cm { color: #6a9955; }
    .preview-host { background: var(--vscode-editor-background); }
    .preview-scroll { flex: 1; overflow: auto; }
    .issue:has([data-issue="${SCREENSHOT_HOVER_ISSUE_ID}"]) .issue-open { background: var(--vscode-list-hoverBackground); }
    .sidebar .brand { margin-bottom: 8px; }
    .sidebar .card { padding: 8px; margin-bottom: 8px; }
    .sidebar button { margin-top: 6px; }
    .sidebar .actions { gap: 4px; }
    .sidebar .actions button { min-width: 80px; }
    .sidebar h2 { margin: 6px 0; }
    ${sidebar.styles}
  </style>
</head>
<body>
  <div class="chrome">
    <header class="titlebar">${escapeHtml(title)} — Visual Studio Code</header>
    <div class="workbench">
      <nav class="activity" aria-label="Activity Bar">${activityIcon()}<span class="activity-dot"></span><span class="activity-dot"></span></nav>
      <aside class="sidebar"><div class="webview">${sidebar.body}</div></aside>
      ${main}
    </div>
  </div>
</body>
</html>`;
}
