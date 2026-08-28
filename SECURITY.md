# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |

## Reporting a vulnerability

**Do not** open public GitHub issues for security problems.

Email **contact@masteryhub-its.com** with:

- Extension version
- Steps to reproduce
- Impact assessment

We will respond within a reasonable timeframe.

## Design notes

- Plane PATs are stored in VS Code **Secret Storage**, bound to `plane.serverUrl`.
- PATs are sent only as `X-API-Key` to the configured Plane server over HTTPS (or loopback HTTP in dev).
- Error messages redact `plane_api_*` tokens, Bearer headers, cookies, and passwords.
- Webviews use strict CSP and HTML escaping; Plane is not embedded in an iframe.

## If a token is exposed

1. Revoke the PAT in Plane → Profile → Personal Access Tokens.
2. Sign out of the extension and sign in with a new token.
3. Do not paste tokens into issues, logs, or `settings.json`.
