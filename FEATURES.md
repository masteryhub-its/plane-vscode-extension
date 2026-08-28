# Features — Plane by MasteryHub v0.5.0

## Connect

- MasteryHub ITS Plane (`https://plane.masteryhub-its.com`), Plane Cloud, or custom self-hosted URL
- Sign in with personal access token (password input); sign out from sidebar, Issues toolbar, or palette
- Status bar shows signed-in display name or sign-in prompt
- VS Code and Cursor 1.90+

## Sidebar and Issues tree

- Activity-bar Plane webview plus **Issues** tree
- **My issues** (assigned to you) at the top of the sidebar and as a tree section
- Workspace → project (identifier, emoji, description tooltip) → states ordered by group → issues
- Cycles and modules under each project (read-only issue lists)
- Filter issues by title in the sidebar
- Saved-filter picker in the sidebar (persist via `globalState` key `plane.savedFilters`)
- Search (palette, sidebar, toolbar) uses the workspace search API when present, otherwise title/key/description
- Sync / refresh catalog (60s issue-list cache; invalidated on sync / force reload)
- Force reload Plane views without restarting the editor
- Optional Issues-view badge for assigned-issue count (`plane.showAssignedBadge`, off by default)

## Commands (palette)

- Sign in, Search Plane Issues, Open Plane Issue, Create Plane Issue, Sync, Force Reload, Sign out, Open Plane Link or Issue Key, Convert Plane Intake Item
- Change state of selected issues (multi-select in the Issues tree)

## Tree context (hidden from palette)

- Change issue state, assignee, priority, labels, title, description, due date
- Copy issue key / URL
- Subscribe / unsubscribe, archive, delete (with confirm)

## Issue preview

- Title, key, state, priority, assignees, labels (color chips when the API sends hex), due date, updated time
- Description prefers `description_html`; falls back to escaped plain text
- Sub-issues, relations (blocked-by / blocking / relates-to / duplicate), attachments, logged time
- Comments newest-first with HTML escaped like description; post a comment; edit your own comments
- **Open in Plane** opens the real web app in the system browser

## Create and update

- Create issue: title, description, project, priority, optional labels, optional **template** pick; last project/priority remembered in `globalState`
- Convert an intake item to a new issue (`Convert Plane Intake Item`); already-converted items open the existing issue
- PATCH title, description, priority, labels, due date, state, assignee
- Archive (confirm) and delete (strong confirm)

## Link detection

- `{IDENTIFIER}-{n}` in selection (e.g. `MH-42`)
- Hover on issue keys shows the cached title
- Plane browse and project issue URLs for configured server

## Security

- `BoundPlaneCredential { serverUrl, token }` in Secret Storage
- `plane.serverUrl` read from Global/default only (workspace overrides ignored)
- HTTP fetch uses `redirect: 'manual'`; https required except loopback http
- `formatPlaneError` redacts `plane_api_` tokens, Bearer, cookies, passwords
- Webview CSP: `img-src` same-origin (webview origin only); HTML escaped in sidebar and preview
- Rate-limit (429) surfaces “try again in N seconds”

## API

- REST `/api/v1/` with `X-API-Key`
- Tries `/issues/` first, falls back to `/work-items/` on 404 per project
- Paginate with `cursor` / `per_page`
- Optional routes (cycles, modules, pages, intake, templates, worklogs, attachments, relations) return empty on 404

## Non-goals (still)

- No iframe / Simple Browser embedding of Plane
- No cycles/modules **editing**
- No socket.io or realtime sync

## Roadmap

Later phases: [ROADMAP.md](./ROADMAP.md)
