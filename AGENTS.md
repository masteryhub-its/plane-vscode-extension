# Agent notes

This file is for humans and coding agents working in this repo.

1. Read [CODE_STANDARDS.md](./CODE_STANDARDS.md) and [CONTRIBUTING.md](./CONTRIBUTING.md) before changing code.
2. New behavior: failing `*.spec.ts` first, then implementation. Do not skip the red step.
3. Named types only — no inline object types on parameters or returns.
4. Do not add `Co-authored-by` lines for Cursor, Copilot, or other agents. Human authors only.
5. Do not commit unless the user asked. Do not push unless they asked.
6. Do not install extra formatters or relax `exactOptionalPropertyTypes` / `no-explicit-any`.
7. Keep VS Code host code in `src/vscode/`. Put HTTP / parse logic in plain modules so Jest can run it.
8. After packaging a `.vsix`, tell the user to uninstall the old build, install the new one, and **restart** the editor.

## Plane-specific

- Auth is PAT only (`X-API-Key`), bound to `plane.serverUrl` in Secret Storage.
- Issue collection path: try `/issues/`, fallback `/work-items/` on 404.
- Open issues in the system browser; do not embed Plane in a webview iframe.
- Default workspace slug for MasteryHub: `masteryhub-its` (still list workspaces from API).
