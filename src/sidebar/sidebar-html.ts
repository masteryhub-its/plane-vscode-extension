import { PLANE_SERVER_PRESETS, selectedServerPresetId } from '../config/server-presets';
import { myIssuesFromCatalog } from '../issue/my-issues';
import { PlaneServerPresetId } from '../utils/enums/plane-server-preset-id.enum';
import { SidebarMessageType } from '../utils/enums/sidebar-message-type.enum';
import { SidebarStatus } from '../utils/enums/sidebar-status.enum';
import { escapeHtml } from './escape-html';
import { filterSidebarCatalog } from './filter-catalog';
import type { SidebarHtmlInput, LoadingSidebarState, SignedInSidebarState, SignedOutSidebarState } from './sidebar.types';

const PLANE_LOGO_SVG = `<svg class="logo" viewBox="0 0 85 52" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M44.3223 2.9264C44.3223 0.754665 46.6083 -0.65811 48.5508 0.313121L80.4551 16.2653C82.9294 17.5024 84.4922 20.0321 84.4922 22.7985V48.2487C84.4922 50.4204 82.2071 51.833 80.2646 50.8619L62.3281 41.8932V22.7975C62.3281 20.0311 60.7653 17.5015 58.291 16.2643L44.3223 9.27992V2.9264ZM0 2.92543C8.01645e-05 0.753753 2.28609 -0.659069 4.22852 0.312144L22.1582 9.27699V28.3766C22.1582 31.1428 23.7213 33.6716 26.1953 34.9088L40.1699 41.8952V48.2487C40.1697 50.4202 37.8847 51.832 35.9424 50.861L4.03711 34.9088C1.56305 33.6716 0 31.1428 0 28.3766V2.92543ZM22.1582 2.92543C22.1583 0.753753 24.4443 -0.659069 26.3867 0.312144L44.3223 9.27992V28.3776C44.3223 31.1439 45.8861 33.6727 48.3604 34.9098L62.3281 41.8932V48.2487C62.3279 50.4202 60.0429 51.832 58.1006 50.861L40.1699 41.8952V22.7975C40.1699 20.0311 38.6071 17.5015 36.1328 16.2643L22.1582 9.27699V2.92543Z"/>
</svg>`;

export function renderSidebarHtml(input: SidebarHtmlInput): string {
  const { state, nonce, cspSource } = input;
  const body = state.status === SidebarStatus.SIGNED_OUT ? renderSignedOut(state) : state.status === SidebarStatus.LOADING ? renderLoading(state) : renderSignedIn(state);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource}; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Plane</title>
  <style>${SIDEBAR_CSS}</style>
</head>
<body>
  ${body}
  <script nonce="${nonce}">${SIDEBAR_SCRIPT}</script>
