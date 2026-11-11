import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const module = { exports: {} };
const code = ts.transpileModule(
  readFileSync(new URL('../lib/service-media.ts', import.meta.url), 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
vm.runInThisContext('(function(require,module,exports){' + code + '\n})')(
  () => ({}),
  module,
  module.exports,
);
const serviceMediaUrl = module.exports.serviceMediaUrl;
const origin = 'http://127.0.0.1:3101';
assert.equal(serviceMediaUrl('/uploads/service.png', origin), 'http://127.0.0.1:3101/uploads/service.png');
assert.equal(serviceMediaUrl('https://cdn.example.com/a.png', origin), 'https://cdn.example.com/a.png');
assert.equal(serviceMediaUrl('/uploads/service.png', ''), '/uploads/service.png');
assert.equal(serviceMediaUrl('/assets/images/x.png', origin), '/assets/images/x.png');
assert.equal(serviceMediaUrl('', origin), '');

const sourceFiles = [
  'components/ResourceFormServer.tsx',
  'components/ServiceList.tsx',
  'components/RecordDetailServer.tsx',
];
for (const file of sourceFiles) {
  const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  assert.ok(source.includes('serviceMediaUrl'), file + ' must transform service image URLs');
}
console.log('PASS service image preview: Express upload paths resolve to backend origin');
