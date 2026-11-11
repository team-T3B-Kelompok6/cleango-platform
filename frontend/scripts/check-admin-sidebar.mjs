import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { Window } = await import(process.env.CLEANGO_TEST_DOM_MODULE);

const failures = [];
function check(name, fn) {
  try {
    fn();
  } catch (err) {
    failures.push(`${name}: ${err.message}`);
  }
}

const app = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const layout = readFileSync(join(app, 'layout.tsx'), 'utf8');
const cssFiles = [...layout.matchAll(/import\s+['"](\.\/[^'"]*\.css)['"]/g)].map((match) => match[1]);

const sizes = [
  [1920, 1080],
  [1366, 768],
  [980, 768],
  [701, 768],
  [700, 768],
  [390, 844],
];

for (const [w, h] of sizes) {
  const window = new Window({ url: 'http://localhost/', width: w, height: h });
  try {
    const document = window.document;

    for (const rel of cssFiles) {
      const css = readFileSync(join(app, rel), 'utf8');
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    }

    const fixture = `
<div class="app-shell" data-sidebar-collapsed>
  <aside class="sidebar sidebar--collapsed" aria-label="Navigasi utama">
    <div class="sidebar-brand">
      <a class="brand" aria-label="Beranda Cleango">
        <span class="cleango-logo"></span>
        <span class="brand-copy">cleango</span>
      </a>
      <button type="button" class="sidebar-toggle" aria-label="Perlebar sidebar"></button>
    </div>
    <nav>
      <a class="nav-link" aria-label="Dashboard"><span class="nav-link-label">Dashboard</span></a>
    </nav>
  </aside>
  <div class="workspace"></div>
</div>
`;
    document.body.innerHTML = fixture;

    const aside = document.querySelector('.sidebar');
    const workspace = document.querySelector('.workspace');
    const logo = document.querySelector('.cleango-logo');
    const label = document.querySelector('.nav-link-label');
    const brandCopy = document.querySelector('.brand-copy');
    const desktop = w >= 701;

    const cs = window.getComputedStyle(aside);
    const ws = window.getComputedStyle(workspace);
    const ls = window.getComputedStyle(logo);
    const ts = window.getComputedStyle(label);
    const bs = window.getComputedStyle(brandCopy);

    check(`sidebar width ${w}x${h}`, () => {
      if (desktop) assert.strictEqual(cs.width, '72px');
    });
    check(`workspace marginLeft ${w}x${h}`, () => {
      assert.strictEqual(ws.marginLeft, desktop ? '72px' : '0px');
    });
    check(`logo width ${w}x${h}`, () => {
      assert.strictEqual(ls.width, '40px');
    });
    check(`logo opacity ${w}x${h}`, () => {
      if (desktop) assert.notStrictEqual(ls.opacity, '0');
    });
    check(`label display ${w}x${h}`, () => {
      if (desktop) assert.strictEqual(ts.display, 'none');
      else assert.notStrictEqual(ts.display, 'none');
    });
    check(`brand-copy display ${w}x${h}`, () => {
      if (desktop) assert.strictEqual(bs.display, 'none');
      else assert.notStrictEqual(bs.display, 'none');
    });
  } finally {
    await window.close();
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Lulus: ${sizes.length} viewport sidebar`);
}
