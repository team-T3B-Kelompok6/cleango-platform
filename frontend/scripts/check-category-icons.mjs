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
const upload = (file) => module.exports.uploadImage(file, 'category-icon');
const file = new File([new Uint8Array([1, 2, 3])], 'icon.png', {
  type: 'image/png',
});
assert.equal(await upload(file), '/uploads/icon.png');
assert.equal(sent.path, '/uploads');
assert.equal(sent.headers['Content-Type'], 'image/png');
assert.deepEqual(new Uint8Array(sent.body), new Uint8Array([1, 2, 3]));
demo = true;
await upload(file);
assert.ok(sent.body instanceof FormData);
assert.equal(sent.body.get('file').name, 'icon.png');
assert.equal(sent.body.get('purpose'), 'category-icon');
for (const invalid of [
  'javascript:alert(1)',
  '//other.example/icon.png',
  '/bad path.png',
  '/bad\\path.png',
]) {
  responseUrl = invalid;
  await assert.rejects(upload(file), ApiError);
}
console.log(
  'PASS category icon upload: Express bytes, demo upload, and invalid response URLs',
);
