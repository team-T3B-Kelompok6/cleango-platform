import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '..');

const module = { exports: {} };
const code = ts.transpileModule(
  readFileSync(path.join(root, 'lib/pagination.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
vm.runInThisContext('(function(require,module,exports){' + code + '\n})', {
  filename: 'lib/pagination.ts',
})(require, module, module.exports);
const pagination = module.exports;

const records = Array.from({ length: 23 }, (_, index) => index + 1);

// Nomor halaman dari query string.
assert.equal(pagination.parsePage('2'), 2);
assert.equal(pagination.parsePage(3), 3);
for (const invalid of ['0', '-2', 'abc', '', null, 1.5, NaN])
  assert.equal(pagination.parsePage(invalid), 1, String(invalid));

// Potong per 10 dan jepit halaman berlebih.
const first = pagination.paginate(records, 1);
assert.equal(first.page, 1);
assert.equal(first.pageCount, 3);
assert.deepEqual(first.shown, records.slice(0, 10));
assert.deepEqual([first.from, first.to, first.total], [1, 10, 23]);

const last = pagination.paginate(records, 3);
assert.deepEqual(last.shown, [21, 22, 23]);
assert.deepEqual([last.from, last.to], [21, 23]);

const clamped = pagination.paginate(records, 9);
assert.equal(clamped.page, 3);
assert.deepEqual(clamped.shown, [21, 22, 23]);

const empty = pagination.paginate([], 2);
assert.equal(empty.page, 1);
assert.equal(empty.pageCount, 1);
assert.deepEqual(empty.shown, []);
assert.deepEqual([empty.from, empty.to, empty.total], [0, 0, 0]);

// Tautan halaman mempertahankan filter dan membuang page lama.
assert.equal(pagination.pageHref('/pesanan', {}, 1), '/pesanan');
assert.equal(
  pagination.pageHref('/pesanan', { q: 'krisna', tab: 'Batal', page: '2' }, 3),
  '/pesanan?q=krisna&tab=Batal&page=3',
);
assert.equal(
  pagination.pageHref('/pesanan', { q: 'krisna', tab: '' }, 1),
  '/pesanan?q=krisna',
);

// Jendela nomor halaman.
assert.deepEqual(pagination.pageWindow(1, 5), [1, 2, 3, 4, 5]);
assert.deepEqual(pagination.pageWindow(1, 10), [1, 2, '…', 10]);
assert.deepEqual(pagination.pageWindow(5, 10), [1, '…', 4, 5, 6, '…', 10]);
assert.deepEqual(pagination.pageWindow(10, 10), [1, '…', 9, 10]);

console.log(
  'PASS paginasi: parse, potong 10, jepit halaman, tautan, jendela nomor',
);
