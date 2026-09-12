const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const output = path.resolve('public');
const search = JSON.parse(fs.readFileSync(path.join(output, 'search.json'), 'utf8'));
assert(search.length > 200, 'The cheat sheet collection must be generated');
for (const sheet of search) {
  assert(sheet.title?.trim(), `Missing title: ${sheet.path}`);
  assert(sheet.path.startsWith('/'), `Search URL must be local: ${sheet.path}`);
  assert(fs.existsSync(path.join(output, sheet.path)), `Missing sheet: ${sheet.path}`);
}
assert(search.some((sheet) => sheet.title === 'Windows Shortcuts'));
const homepage = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
assert(homepage.includes('Sheet Codes'));
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
console.log(`Verified ${search.length} searchable sheets, personal branding and license.`);
