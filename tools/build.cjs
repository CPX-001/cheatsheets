const Hexo = require('hexo');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

async function build() {
  const hexo = new Hexo(process.cwd(), { silent: false });
  await hexo.init();
  if (process.env.SITE_URL) {
    const siteUrl = new URL(process.env.SITE_URL);
    if (
      !['http:', 'https:'].includes(siteUrl.protocol) ||
      siteUrl.pathname !== '/' ||
      siteUrl.search ||
      siteUrl.hash
    ) {
      throw new Error('SITE_URL must be an HTTP(S) origin without a path, query or fragment');
    }
    hexo.config.url = siteUrl.origin;
  }
  await hexo.call('generate');
  const sourceFiles = fs
    .readdirSync('source/_posts')
    .filter((file) => file.endsWith('.md'))
    .sort();
  const digest = crypto.createHash('sha256');
  for (const file of sourceFiles)
    digest.update(file).update(fs.readFileSync(`source/_posts/${file}`));
  let revision = process.env.GITHUB_SHA || process.env.SITE_REVISION;
  if (!revision) {
    try {
      revision = execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();
    } catch {
      revision = 'unknown';
    }
  }
  fs.writeFileSync(
    'public/site-version.json',
    JSON.stringify(
      {
        revision,
        contentHash: digest.digest('hex'),
        guides: sourceFiles.length
      },
      null,
      2
    ) + '\n'
  );
  await hexo.exit();
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