</body>
</html>`;
}

function renderBrand(): string {
  return `
  <header class="brand">
    ${PLANE_LOGO_SVG}
    <div>
      <h1>Plane</h1>
      <p class="muted">Issues in your editor</p>
    </div>
  </header>`;
}

function renderServerPicker(serverUrl: string, locked: boolean): string {
  const selectedId = selectedServerPresetId(serverUrl);
  const presets = PLANE_SERVER_PRESETS.map((preset) => {
    const selected = preset.id === selectedId ? 'selected' : '';
    return `<option value="${escapeHtml(preset.url)}" ${selected}>${escapeHtml(preset.label)}</option>`;
  }).join('');
  const customSelected = selectedId === PlaneServerPresetId.CUSTOM ? 'selected' : '';
  const disabled = locked ? 'disabled' : '';
  const hint = locked ? 'Sign out to switch servers. Server URL is Global only.' : 'Saved as a Global setting only (workspace/folder overrides are ignored).';
  return `
  <section class="card">
    <h2>Server</h2>
    <label for="server-preset">Instance</label>
    <select id="server-preset" ${disabled}>
      ${presets}
      <option value="${PlaneServerPresetId.CUSTOM}" ${customSelected}>Custom self-hosted</option>
    </select>
    <label for="server-url">Server URL (Global only)</label>
    <input id="server-url" name="serverUrl" type="url" value="${escapeHtml(serverUrl)}" ${disabled} />
    <button type="button" id="save-server" ${disabled}>Save server</button>
    <p class="hint">${hint}</p>
  </section>`;
}

function renderLoading(state: LoadingSidebarState): string {
  return `
  ${renderBrand()}
  <section class="card">
    <h2>Loading Plane</h2>
    <p class="muted">${escapeHtml(state.serverUrl)}</p>
    <p class="hint">Talking to the Plane API. This can take a minute when Cloudflare is slow.</p>
  </section>`;
}

function renderSignedOut(state: SignedOutSidebarState): string {
  const error = state.error === undefined || state.error.length === 0 ? '' : `<p class="error" role="alert">${escapeHtml(state.error)}</p>`;
  const disabled = state.busy ? 'disabled' : '';
  return `
  ${renderBrand()}
  ${error}
  ${renderServerPicker(state.serverUrl, state.busy)}
  <section class="card">
    <h2>Sign in</h2>
    <form id="pat-form">
      <label for="pat">Personal access token</label>
      <input id="pat" name="pat" type="password" autocomplete="off" ${disabled} />
      <button type="submit" class="primary" ${disabled}>Sign in with PAT</button>
    </form>
    <p class="hint">Create a token in Plane → Profile → Personal Access Tokens. Stored in Secret Storage.</p>
  </section>
  ${renderForceReload()}`;
}

function renderSignedIn(state: SignedInSidebarState): string {
  const error = state.error === undefined || state.error.length === 0 ? '' : `<p class="error" role="alert">${escapeHtml(state.error)}</p>`;
  const disabled = state.busy ? 'disabled' : '';
  const synced = state.lastSyncedLabel === undefined || state.lastSyncedLabel.length === 0 ? '' : `<p class="sync-meta">Synced ${escapeHtml(state.lastSyncedLabel)}</p>`;
  const activeFilter = state.savedFilters.find((filter) => filter.id === state.activeFilterId);
  const catalog = filterSidebarCatalog(state.workspaces, activeFilter);
  const myIssues = myIssuesFromCatalog(catalog, state.currentUserId ?? '');
  const filterOptions = [
    `<option value=""${state.activeFilterId === undefined ? ' selected' : ''}>All issues</option>`,
    ...state.savedFilters.map((filter) => {
      const selected = filter.id === state.activeFilterId ? ' selected' : '';
      return `<option value="${escapeHtml(filter.id)}"${selected}>${escapeHtml(filter.name)}</option>`;
    }),
  ].join('');
  const mine =
    myIssues.length === 0
      ? ''
      : `<section class="workspace">
        <h2>My issues <span class="count">${myIssues.length}</span></h2>
        <ul class="issues">${myIssues
          .map(
            (issue) =>
              `<li class="issue" data-title="${escapeHtml(issue.title.toLowerCase())}">
                  <button type="button" class="issue-open" data-workspace="${escapeHtml(issue.workspaceSlug)}" data-project="${escapeHtml(issue.projectId)}" data-issue="${escapeHtml(issue.id)}">
                    <span class="issue-key">${escapeHtml(issue.key)}</span>
                    <span class="issue-title">${escapeHtml(issue.title)}</span>
                    <span class="issue-state">${escapeHtml(issue.stateName)}</span>
                  </button>
                </li>`
          )
          .join('')}</ul>
      </section>`;
  const workspaces = catalog
    .map((workspace) => {
      const projects = workspace.projects
        .map((project) => {
          const issues = project.issues
            .map(
              (issue) =>
                `<li class="issue" data-title="${escapeHtml(issue.title.toLowerCase())}">
                  <button type="button" class="issue-open" data-workspace="${escapeHtml(workspace.slug)}" data-project="${escapeHtml(project.id)}" data-issue="${escapeHtml(issue.id)}">
                    <span class="issue-key">${escapeHtml(issue.key)}</span>
                    <span class="issue-title">${escapeHtml(issue.title)}</span>
                    <span class="issue-state">${escapeHtml(issue.stateName)}</span>
                  </button>
                </li>`
            )
            .join('');
          return `<details class="project" open>
            <summary>${escapeHtml(project.name)} <span class="count">${project.issues.length}</span></summary>
            <ul class="issues">${issues.length === 0 ? '<li class="muted">No issues</li>' : issues}</ul>
          </details>`;
        })
        .join('');
      return `<section class="workspace">
        <h2>${escapeHtml(workspace.label)}</h2>
        ${projects.length === 0 ? '<p class="muted">No projects.</p>' : projects}
      </section>`;
    })
    .join('');

  return `
  ${renderBrand()}
  <section class="card session">
    <div>
      <p class="user-name">${escapeHtml(state.userName)}</p>
      <p class="muted">${escapeHtml(state.serverUrl)} <span class="scope">(Global only)</span></p>
      ${synced}
    </div>
    <div class="actions">
      <button type="button" id="sync" class="primary" ${disabled}>Sync</button>
      <button type="button" id="issue-search" ${disabled}>Search</button>
      <button type="button" id="force-reload">Force reload</button>
      <button type="button" id="sign-out" ${disabled}>Sign out</button>
    </div>
  </section>
  ${error}
  ${renderServerPicker(state.serverUrl, true)}
  <section class="card">
    <h2>Saved filters</h2>
    <label for="saved-filter">Filter</label>
    <select id="saved-filter" ${disabled}>${filterOptions}</select>
    <label for="filter-name">Save current title filter as</label>
    <input id="filter-name" type="text" placeholder="Filter name" ${disabled} />
    <button type="button" id="save-filter" ${disabled}>Save filter</button>
  </section>
  <input id="search" type="search" placeholder="Filter issues" value="${escapeHtml(state.query)}" ${disabled} />
  <div id="results">${mine}${workspaces.length === 0 ? '<p class="muted">No workspaces yet.</p>' : workspaces}</div>`;
}

function renderForceReload(): string {
  return `
  <section class="card">
    <h2>Editor</h2>
    <button type="button" id="force-reload">Force reload</button>
    <p class="hint">Reloads Plane only — sidebar, issues tree, and previews. The rest of the editor stays open.</p>
  </section>`;
}

const SIDEBAR_CSS = `
  :root { color-scheme: light dark; }
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-sideBar-background); margin: 0; padding: 12px; }
  h1 { font-size: 15px; font-weight: 700; margin: 0 0 2px; }
  h2 { font-size: 11px; font-weight: 600; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--vscode-descriptionForeground); }
  .muted, .hint, .sync-meta, .count { color: var(--vscode-descriptionForeground); font-size: 12px; }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .logo { width: 42px; height: 26px; flex: none; color: var(--vscode-foreground); }
  .card { background: var(--vscode-editorWidget-background, var(--vscode-sideBar-background)); border: 1px solid var(--vscode-widget-border, transparent); border-radius: 8px; padding: 12px; margin-bottom: 12px; }
  .session { display: flex; justify-content: space-between; gap: 10px; }
  .user-name { font-weight: 600; margin: 0 0 4px; }
  .actions { display: flex; flex-direction: column; gap: 6px; }
  label { display: block; margin: 10px 0 4px; font-size: 12px; }
  input, select { width: 100%; box-sizing: border-box; padding: 7px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); border-radius: 4px; }
  button { width: 100%; margin-top: 10px; padding: 7px 10px; border: none; border-radius: 4px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); cursor: pointer; }
  button.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .error { color: var(--vscode-errorForeground); font-size: 12px; }
  .workspace h2 { text-transform: none; letter-spacing: 0; font-size: 12px; }
  .project { margin-bottom: 8px; }
  .project summary { cursor: pointer; font-weight: 600; }
  .issues { list-style: none; padding: 0 0 0 8px; margin: 6px 0 0; }
  .issue-open { width: 100%; text-align: left; display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; background: transparent; margin: 0; padding: 6px 8px; }
  .issue-key { font-size: 11px; color: var(--vscode-descriptionForeground); }
  .issue-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .issue-state { font-size: 11px; color: var(--vscode-descriptionForeground); }
  .issue[hidden], .project[hidden] { display: none; }
