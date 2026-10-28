import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
let demo = false;
let sent;
let responseUrl = '/uploads/icon.png';
class ApiError extends Error {}
const module = { exports: {} };
const code = ts.transpileModule(
  readFileSync(new URL('../lib/service-image.ts', import.meta.url), 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
vm.runInThisContext('(function(require,module,exports){' + code + '\n})')(
  (id) => {
    if (id === 'server-only') return {};
    if (id === './demo/mode') return { adminDemoEnabled: () => demo };
    if (id === './api')
      return {
        ApiError,
        request: async (path, options) => {
          sent = { path, ...options };
          return { data: { url: responseUrl } };
        },
      };
    throw new Error('Unexpected import ' + id);
  },
  module,
  module.exports,
);

const { uploadServiceIcon } = module.exports;
const file = new File([new Uint8Array([1, 2, 3])], 'icon.png', {
  type: 'image/png',
});
assert.equal(await uploadServiceIcon(file), '/uploads/icon.png');
assert.equal(sent.path, '/uploads');
assert.equal(sent.headers['Content-Type'], 'image/png');
assert.deepEqual(new Uint8Array(sent.body), new Uint8Array([1, 2, 3]));
demo = true;
await uploadServiceIcon(file);
assert.ok(sent.body instanceof FormData);
assert.equal(sent.body.get('file').name, 'icon.png');
for (const invalid of [
  'javascript:alert(1)',
  '//other.example/icon.png',
  '/bad path.png',
  '/bad\\path.png',
]) {
  responseUrl = invalid;
  await assert.rejects(uploadServiceIcon(file), ApiError);
}
console.log(
  'PASS service icon upload: Express bytes, isolated demo upload, invalid response URLs',
);
