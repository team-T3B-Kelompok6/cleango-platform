import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const relative = (filename) => path.relative(root, filename).replaceAll('\\', '/');
const walk = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(filename) : [filename];
  });
const files = walk(root);
let links = 0;
let images = 0;
for (const filename of files) {
  const name = relative(filename);
  assert.ok(!/(^|\/)(\.env[^/]*|node_modules|\.local)(\/|$)/.test(name), name);
  const extension = path.extname(filename);
  if (extension === '.md' || extension === '.html') {
    const content = fs.readFileSync(filename, 'utf8');
    const targets = extension === '.html'
      ? [...content.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1])
      : [...content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1]);
    for (const target of targets) {
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const destination = path.resolve(path.dirname(filename), decodeURIComponent(target.split(/[?#]/)[0]));
      assert.ok(destination.startsWith(root + path.sep), name + ': ' + target);
      assert.ok(fs.existsSync(destination), name + ': missing ' + target);
      links++;
    }
  }
  if (extension === '.jpg' || extension === '.png') {
    const bytes = fs.readFileSync(filename);
    assert.ok(bytes.length > 1000, name);
    if (extension === '.jpg') assert.equal(bytes.subarray(0, 2).toString('hex'), 'ffd8', name);
    else assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', name);
    images++;
  }
}
const parse = (name) => JSON.parse(fs.readFileSync(path.join(root, 'checks', name), 'utf8').replace(/^\uFEFF/, ''));
const browser = parse('browser-results.json');
const supplemental = parse('browser-supplemental.json');
assert.equal(browser.checks.length, 34);
assert.equal(supplemental.checks.length, 14);
assert.ok([...browser.checks, ...supplemental.checks].every((check) => check.result === 'pass'));
assert.equal(browser.screens.length, 33);
for (const screen of browser.screens) {
  assert.ok(fs.existsSync(path.join(root, 'screenshots', screen.file)), screen.file);
  if (screen.geometry) assert.ok(screen.geometry.scrollWidth <= screen.geometry.width, screen.file);
}
const screenshotCount = fs.readdirSync(path.join(root, 'screenshots')).length;
assert.equal(screenshotCount, 54);
const csv = fs.readFileSync(path.join(root, 'laporan-demo.csv'), 'utf8');
assert.ok(csv.trim().split(/\r?\n/).length > 2);
const report = {
  generatedAt: new Date().toISOString(),
  result: 'pass',
  scope: 'Integrity of evidence files and recorded results, not a live production test',
  localLinks: links,
  images,
  screenshots: screenshotCount,
  browserChecks: browser.checks.length + supplemental.checks.length,
  responsiveCases: browser.screens.length,
  productionIntegration: 'not verified; see README API matrix',
};
fs.writeFileSync(path.join(root, 'checks', 'artifact-validation.json'), JSON.stringify(report, null, 2) + '\n');
const manifest = walk(root).filter((filename) => path.basename(filename) !== 'MANIFEST.sha256')
  .sort().map((filename) => createHash('sha256').update(fs.readFileSync(filename)).digest('hex') + '  ' + relative(filename));
fs.writeFileSync(path.join(root, 'MANIFEST.sha256'), manifest.join('\n') + '\n');
console.log(JSON.stringify(report, null, 2));
