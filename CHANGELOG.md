# Changelog

## Custom learning notes — 2026-09-16

- Added a Custom directory and home category using the existing visual theme.
- Added a Spanish Redis walkthrough with a local lab, expected results, a Python cache example and troubleshooting.
- Kept the original Redis and all other existing reference sheets unchanged.

## Reachable Cloudflare host — 2026-09-12

- Published the static site at https://app.sheet-codes.workers.dev and verified it in the browser.
- Switched the primary deployment to Workers Static Assets after the Pages endpoint failed to connect locally.
- Updated the public URL, deployment command and HTTP checks; retained the old Pages address as a redirect.

## Hosting migration — 2026-09-12

- Moved the public site to Cloudflare Pages at https://sheet-codes.pages.dev.
- Added Pages configuration, a manual publish command and a custom 404 page.
- Replaced the Northflank deployment template with the Cloudflare project settings.
- Published using Direct Upload because Cloudflare Git integration returned error 8000011.

## 1.0.0 — 2026-09-12

- Created the independent Sheet Codes base from Fechin/reference.
- Removed promotional UI, donation/sponsorship pages, affiliate links,
  social counters, ad placeholders and unused PWA/comment integrations.
- Preserved technical cheat sheets, search, dark mode, code copying and credits.
- Added a Node 24 build, unprivileged Nginx container, health endpoint and
  configurable public URL for Northflank.
