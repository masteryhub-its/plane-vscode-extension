# Plane by MasteryHub — feature roadmap

Product plan for the VS Code / Cursor client. **Shipped behavior** is in [FEATURES.md](./FEATURES.md). This file is the forward-looking catalog: phases, priorities, and permanent non-goals.

**Extension id:** `masteryhub-its.plane`  
**Current release:** v0.5.0  
**Default server:** `https://plane.masteryhub-its.com` (Global only)  
**Stack:** REST `/api/v1` with `X-API-Key` (PAT) — no WebSocket in v0.x

---

## Honest assessment — should you install today?

**Short answer: yes for daily triage.** v0.5.0 covers browse, preview, comments, field edits, archive/delete, and my-issues. Cycles/modules are read-only. Full PM admin still lives in the Plane web app.

### What you can do today (installed)

| Works in VS Code | Still need browser for |
| --- | --- |
| Sign in (PAT), browse workspace → project → issues, my issues | Cycle/module **editing**, project settings |
| Issue preview (fields, description, comments, sub-issues, attachments, relations) | Rich description editor, binary file upload |
| Create issue (title, description, project, priority, labels, template) | Pages editor |
| Convert intake item to issue | Full intake admin in Plane web |
| PATCH state, assignee, priority, labels, title, description, due date | — |
| Read + write comments; archive; delete; subscribe | Realtime updates |
| Search + PROJ-n link detection and hover | — |

### When installation becomes worth it

| Milestone | Minimum bar for “install this” |
| --- | --- |
| **v0.5 (now)** | Comments write + archive + my issues + field PATCH — worth it for **issue discussion** beside code. |
| **Never (by design)** | Full Plane UI (cycles admin, pages editor, SSO) — use Plane web. |

---

## Principles (every phase)

| Rule | Why |
| --- | --- |
| PAT in Secret Storage only, bound to Global `plane.serverUrl` | Workspace settings must not retarget tokens |
| Open Plane web app in system browser for full PM UI | No iframe / Simple Browser |
| Sidebar + Issues tree first; palette for search, create, sync, sign-in | Same UX shape as AFFiNE plugin |
| Issues vs work-items fallback per project | Self-hosted version drift |
| Paginate + cache lists (~60 req/min PAT limit) | Avoid rate-limit toasts |
| TDD + `npm run validate` green | Shared CODE_STANDARDS with AFFiNE |

---

## Shipped — v0.5.0

See [FEATURES.md](./FEATURES.md). v0.2–v0.5 from this roadmap are implemented in the current release (read-only cycles/modules, comments write, field PATCH, attachments/relations, copy key/URL, saved-filter picker, template pick on create, intake convert). Remaining: members roster in the sidebar, marketplace v1.0.

---

## v0.2 — Daily driver

**Goal:** Enough field coverage that most standup/triage work stays in the editor.

| Feature | Detail |
| --- | --- |
| **My issues** filter | Sidebar section: assigned to me, optionally created by me |
| Update **priority** | Tree context + Quick Pick → PATCH |
| Update **labels** | Multi-select labels on create and PATCH on existing |
| Update **title / description** | Input box + multiline description; confirm on overwrite |
| **Due date** display + edit | Show on preview; date picker → PATCH if API supports |
| Hover provider | `{PROJ-123}` and Plane URLs show issue title from cache |
| **Sub-issues** (read) | List children on preview; open child in preview |
| **Comments** (read-only) | Newest-first list on preview; HTML escaped like description |
| Catalog cache + TTL | Reduce repeat list calls; invalidate on sync / force reload |
| Rate-limit UX | Backoff + user-visible “try again in …” when 429 |
| README + FEATURES sync | Match v0.2 behavior; install / reload instructions |
| Official Plane logo | Activity bar + sidebar (done) |

**Exit criteria:** All PATCH paths covered by fixture specs; preview never executes script; validate green.

---

## v0.3 — Project context

**Goal:** Navigate projects the way PMs think — cycles, modules, filters — still read-heavy.

| Feature | Detail |
| --- | --- |
| **Cycles** (read) | Sidebar or tree section per project: active cycle issues |
| **Modules** (read) | Group issues by module in tree or filter |
| **Saved filters** | Client-side saved filters (assignee, state, label, text) |
| **Bulk state change** | Multi-select in tree → one Quick Pick for state |
| **Project metadata** | Show project identifier, emoji/icon, description in sidebar |
| **Members** (read) | Roster in sidebar; pick assignee without loading full issue list |
| **States** customization | Respect custom state groups in tree ordering |
| **Search** upgrade | Use workspace search API when present; else title + key + description client filter |
| **Create issue defaults** | Remember last project/priority per workspace (in `globalState`, not secrets) |
| **Notification badge** | Optional: count of “assigned to me” in activity bar (setting, off by default) |

---

## v0.4 — Attachments and structure

