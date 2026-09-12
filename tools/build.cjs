const Hexo = require('hexo');

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
  await hexo.exit();
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
