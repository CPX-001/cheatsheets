const fs = require('node:fs');
const path = require('node:path');

hexo.extend.generator.register('site-files', () => [
  {
    path: 'robots.txt',
    data: `User-agent: *\nAllow: /\n\nSitemap: ${hexo.config.url}/sitemap.xml\n`
  },
  { path: 'LICENSE.txt', data: fs.readFileSync(path.join(hexo.base_dir, 'LICENSE'), 'utf8') }
]);
