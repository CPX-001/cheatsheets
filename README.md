# Sheet Codes

A personal, ad-free collection of developer cheat sheets maintained by CPX-001.

**Live site:** https://app.sheet-codes.workers.dev

## Local development (WSL)

```bash
cd ~/repos/cheatsheets
nvm use
npx pnpm@10.32.1 install --frozen-lockfile
npx pnpm@10.32.1 dev
```

Open http://localhost:4000. Edit `source/_posts/*.md` to maintain the sheets,
`themes/coo/` for the interface, and `_config.yml` for site settings.

## Custom learning notes

The [Custom section](https://app.sheet-codes.workers.dev/custom/) contains original,
guided notes alongside the unchanged reference sheets. The first guide is
[Redis paso a paso](https://app.sheet-codes.workers.dev/custom/redis), in Spanish.

Add future guides as new files such as `source/_posts/custom-topic.md`, with
`categories: [Custom]`, `custom: true`, `language: es` and
`permalink: custom/topic.html` in front matter. Optional `icon` reuses an existing
icon name. Keep the existing post layout, Markdown cards, code blocks and theme;
the teaching style and section structure can vary. Use numbered steps, expected
results and a working exercise when the topic benefits from a guided approach.
The home page, Custom directory and search pick up the new entry automatically.
Leave the original topic sheet in place.

## Cloudflare Workers Static Assets

The public site is the `app` Worker on the neutral `sheet-codes.workers.dev`
subdomain. Cloudflare serves the generated files directly; no application server,
database or runtime secrets are needed.

Publish the current local checkout from WSL:

```bash
cd ~/repos/cheatsheets
nvm use
npx wrangler@4.131.1 login --device  # Only when authentication is needed
npm run deploy
```

The deploy command builds the site, validates the generated sheets and publishes
`public/` using `wrangler.jsonc`. Push source changes separately with `git push`.
GitHub Actions checks the generated site on pushes and pull requests. The
`Check public site` workflow can also be run manually after deployment.

**Automatic publication is not configured.** Cloudflare's Git integration
returned error `8000011` after GitHub authorization. Future CI deployment can
use a scoped Cloudflare Workers API token stored as a repository secret.
Do not put CLI OAuth credentials in the repository.

The public URL is https://app.sheet-codes.workers.dev. `/python.html` redirects
to `/python`; missing routes serve the custom 404 page. `SITE_URL` sets the
origin for canonical URLs, structured data, the sitemap and robots.txt.

The previous `sheet-codes.pages.dev` address redirects to this site where it is
reachable. Workers is the primary host because the Pages addresses assigned
to the local connection did not respond.

## Optional container deployment

```bash
docker build --build-arg SITE_URL=https://your-public-host.example -t sheet-codes .
docker run --rm -p 8080:8080 sheet-codes
```

The optional Nginx container runs as an unprivileged user on port **8080** and
provides `/healthz`. The public site is hosted on Cloudflare Workers Static Assets.

## Changes and attribution

Based on [Fechin/reference](https://github.com/Fechin/reference), originally
CheatSheets.zip. Original authorship, article sources and Git history remain.
This version removes donation and sponsorship pages, affiliate promotions,
social counters, ad placeholders, unused comment/PWA code and promotional
non-development sheets. Search, dark mode, code copying, technical notes and
functional widgets remain. Some sheets load functional libraries from CDNs.

See [NOTICE](NOTICE), [CHANGELOG.md](CHANGELOG.md) and [LICENSE](LICENSE).
Licensed under **GPL-3.0**, without warranty.
