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
let nextId = 9;
let uploads = 0;
let ignoreIcon = false;
let uploadUrl = '/uploads/category-icon.png';
const createdBodies = [];
const patchedBodies = [];
let rejectPatch = false;
let dropPatchIcon = false;
let wrongPatchId = false;
globalThis.fetch = async (input, options) => {
  const url = new URL(input);
  assert.equal(url.origin, 'http://category-test.invalid');
  assert.equal(options.headers.Authorization, 'Bearer test-admin-session');
  const method = options.method ?? 'GET';
  if (url.pathname === '/api/uploads') {
    uploads++;
    assert.equal(options.headers['Content-Type'], 'image/png');
    assert.ok(options.body instanceof ArrayBuffer);
    return Response.json({ data: { url: uploadUrl } });
  }
  if (url.pathname === '/api/categories' && method === 'GET')
    return Response.json({ data: [] });
  if (url.pathname === '/api/categories' && method === 'POST') {
    const body = JSON.parse(options.body);
    createdBodies.push(body);
    return Response.json({ data: { id: 'faq-1', ...body } }, { status: 201 });
  }
  if (url.pathname === '/api/services')
    return Response.json({ data: services });
  if (url.pathname === '/api/admin/categories' && method === 'GET')
    return Response.json({ data: malformed ? [{}] : categories });
  if (url.pathname === '/api/admin/categories' && method === 'POST') {
    const body = JSON.parse(options.body);
    createdBodies.push(body);
    const category = {
      id: nextId++,
      name: body.name,
      icon: ignoreIcon ? null : (body.icon ?? null),
    };
    categories.push(category);
    return Response.json({ data: category }, { status: 201 });
  }
  const categoryPath = /^\/api\/admin\/categories\/(\d+)$/.exec(url.pathname);
  if (categoryPath && method === 'PATCH') {
    const id = Number(categoryPath[1]);
    const index = categories.findIndex((category) => category.id === id);
    if (index < 0)
      return Response.json(
        { message: 'Kategori tidak ditemukan' },
        { status: 404 },
      );
    if (rejectPatch)
      return Response.json(
        { message: 'Nama sudah digunakan.' },
        { status: 409 },
      );
    const body = JSON.parse(options.body);
    patchedBodies.push(body);
    const previousName = categories[index].name;
    categories[index] = {
      ...categories[index],
      ...body,
      ...(dropPatchIcon ? { icon: null } : {}),
    };
    services = services.map((service) =>
      service.category === previousName
        ? { ...service, category: categories[index].name }
        : service,
    );
    return Response.json({
      data: { ...categories[index], ...(wrongPatchId ? { id: 12345 } : {}) },
    });
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
  { id: '1', name: 'Rumah', resource: 'services', icon: null },
  { id: '2', name: 'Sofa', resource: 'services', icon: null },
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
malformed = false;
const withIcon = (
  name,
  file = new File([new Uint8Array([1, 2, 3])], 'icon.png', {
    type: 'image/png',
  }),
) => {
  const data = form('name', name);
  data.set('categoryIcon', file);
  return data;
};
assert.ok(
  (
    await actions.addCategory(
      'services',
      {},
      withIcon(
        'Ikon SVG',
        new File(['<svg/>'], 'icon.svg', { type: 'image/svg+xml' }),
      ),
    )
  ).errors.categoryIcon,
);
assert.ok(
  (
    await actions.addCategory(
      'services',
      {},
      withIcon(
        'Ikon besar',
        new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', {
          type: 'image/png',
        }),
      ),
    )
  ).errors.categoryIcon,
);
assert.ok(
  (
    await actions.addCategory(
      'services',
      {},
      withIcon('Ikon kosong', new File([], 'empty.png', { type: 'image/png' })),
    )
  ).errors.categoryIcon,
);
assert.equal(uploads, 0);
assert.ok(
  (await actions.addCategory('services', {}, withIcon('Rumah'))).errors.name,
);
assert.equal(uploads, 0);
assert.equal(
  (await actions.addCategory('services', {}, withIcon('Kategori berikon')))
    .success,
  true,
);
assert.equal(uploads, 1);
assert.equal(createdBodies.at(-1).icon, '/uploads/category-icon.png');
assert.ok(!('iconUrl' in createdBodies.at(-1)));
assert.equal(
  (await api.listCategories('services')).at(-1).icon,
  '/uploads/category-icon.png',
);
ignoreIcon = true;
assert.ok(
  (await actions.addCategory('services', {}, withIcon('API tanpa ikon'))).errors
    .categoryIcon,
);
ignoreIcon = false;
uploadUrl = 'javascript:alert(1)';
const before = createdBodies.length;
assert.ok(
  (await actions.addCategory('services', {}, withIcon('Upload tidak valid')))
    .message,
);
assert.equal(createdBodies.length, before);
const uploadCount = uploads;
assert.equal(
  (await actions.addCategory('faqs', {}, withIcon('Kategori FAQ'))).success,
  true,
);
assert.equal(uploads, uploadCount);
assert.ok(!('icon' in createdBodies.at(-1)));
uploadUrl = '/uploads/updated-category.png';
categories.push({
  id: 99,
  name: 'Kategori lama',
  icon: '/uploads/current.png',
});
services = [
  { id: 's1', category: 'Kategori lama', active: true },
  { id: 's2', category: 'Kategori lama', active: false },
];
const editForm = (name) => {
  const data = form('name', name);
  data.set('categoryId', '99');
  return data;
};
assert.ok((await actions.updateCategory({}, new FormData())).message);
assert.ok((await actions.updateCategory({}, editForm(''))).errors.name);
assert.ok((await actions.updateCategory({}, editForm('Rumah'))).errors.name);
const missingCategory = editForm('Hilang');
missingCategory.set('categoryId', 'missing');
assert.ok((await actions.updateCategory({}, missingCategory)).message);
assert.equal(patchedBodies.length, 0);
assert.equal(
  (await actions.updateCategory({}, editForm('Kategori lama'))).success,
  true,
);
assert.equal(patchedBodies.length, 0);
const renamed = await actions.updateCategory(
  {},
  editForm('  Kategori   baru  '),
);
assert.equal(renamed.success, true);
assert.equal(renamed.values.previousName, 'Kategori lama');
assert.equal(renamed.values.name, 'Kategori baru');
assert.ok(!('icon' in patchedBodies.at(-1)));
assert.equal(
  (await api.listCategories('services')).find(
    (category) => category.id === '99',
  ).icon,
  '/uploads/current.png',
);
assert.deepEqual(
  services.map((service) => service.category),
  ['Kategori baru', 'Kategori baru'],
);
const changeIcon = editForm('Kategori baru');
changeIcon.set(
  'categoryIcon',
  new File([new Uint8Array([1, 2, 3])], 'icon.png', { type: 'image/png' }),
);
assert.equal((await actions.updateCategory({}, changeIcon)).success, true);
assert.equal(patchedBodies.at(-1).icon, '/uploads/updated-category.png');
const removeIcon = editForm('Kategori baru');
removeIcon.set('removeCategoryIcon', 'true');
assert.equal((await actions.updateCategory({}, removeIcon)).success, true);
assert.equal(patchedBodies.at(-1).icon, null);
const previousPatches = patchedBodies.length;
assert.equal((await actions.updateCategory({}, removeIcon)).success, true);
assert.equal(patchedBodies.length, previousPatches);
categories.find((category) => category.id === 99).icon = '/uploads/current.png';
dropPatchIcon = true;
assert.ok(
  (await actions.updateCategory({}, editForm('Nama dengan ikon'))).errors
    .categoryIcon,
);
dropPatchIcon = false;
rejectPatch = true;
const conflictEdit = await actions.updateCategory({}, editForm('Nama ditolak'));
assert.equal(conflictEdit.success, undefined);
assert.equal(conflictEdit.values.name, 'Nama ditolak');
assert.match(conflictEdit.message, /digunakan/);
rejectPatch = false;
wrongPatchId = true;
assert.match(
  (await actions.updateCategory({}, editForm('ID salah'))).message,
  /Respons/,
);
wrongPatchId = false;
const badEditIcon = editForm('Ikon salah');
badEditIcon.set(
  'categoryIcon',
  new File(['<svg/>'], 'bad.svg', { type: 'image/svg+xml' }),
);
assert.ok((await actions.updateCategory({}, badEditIcon)).errors.categoryIcon);
console.log(
  'PASS category create/edit/delete, icon replacement/removal, preserved icons, rename, duplicates, no-op saves, conflicts, upload limits, and malformed responses',
);
