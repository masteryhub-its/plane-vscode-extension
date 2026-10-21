# Changelog

## 1.1.1 — 2026-10-21

- Issues now load completely: the issue list stopped asking for pages when the server says it is on the last page. It used to keep asking up to the 5000-issue limit, which hit the server's request limit and left the tree empty
- A rate-limited request shows the server's answer instead of "This operation was aborted", and a short rate limit (up to 20 seconds) is waited out and retried twice
- When the server lists no workspaces for your token and none is set, the tree now asks for the workspace slug and saves it, instead of showing a settings hint with no way to act on it. A **Set Plane Workspace** command does the same

## 1.1.0 — 2026-10-21

Redesigned interface. Everything from 1.0.1 is included.

- Issues tree: state icon, title, key, due date and priority badge on each row; overdue and urgent issues are coloured
- Welcome view for signing in and choosing a server; the always-visible account, server and filter cards are gone (`plane.ui.legacySidebar` restores them)
- Title bar trimmed to search, create and sync; the rest is under the **...** menu, including a new **Set Plane Server URL** command
- Issue preview rebuilt: breadcrumb, key and title, an action toolbar (open, change state, assign, copy link, copy key, copy branch name), a properties panel, sub-issue progress, an activity timeline and a comment composer (Ctrl+Enter sends)
- Loading skeleton instead of a blank panel; a Retry page on failure
- One theme stylesheet built only from editor theme colours, with high contrast support
- Issue preview toolbar also changes priority, labels and due date, renames the issue, adds a sub-issue and creates a git branch
- **Create Plane Issue from Selection** (editor right-click): starts an issue titled from the selected code or TODO comment, with its file and lines in the description
- **Create Git Branch from Plane Issue**, and a status bar entry showing the issue the current branch is named after (click to open it)
- **Filter Plane Issues** (under **...**): assigned to me, in progress, urgent and high priority, overdue, unassigned, or by text; saved filters are kept
- The workspace list and your issues are saved and shown at once on the next start, then refreshed in the background; independent requests run in parallel and slow reads race a second attempt
- Requests to Plane are retried (up to three attempts) when the connection itself fails, which makes a flaky network far more reliable; a write is only repeated when the connection never opened, so nothing is applied twice

## 1.0.1 — 2026-10-19

Security and reliability fixes from a full audit. No new screens or commands.

- A connection failure now says what happened (for example "Cannot reach <host>: the connection timed out. Check your network or VPN and the server URL setting.") instead of a bare "fetch failed"
- Allowlist HTML sanitizer for issue and comment HTML (replaces a regex filter); content security policy now forbids `base` and form targets
- Mentions, images and task items from Plane's editor stay visible instead of vanishing
- Timed-out writes are no longer retried; the error says the change may have been applied
- Export to MCP env: confirmation with exact lines, single-line validation, `0600` permissions, `$` sequences in tokens written literally, path setting `plane.mcpEnvPath`
- A workspace slug from settings must be a plain slug; unsafe values are ignored
- Comment edit works inline for plain-text comments and is withheld for formatted ones (no silent flattening)
- Bulk state change groups by project, asks for confirmation and reports per-issue results
- Honest `Plane-VSCode/<version>` user agent
- Distinct messages for 403, 404 and redirects; 5000-issue limit is announced
- Faster issue open: shared project list, shared endpoint probe, parallel panel requests
- Failed issue load shows a Retry page; the same issue opens one panel
- Server URL is a user-level setting; the stored token is no longer cleared by a settings change
- Untrusted and virtual workspaces declared unsupported
- Release workflow checks the tag matches the version; runtime dependency audit runs in CI

## 1.0.0 — 2026-09-09

Public store release: marketplace metadata, screenshots, and GitHub Release publish.

- Publisher id `MasteryHubITS` (extension id `MasteryHubITS.plane`)
- Default server is Plane Cloud; self-hosted URLs are entered as custom (no private instance URL in the listing)
- Visual Studio Marketplace and Open VSX publish workflow on GitHub Release (`VSCE_PAT`, `OVSX_PAT`)
- Marketplace screenshots captured from the real sidebar and issue preview HTML
- README install path for Marketplace / Open VSX, with GitHub `.vsix` as the sideload fallback

## 0.5.3 — 2026-09-09

- Command to export the signed-in Plane PAT into a local MCP env file

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