`;

const SIDEBAR_SCRIPT = `
  const vscode = acquireVsCodeApi();
  const preset = document.getElementById('server-preset');
  const serverUrl = document.getElementById('server-url');
  if (preset && serverUrl) {
    preset.addEventListener('change', () => {
      if (preset.value !== '${PlaneServerPresetId.CUSTOM}') {
        serverUrl.value = preset.value;
      }
    });
  }
  document.getElementById('save-server')?.addEventListener('click', () => {
    if (serverUrl) vscode.postMessage({ type: '${SidebarMessageType.SET_SERVER_URL}', serverUrl: serverUrl.value });
  });
  document.getElementById('pat-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const pat = document.getElementById('pat');
    vscode.postMessage({ type: '${SidebarMessageType.SIGN_IN_WITH_PAT}', token: pat ? pat.value : '' });
  });
  document.getElementById('sign-out')?.addEventListener('click', () => vscode.postMessage({ type: '${SidebarMessageType.SIGN_OUT}' }));
  document.getElementById('sync')?.addEventListener('click', () => vscode.postMessage({ type: '${SidebarMessageType.REFRESH}' }));
  document.getElementById('issue-search')?.addEventListener('click', () => vscode.postMessage({ type: '${SidebarMessageType.SEARCH}' }));
  document.getElementById('force-reload')?.addEventListener('click', () => vscode.postMessage({ type: '${SidebarMessageType.FORCE_RELOAD}' }));
  document.getElementById('saved-filter')?.addEventListener('change', (event) => {
    const target = event.target;
    vscode.postMessage({ type: '${SidebarMessageType.APPLY_SAVED_FILTER}', filterId: target && 'value' in target ? target.value : '' });
  });
  document.getElementById('save-filter')?.addEventListener('click', () => {
    const name = document.getElementById('filter-name');
    const searchBox = document.getElementById('search');
    vscode.postMessage({
      type: '${SidebarMessageType.SAVE_FILTER}',
      name: name && 'value' in name ? name.value : '',
      text: searchBox && 'value' in searchBox ? searchBox.value : ''
    });
  });
  const search = document.getElementById('search');
  if (search) {
    const applyFilter = () => {
      const needle = search.value.trim().toLowerCase();
      document.querySelectorAll('.issue').forEach((row) => {
        const title = row.getAttribute('data-title') || '';
        row.hidden = needle.length > 0 && !title.includes(needle);
      });
    };
    search.addEventListener('input', applyFilter);
    applyFilter();
  }
  document.querySelectorAll('.issue-open').forEach((button) => {
    button.addEventListener('click', () => {
      vscode.postMessage({
        type: '${SidebarMessageType.OPEN_ISSUE}',
        workspaceSlug: button.getAttribute('data-workspace'),
        projectId: button.getAttribute('data-project'),
        issueId: button.getAttribute('data-issue')
      });
    });
  });
`;
