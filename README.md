# Sheet Codes

A personal, ad-free collection of developer cheat sheets maintained by CPX-001.

**Live site:** https://sheet-codes.pages.dev

## Local development (WSL)

```bash
cd ~/repos/cheatsheets
nvm use
npx pnpm@10.32.1 install --frozen-lockfile
npx pnpm@10.32.1 dev
```

Open http://localhost:4000. Edit `source/_posts/*.md` to maintain the sheets,
`themes/coo/` for the interface, and `_config.yml` for site settings.

## Cloudflare Pages

The `sheet-codes` Pages project builds and publishes `main` automatically from
`CPX-001/cheatsheets`. GitHub Actions also checks the generated site on pushes
and pull requests. No database, running container or runtime secrets are needed.

Build settings:

- Build command: `npx pnpm@10.32.1 lint:check && npx pnpm@10.32.1 build && npx pnpm@10.32.1 test:build`
- Output directory: `public`
- `NODE_VERSION=24.18.0`, `PNPM_VERSION=10.32.1`, `HUSKY=0`
- `SITE_URL=https://sheet-codes.pages.dev`

`wrangler.jsonc` defines the Pages project and output directory. A reproducible
project configuration is in `deploy/cloudflare-pages.json`; reconnect the
Cloudflare GitHub integration before using it with another account.

For a manual publication from WSL:

```bash
npx wrangler@4.131.1 login --device
npm run deploy
```

The build emits static files into `public/`. Pages serves `/python` and redirects
`/python.html` to `/python`. Missing routes return the custom `404.html` page.
`SITE_URL` sets the origin for canonical URLs, structured data, the sitemap and
robots.txt; use an HTTPS origin without a path.

## Optional container deployment

```bash
docker build --build-arg SITE_URL=https://your-public-host.example -t sheet-codes .
docker run --rm -p 8080:8080 sheet-codes
```

The optional Nginx container runs as an unprivileged user on port **8080** and
provides `/healthz`. The public site is hosted on Cloudflare Pages.

## Changes and attribution

Based on [Fechin/reference](https://github.com/Fechin/reference), originally
CheatSheets.zip. Original authorship, article sources and Git history remain.
This version removes donation and sponsorship pages, affiliate promotions,
social counters, ad placeholders, unused comment/PWA code and promotional
non-development sheets. Search, dark mode, code copying, technical notes and
functional widgets remain. Some sheets load functional libraries from CDNs.

See [NOTICE](NOTICE), [CHANGELOG.md](CHANGELOG.md) and [LICENSE](LICENSE).
Licensed under **GPL-3.0**, without warranty.