**Goal:** Issue preview becomes a credible spec reader.

| Feature | Detail |
| --- | --- |
| **Attachments** (read) | List files on issue; open/download via browser or signed URL |
| **Links / relations** | Show blocked-by / relates-to when API returns relations |
| **Pages** (read) | Link to Plane project pages from sidebar; open in browser |
| **Intake** (read) | List intake items; convert to issue opens create pre-filled |
| **Description modes** | Prefer `description_html`; fallback plain / markdown with safe render |
| **Preview: labels + priority chips** | Visual chips matching Plane colors when API sends hex |
| **Copy issue key** | Command + context menu: copy `PROJ-42` to clipboard |
| **Copy issue URL** | Browse URL vs project URL (both formats supported) |

---

## v0.5 — Write paths beyond triage

**Goal:** Comment and light PM without leaving the editor.

| Feature | Detail |
| --- | --- |
| **Add comment** | Textarea in preview → POST comment |
| **Edit own comment** | PATCH if API allows |
| **Archive issue** | With confirm dialog |
| **Delete issue** | With strong confirm; respect project permissions |
| **Subscribe / unsubscribe** | Toggle notifications for issue |
| **Time tracking** (read) | Show logged time if instance exposes it |
| **Templates** (read) | Pick template on create when project has templates |

---

## v1.0 — Stable product

**Goal:** Public OSS release; install without manual `.vsix`.

| Feature | Detail |
| --- | --- |
| Git repo on GitHub `MasteryHub-ITS/plane-vscode` | Initial commit, CI, tags |
| Visual Studio Marketplace + Open VSX | Publisher `masteryhub-its` |
| Compatibility matrix | Plane Cloud + self-hosted AIO versions tested |
| CHANGELOG + semver | Release notes per version |
| Performance budget | Full catalog sync for MasteryHub workspace under defined SLO |
| Issue / security templates | Align with AFFiNE CONTRIBUTING posture |

---

## v2.0+ — Optional / research

Only after v1.0. Several depend on Plane server features we do not control.

| Idea | Notes |
| --- | --- |
| TODO comment → create issue | User confirms title/project; never silent auto-create |
| Git branch / commit link | **Low priority** — Silo integration on server is flaky; do not depend on it |
| Realtime updates | WebSocket or SSE if Plane documents a stable PAT-scoped stream |
| OAuth / Plane Apps | PAT remains default; OAuth only if official third-party flow exists |
| Offline queue | Queue PATCH/create when offline; replay on sync (complex; research) |
| Plane MCP | Document how to use Plane MCP alongside extension, not duplicate it |

---

## Permanent non-goals

| Non-goal | Reason |
| --- | --- |
| Embed Plane web UI in webview | No session; security and UX |
| Email/password sign-in in extension | Public API is PAT-based |
| Tokens in `settings.json` | Secret Storage only |
| Full project admin | Settings, billing, SSO — use Plane web |
| Cycles/modules **editing** in v0.x | Read-first; write later if API stable |
| Depend on Silo / git auto-link | Unreliable on current instance |

---

## API surface (reference)

Pinned for TDD fixtures (no live keys in repo):

| Endpoint | Use |
| --- | --- |
| `GET /api/v1/users/me/` | Auth probe |
| `GET /api/v1/workspaces/` | Catalog root |
| `GET …/projects/` | Project list |
| `GET/POST …/issues/` or `…/work-items/` | List + create (404 fallback) |
| `GET/PATCH …/issues/{id}/` | Preview + updates |
| `GET …/states/`, `…/members/`, `…/labels/` | Pickers |
| Workspace search | If available; else client filter |

Issue browser URL: `{server}/{slug}/browse/{IDENTIFIER}-{n}/`  
Project URL: `{server}/{slug}/projects/{project_id}/issues/{issue_id}/`

---

## Cross-cutting work (ongoing)

| Area | Tasks |
| --- | --- |
| Security | Bound PAT, Global URL, redirect manual, https except loopback, redact `plane_api_*`, CSP, no PII in chrome |
| Tests | JSON fixtures per endpoint; issues/work-items dual paths |
| CI | `npm run validate`; optional mock HTTP server in Jest |
| Docs | FEATURES = shipped; ROADMAP = planned; CHANGELOG = releases |

---

## Suggested implementation order (next)

1. Members roster in the sidebar (v0.3 leftover)
2. **v1.0** git publish + marketplace

---

## Related

- [FEATURES.md](./FEATURES.md) — what v0.5.0 does today  
- [CODE_STANDARDS.md](./CODE_STANDARDS.md) — engineering bar (shared with AFFiNE)  
- [SECURITY.md](./SECURITY.md) — vulnerability reports  
- AFFiNE sibling: [affine-vscode ROADMAP](https://github.com/MasteryHub-ITS/affine-vscode/blob/main/ROADMAP.md) (separate product plan)
