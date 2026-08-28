# Plane by MasteryHub ITS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![CI](https://github.com/masteryhub-its/plane-vscode-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/masteryhub-its/plane-vscode-extension/actions/workflows/ci.yml)

Browse, preview, search, and manage issues from **self-hosted Plane** or **Plane Cloud** without leaving VS Code or Cursor.

This is an open-source **[MasteryHub ITS](https://www.masteryhub-its.com)** client. It is **not** an official [Plane](https://github.com/makeplane/plane) product.

**Every shipped capability** is listed in [FEATURES.md](./FEATURES.md).

## Features

- Sign in with a Plane personal access token (PAT via `X-API-Key`), stored in Secret Storage bound to `plane.serverUrl`
- Sidebar webview plus **Issues** tree: my issues, workspace → project → state/cycle/module → issues
- Issue preview with sanitized HTML, comments (read/write), sub-issues, attachments, relations
- **Open in Plane** via system browser (`openExternal`, no iframe)
- Search, create, change state/assignee/priority/labels/title/description/due date
- Copy issue key or URL; archive; delete; subscribe
- Hover and link detection for `{IDENTIFIER}-{n}` keys and Plane URLs
- Force reload, sync, optional assigned-issue badge, status bar

## Install

1. Run `npm run package` in this repo, or download a `.vsix` from [Releases](https://github.com/masteryhub-its/plane-vscode-extension/releases).
2. VS Code / Cursor: **Extensions → … → Install from VSIX…**
3. **Restart** the editor.
4. Open the Plane icon in the activity bar and sign in with a PAT.

## Settings

| Key | Default |
| --- | --- |
| `plane.serverUrl` | `https://plane.masteryhub-its.com` (Global only) |
| `plane.defaultWorkspaceSlug` | `masteryhub-its` |
| `plane.defaultProjectId` | empty (all projects) |
| `plane.showAssignedBadge` | `false` |

Create a PAT in Plane → Profile → Personal Access Tokens.

## Develop

```bash
npm install
npm run validate
```

Press **F5** for the Extension Development Host.

## Security

See [SECURITY.md](./SECURITY.md). Tokens live in Secret Storage, never in settings.

## License

[MIT](./LICENSE) © MasteryHub ITS
