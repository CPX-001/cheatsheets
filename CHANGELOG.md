# Changelog

## Hosting migration — 2026-09-12

- Moved the public site to Cloudflare Pages at https://sheet-codes.pages.dev.
- Added Pages configuration, a manual publish command and a custom 404 page.
- Replaced the Northflank deployment template with the Cloudflare project settings.

## 1.0.0 — 2026-09-12

- Created the independent Sheet Codes base from Fechin/reference.
- Removed promotional UI, donation/sponsorship pages, affiliate links,
  social counters, ad placeholders and unused PWA/comment integrations.
- Preserved technical cheat sheets, search, dark mode, code copying and credits.
- Added a Node 24 build, unprivileged Nginx container, health endpoint and
  configurable public URL for Northflank.
