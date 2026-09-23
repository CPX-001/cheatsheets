const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripHTML, unescapeHTML } = require('hexo-util');

const output = path.resolve('public');
const search = JSON.parse(fs.readFileSync(path.join(output, 'search.json'), 'utf8'));
const titles = {
  django: 'Django · Base',
  docker: 'Docker · Base',
  'docker-dockerfile': 'Docker · Dockerfile',
  'docker-compose': 'Docker Compose',
  redis: 'Redis · Base'
};
const expected = Object.keys(titles);
assert.deepEqual(
  search.map((sheet) => sheet.path).sort(),
  expected.map((slug) => `/${slug}.html`).sort()
);
const sourceFiles = fs.readdirSync('source/_posts').filter((file) => file.endsWith('.md'));
assert.deepEqual(sourceFiles.sort(), expected.map((slug) => `${slug}.md`).sort());
for (const sheet of search) {
  assert(sheet.title?.trim(), `Missing title: ${sheet.path}`);
  assert(sheet.path.startsWith('/'), `Search URL must be local: ${sheet.path}`);
  assert(fs.existsSync(path.join(output, sheet.path)), `Missing sheet: ${sheet.path}`);
  const slug = path.basename(sheet.path, '.html');
  const html = fs.readFileSync(path.join(output, sheet.path), 'utf8');
  const source = fs.readFileSync(`source/_posts/${slug}.md`, 'utf8');
  if (slug.startsWith('django')) {
    for (const token of source.matchAll(/{%[\s\S]*?%}|{{[\s\S]*?}}/g)) {
      assert(!token[0].includes('\n'), `A formatter split a Django template token: ${slug}`);
    }
  }
  assert(html.includes('css/learning.css'), `Missing reading styles: ${slug}`);
  assert(html.includes('learning-page-cards'), `Inconsistent layout: ${slug}`);
  assert.equal(sheet.title, titles[slug], `Incorrect guide title: ${slug}`);
  const headings = [...source.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  const rendered = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((match) =>
    unescapeHTML(stripHTML(match[1])).replace(/^#/, '')
  );
  assert.deepEqual(rendered, headings, `Missing or truncated topic sections: ${slug}`);
  assert(sheet.sections?.length === headings.length, `Incomplete search/contents index: ${slug}`);
  assert(
    !/MiniStore|Descargar laboratorio|Cómo trabajar con estos apuntes/.test(html),
    `Obsolete material: ${slug}`
  );
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => unescapeHTML(match[1])));
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = unescapeHTML(match[1]);
    if (href.startsWith('#') && href.length > 1) {
      assert(ids.has(decodeURIComponent(href.slice(1))), `Broken anchor in ${slug}: ${href}`);
    } else if (href.startsWith('/') && !href.startsWith('//')) {
      const url = new URL(href, 'https://app.sheet-codes.workers.dev');
      const relative = decodeURIComponent(url.pathname).slice(1);
      const target =
        relative.endsWith('/') || !relative ? path.join(relative, 'index.html') : relative;
      assert(fs.existsSync(path.join(output, target)), `Broken local link in ${slug}: ${href}`);
    }
  }
}
const homepage = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
assert(homepage.includes('Sheet Codes'));
assert(
  !/<div\b[^>]*class="[^"]*catalogue-grid[^"]*"[^>]*>\s*<\/div>/.test(homepage),
  'Empty catalogue categories must not be displayed'
);
assert.equal(
  (homepage.match(/data-series-trigger/g) || []).length,
  3,
  'The catalogue must have three guide entries'
);
const catalogue = {
  django: [['django', 'Base']],
  docker: [
    ['docker', 'Base'],
    ['docker-dockerfile', 'Dockerfile'],
    ['docker-compose', 'Docker Compose']
  ],
  redis: [['redis', 'Base']]
};
for (const [family, options] of Object.entries(catalogue)) {
  const dialog = [...homepage.matchAll(/<dialog\b[^>]*>[\s\S]*?<\/dialog>/g)].find((match) =>
    match[0].includes(`id="series-${family}"`)
  )?.[0];
  assert(dialog, `Missing topic menu: ${family}`);
  const links = [...dialog.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  assert.deepEqual(
    links.map((link) => [link[1], stripHTML(link[2]).trim()]),
    options.map(([slug, label]) => [`/${slug}.html`, label]),
    `Incorrect topic options: ${family}`
  );
}
const obsoletePages = fs
  .readdirSync(output)
  .filter(
    (file) =>
      /^(django|docker|redis)-.*\.html$/.test(file) &&
      !expected.includes(path.basename(file, '.html'))
  );
assert.deepEqual(obsoletePages, [], 'Removed subtopics must not remain in the build');
assert(
  fs.readFileSync(path.join(output, 'css/learning.css'), 'utf8').includes('.learning-page-cards')
);
assert(fs.existsSync(path.join(output, 'js/learning.js')));
assert(fs.existsSync(path.join(output, 'site-version.json')));
assert(fs.existsSync(path.join(output, '404.html')), 'Pages needs a real 404 page');
for (const promotion of [
  'carbon_container',
  'adsbygoogle',
  'buymeacoffee',
  'fionaai',
  'referral.is',
  'github-stars'
]) {
  assert(!homepage.includes(promotion), `Promotional UI returned: ${promotion}`);
}
assert.equal(
  fs.readFileSync(path.join(output, 'LICENSE.txt'), 'utf8'),
  fs.readFileSync('LICENSE', 'utf8')
);
console.log(
  `Verified all ${search.length} guide routes, rendered sections, local links, shared layouts, catalogue and license.`
);
