# Features — Plane by MasteryHub v1.1.0

## Connect

- Plane Cloud (`https://app.plane.so`) or a custom self-hosted URL
- Sign in with personal access token (password input); sign out from sidebar, Issues toolbar, or palette
- Status bar shows signed-in display name or sign-in prompt
- VS Code and Cursor 1.90+

## Issues tree (what you see first)

- Each issue row shows a state icon (by state group), the title, the key, and the due date ("due Sep 25" or "overdue Sep 12"), with a priority badge (`!!`, `H`, `M`, `L`). Overdue issues are coloured as warnings and urgent ones as errors; the meaning is always in the text as well as the colour
- Title-bar icons: search, create issue, sync. The **...** menu holds Force reload, Set server URL, Export PAT and Sign out
- Signed out, the view shows a welcome with **Sign in with a token** and **Choose server**
- The previous webview panel (account, server and filter cards) is hidden; turn on `plane.ui.legacySidebar` to bring it back
- Every colour comes from the editor theme, so Dark, Light and High Contrast themes work; high contrast adds borders

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

- Sign in, Search Plane Issues, Open Plane Issue, Create Plane Issue, **Create Plane Issue from Selection** (editor right-click; title from the code or TODO comment, file and lines in the description), **Filter Plane Issues** (under **...**), **Open Plane Issue for Current Branch**, Sync, Force Reload, Sign out, Open Plane Link or Issue Key, Convert Plane Intake Item
- Change state of selected issues (multi-select in the Issues tree). Issues are grouped by project; the picked state is matched by name in each project, a confirmation is shown first, and the result lists any issue that failed
- Export Plane PAT to an MCP env file: shows the exact lines and target path, asks for confirmation, writes with `0600` permissions (path from `plane.mcpEnvPath`)

## Tree context (hidden from palette)

- Change issue state, assignee, priority, labels, title, description, due date
- Copy issue key / URL
- **Create Git Branch from Plane Issue** (named like `eng-12-fix-login`, switches to it; copies the name if no git repository is open) and **Create Sub-issue**
- Subscribe / unsubscribe, archive, delete (with confirm)

## Issue preview

- Title, key, state, priority, assignees, labels (color chips when the API sends hex), due date, updated time
- Description prefers `description_html` (sanitized with an allowlist); falls back to escaped plain text
- A failed load shows an error page with a **Retry** button; opening the same issue again focuses the existing panel
- Sub-issues, relations (blocked-by / blocking / relates-to / duplicate), attachments, logged time
- Comments newest-first, sanitized with an allowlist; mentions show as `@name`, images as `[image]`, task items as checkboxes
- Post a comment (blank lines start a paragraph); edit your own comment inline when it is plain text. Comments with formatting show "Edit in Plane to keep formatting" instead of an edit button, so nothing is flattened
- A toolbar changes state, assignee, priority, labels and due date, renames the issue, adds a sub-issue and creates a git branch
- **Open in Plane** opens the real web app in the system browser

## Create and update

- Create issue: title, description, project, priority, optional labels, optional **template** pick; last project/priority remembered in `globalState`
- Convert an intake item to a new issue (`Convert Plane Intake Item`); already-converted items open the existing issue
- PATCH title, description, priority, labels, due date, state, assignee
- Archive (confirm) and delete (strong confirm)
- A write that times out is not retried; the message says the change may have been applied, so refresh before trying again
- Issue lists stop at 5000 issues per project and say so in the status bar

## Filters and branch

- **Filter Plane Issues** limits every issue list in the tree: assigned to me, my issues in progress, in progress, urgent and high priority, overdue, unassigned, or by text (title or key). Text filters can be saved; the active filter is remembered and shown on the view
- A status bar entry shows the issue the current git branch is named after; click it to open the issue

## Faster, and works from a saved view

- Independent requests run in parallel, and a slow read races a second attempt
- The workspace list and your assigned issues are saved per server and account and shown at once on the next start, then refreshed in the background. Signing out, changing server or Force Reload clears them

## Link detection

- `{IDENTIFIER}-{n}` in selection (e.g. `MH-42`)
- Hover on issue keys shows the cached title
- Plane browse and project issue URLs for configured server

## Security

- `BoundPlaneCredential { serverUrl, token }` in Secret Storage
- `plane.serverUrl` read from Global/default only (workspace overrides ignored)
- HTTP fetch uses `redirect: 'manual'`; https required except loopback http; only GET requests are retried after a timeout
- `User-Agent` is `Plane-VSCode/<extension version>`
- Webview HTML goes through an allowlist sanitizer, and the content security policy forbids `base` and form targets
- The workspace slug must be a plain slug (letters, digits, `-`, `_`); anything else is ignored, so a cloned repository cannot inject lines into the MCP env file
- 401, 403 (permission), 404 (check slug and server URL) and redirects each get a distinct message
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
