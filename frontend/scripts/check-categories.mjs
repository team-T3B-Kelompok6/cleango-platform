import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const native = createRequire(import.meta.url);
const ts = native('typescript');
const root = path.resolve(import.meta.dirname, '..');
process.env.NODE_ENV = 'test';
process.env.ADMIN_DEMO_ENABLED = 'false';
process.env.CLEANER_DEMO_ENABLED = 'false';
process.env.API_URL = 'http://category-test.invalid/api';
const modules = new Map();
const revalidated = [];
function load(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const require = createRequire(filename);
  const resolve = (id) => {
    if (id === 'server-only') return {};
    if (id === 'react') return { cache: (callback) => callback };
    if (id === 'next/headers')
      return {
        cookies: async () => ({ get: () => ({ value: 'test-admin-session' }) }),
      };
    if (id === 'next/cache')
      return { revalidatePath: (value) => revalidated.push(value) };
    if (id === 'next/navigation')
      return {
        redirect: (url) => {
          throw new Error('Unexpected redirect: ' + url);
        },
      };
    if (id.startsWith('.'))
      return load(path.resolve(path.dirname(filename), id + '.ts'));
    if (id.startsWith('@/')) return load(path.join(root, id.slice(2) + '.ts'));
    return require(id);
  };
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', {
    filename,
  })(resolve, module, module.exports);
  return module.exports;
}

let categories = [
  { id: 1, name: 'Rumah' },
  { id: 2, name: 'Sofa dan Kasur' },
];
let services = [];
let conflict = false;
let malformed = false;
let deletes = 0;
globalThis.fetch = async (input, options) => {
  const url = new URL(input);
  assert.equal(url.origin, 'http://category-test.invalid');
  assert.equal(options.headers.Authorization, 'Bearer test-admin-session');
  const method = options.method ?? 'GET';
  if (url.pathname === '/api/services')
    return Response.json({ data: services });
  if (url.pathname === '/api/admin/categories' && method === 'GET')
    return Response.json({ data: malformed ? [{}] : categories });
  if (url.pathname === '/api/admin/categories' && method === 'POST') {
    const body = JSON.parse(options.body);
    const category = { id: 9, name: body.name };
    categories.push(category);
    return Response.json({ data: category }, { status: 201 });
  }
  if (url.pathname === '/api/admin/categories/9' && method === 'DELETE') {
    deletes++;
    if (conflict)
      return Response.json(
        { message: 'Data masih digunakan dan tidak dapat dihapus' },
        { status: 409 },
      );
    const deleteServices = url.searchParams.get('deleteServices') === 'true';
    if (
      services.some((service) => service.category === 'Perawatan taman') &&
      !deleteServices
    )
      return Response.json(
        { message: 'Kategori masih digunakan' },
        { status: 409 },
      );
    if (deleteServices)
      services = services.filter(
        (service) => service.category !== 'Perawatan taman',
      );
    categories = categories.filter((category) => category.id !== 9);
    return Response.json({ message: 'Kategori berhasil dihapus' });
  }
  throw new Error('Unexpected request: ' + method + ' ' + url.pathname);
};

const api = load(path.join(root, 'lib/categories.ts'));
const actions = load(path.join(root, 'app/category-actions.ts'));
const form = (key, value) => {
  const data = new FormData();
  data.set(key, value);
  return data;
};
assert.deepEqual(await api.listCategories('services'), [
  { id: '1', name: 'Rumah', resource: 'services' },
  { id: '2', name: 'Sofa', resource: 'services' },
]);
assert.equal(
  (await actions.addCategory('services', {}, form('name', 'Sofa dan Kasur')))
    .errors.name,
  'Kategori ini sudah ada.',
);
assert.equal(
  (
    await actions.addCategory(
      'services',
      {},
      form('name', '  Perawatan   taman '),
    )
  ).success,
  true,
);
assert.equal(
  (await api.listCategories('services')).at(-1).name,
  'Perawatan taman',
);
assert.ok((await actions.removeCategory({}, new FormData())).message);
assert.ok(
  (await actions.removeCategory({}, form('categoryId', 'forged'))).message,
);
assert.equal(deletes, 0);
for (const active of [true, false]) {
  services = [{ id: '3', category: 'Perawatan taman', active }];
  assert.match(
    (await actions.removeCategory({}, form('categoryId', '9'))).message,
    /masih digunakan/,
  );
}
assert.equal(deletes, 0);
services = [];
conflict = true;
assert.match(
  (await actions.removeCategory({}, form('categoryId', '9'))).message,
  /masih digunakan/,
);
assert.ok(
  (await api.listCategories('services')).some(
    (category) => category.id === '9',
  ),
);
conflict = false;
assert.equal(
  (await actions.removeCategory({}, form('categoryId', '9'))).success,
  true,
);
assert.ok(
  !(await api.listCategories('services')).some(
    (category) => category.id === '9',
  ),
);
assert.ok(revalidated.includes('/layanan'));
categories.push({ id: 9, name: 'Perawatan taman' });
services = [
  { id: '3', category: 'Perawatan taman', active: true },
  { id: '4', category: 'Perawatan taman', active: false },
  { id: '5', category: 'Rumah', active: true },
];
const cascadeForm = form('categoryId', '9');
cascadeForm.set('deleteServices', 'true');
assert.match(
  (await actions.removeCategory({}, cascadeForm)).message,
  /masih digunakan/,
);
assert.equal(services.length, 3);
cascadeForm.set('deleteServices', 'on');
conflict = true;
assert.match(
  (await actions.removeCategory({}, cascadeForm)).message,
  /masih digunakan/,
);
assert.equal(services.length, 3);
assert.ok(categories.some((category) => category.id === 9));
conflict = false;
assert.equal((await actions.removeCategory({}, cascadeForm)).success, true);
assert.deepEqual(
  services.map((service) => service.id),
  ['5'],
);
assert.ok(!categories.some((category) => category.id === 9));
malformed = true;
await assert.rejects(api.listCategories('services'), { status: 502 });
console.log(
  'PASS category API mapping, aliases, create, delete, cascade consent, active/inactive services, conflict, refresh and malformed responses',
);
