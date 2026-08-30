# Changelog

## 0.5.2 — 2026-08-29

- Show a loading screen immediately instead of a blank sidebar
- Retry timed-out Plane API calls once; map hangs to a clear timeout error
- Wait up to 60s per request (Cloudflare/origin can take ~26s)

## 0.5.1 — 2026-08-29

- Resolve workspace when Plane's retrieve-by-slug route is session-only (401)
- Show projects before issue lists finish; keep a project if issue listing fails
- Send a browser-like User-Agent so Cloudflare Bot Fight Mode (1010) does not block the API
- Abort hung Plane API requests after 45 seconds

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
