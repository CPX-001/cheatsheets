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

The public site is the `sheet-codes` project on Cloudflare Pages, deployed using
Direct Upload. GitHub Actions checks the generated site on pushes and pull
requests. No database, running container or runtime secrets are needed.

Publish the current local checkout from WSL:

```bash
cd ~/repos/cheatsheets
nvm use
npx wrangler@4.131.1 login --device  # Only when authentication is needed
npm run deploy
```

The deploy command builds the site, validates the generated sheets and publishes
`public/` to the production branch of Pages. `wrangler.jsonc` defines the project
and output directory; `deploy/cloudflare-pages.json` contains the project
creation settings. Push code changes to GitHub separately with `git push`.

**Automatic publication is not configured.** During migration, Cloudflare's Git
integration returned error `8000011` after GitHub authorization. Direct Upload
keeps the site available without that integration. A future GitHub Actions
deployment can use a scoped Cloudflare Pages API token stored as a repository
secret. Do not store CLI OAuth credentials in the repository.

The build emits static files into `public/`. Pages serves `/python` and redirects
`/python.html` to `/python`. Missing routes return the custom `404.html` page.
`SITE_URL` sets the origin for canonical URLs, structured data, the sitemap and
robots.txt; it defaults to https://sheet-codes.pages.dev in `_config.yml`.

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
