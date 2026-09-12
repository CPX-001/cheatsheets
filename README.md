# Sheet Codes

A personal, ad-free collection of developer cheat sheets maintained by CPX-001.

## Local development (WSL)

```bash
cd ~/repos/cheatsheets
nvm use
npx pnpm@10.32.1 install --frozen-lockfile
npx pnpm@10.32.1 dev
```

Open http://localhost:4000. Edit `source/_posts/*.md` to maintain the sheets,
`themes/coo/` for the interface, and `_config.yml` for site settings.

## Production

```bash
SITE_URL=https://your-public-host.example npx pnpm@10.32.1 build
docker build --build-arg SITE_URL=https://your-public-host.example -t sheet-codes .
docker run --rm -p 8080:8080 sheet-codes
```

The build emits static files into `public/`. The container serves them as an
unprivileged user on port **8080**. `/healthz` is the health check. Both `/python`
and `/python.html` work. `SITE_URL` is a build argument for canonical URLs,
structured data, the sitemap and robots.txt; set it to the public HTTPS origin.

## Northflank

Create a combined service from `CPX-001/cheatsheets`, branch `main`, using the
root `Dockerfile` and build context `/`. Expose HTTP port **8080**, enable
build/deploy on push, and set `SITE_URL` to the generated public HTTPS URL.
Use an HTTP readiness probe on `/healthz:8080`. No database, volumes, account
system or runtime secrets are required.

## Changes and attribution

Based on [Fechin/reference](https://github.com/Fechin/reference), originally
CheatSheets.zip. Original authorship, article sources and Git history remain.
This version removes donation and sponsorship pages, affiliate promotions,
social counters, ad placeholders, unused comment/PWA code and promotional
non-development sheets. Search, dark mode, code copying, technical notes and
functional widgets remain. Some sheets load functional libraries from CDNs.

See [NOTICE](NOTICE), [CHANGELOG.md](CHANGELOG.md) and [LICENSE](LICENSE).
Licensed under **GPL-3.0**, without warranty.
