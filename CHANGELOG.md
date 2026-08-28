# Changelog

## 0.5.0 — 2026-08-28

Daily-driver release covering the v0.2–v0.5 roadmap.

- My issues in the sidebar and Issues tree; optional assigned-count badge
- PATCH priority, labels, title, description, due date; labels on create
- Comments read/write (edit own); sub-issues; attachments; relations; worklogs
- Hover on `{PROJ-n}`; catalog TTL cache; 429 retry-after message
- Cycles and modules (read); state group order; bulk state change; workspace search fallback
- Copy issue key/URL; archive; delete; subscribe
- Last create project/priority stored in `globalState`
- Saved-filter picker in the sidebar; template pick on create; convert intake item

## 0.1.0 — 2026-08-27

Initial release.

- PAT sign-in (`X-API-Key`), sign out, status bar
- Settings: `plane.serverUrl`, `plane.defaultWorkspaceSlug`, `plane.defaultProjectId`
- Sidebar webview and Issues tree (workspace → project → state → issue)
- Issue preview webview and Open in Plane
- Search, create issue, change state/assignee
- Link detection for issue keys and Plane URLs
- Security: bound credentials, redirect manual, error redaction, CSP, HTML escape
