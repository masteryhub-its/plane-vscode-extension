# Code standards

These rules apply to MasteryHub **editor plugins** (AFFiNE, Plane, and future clients). The bar is: **strict TypeScript, named types, tests first, `npm run validate` is green.**

## Quick check

```bash
npm install
npm run validate
```

## TypeScript

- **No `any`.** Use `unknown` and narrow.
- **Named types** for parameters and returns.
- Closed string sets are TypeScript **enums** in `src/utils/enums/`.
- Optional properties: omit the key under `exactOptionalPropertyTypes`.

## Tests (TDD)

New behavior starts with a **failing** `*.spec.ts`. Assert on parsed data, HTML, and error codes — not mock call counts.

## Layout

```
src/
  client/     # Plane REST API
  auth/       # PAT + Secret Storage codec
  config/     # settings
  errors/
  sidebar/    # webview HTML + messages
  tree/       # explorer model
  search/
  issue/      # preview + link detection
  vscode/     # commands, tree, webview host
  utils/enums/
```

## Git

- Human authors only. No agent `Co-authored-by` trailers.
- Do not commit tokens or `.vsix` binaries.

## Secrets and network

- PAT in Secret Storage, never in settings.
- `preferredServerUrlRaw` ignores workspace/folder overrides for `plane.serverUrl`.
- `fetch` uses `redirect: 'manual'`.
- https required except loopback http.

## Plane-specific

- REST `/api/v1/` with `X-API-Key`.
- Issue paths: `/issues/` then `/work-items/` fallback on 404.
- Browser URLs: prefer `{server}/{slug}/browse/{identifier}-{sequence}/`.
- Webview CSP: `img-src` webview origin only; escape all user/server text in HTML.
- `formatPlaneError` redacts `plane_api_` tokens.
