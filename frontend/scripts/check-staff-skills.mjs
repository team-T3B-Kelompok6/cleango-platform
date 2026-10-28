import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const native = createRequire(import.meta.url);
const ts = native('typescript');
const root = path.resolve(import.meta.dirname, '..');
process.env.NODE_ENV = 'test';
process.env.ADMIN_DEMO_ENABLED = 'false';
process.env.CLEANER_DEMO_ENABLED = 'false';
process.env.API_URL = 'http://staff-skill-test.invalid/api';
class Redirect extends Error {
  constructor(url) {
    super(url);
    this.url = url;
  }
}
const modules = new Map();
function load(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const resolve = (id) => {
    if (id === 'server-only') return {};
    if (id === 'react') return { cache: (callback) => callback };
    if (id === 'next/headers')
      return {
        cookies: async () => ({ get: () => ({ value: 'skill-test-session' }) }),
      };
    if (id === 'next/cache') return { revalidatePath: () => {} };
    if (id === 'next/navigation')
      return {
        redirect: (url) => {
          throw new Redirect(url);
        },
      };
    if (id.startsWith('.') || id.startsWith('@/')) {
      const base = id.startsWith('@/')
        ? path.join(root, id.slice(2))
        : path.resolve(path.dirname(filename), id);
      const target = base + (existsSync(base + '.ts') ? '.ts' : '.tsx');
      if (target.endsWith('.tsx') && !target.endsWith('ResourceFormServer.tsx'))
        return {
          ResourceForm: 'ResourceForm',
          Badge: 'Badge',
          ServiceForm: 'ServiceForm',
          OrderEditor: 'OrderEditor',
          ScheduleEditor: 'ScheduleEditor',
        };
      return load(target);
    }
    return native(id);
  };
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', {
    filename,
  })(resolve, module, module.exports);
  return module.exports;
}
let services = [
  { id: '1', name: 'Deep Cleaning Rumah', active: true },
  { id: '2', name: 'Cuci AC', active: false },
  { id: '3', name: 'Cuci AC', active: true },
];
let writes = 0;
let fail = false;
let uploads = 0;
let persistedPhoto = '/uploads/old.png';
let lastPatch;
let omitPhoto = false;
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(input);
  assert.equal(url.origin, 'http://staff-skill-test.invalid');
  assert.equal(options.headers.Authorization, 'Bearer skill-test-session');
  if (url.pathname === '/api/services')
    return Response.json({ data: services });
  if (url.pathname === '/api/uploads') {
    uploads++;
    assert.equal(options.headers['Content-Type'], 'image/png');
    assert.ok(options.body instanceof ArrayBuffer);
    return Response.json({ data: { url: '/uploads/staff.png' } });
  }
  if (url.pathname === '/api/staff/1' && options.method === 'PATCH') {
    writes++;
    const data = JSON.parse(options.body);
    lastPatch = data;
    if (fail)
      return Response.json(
        {
          message: 'Daftar layanan berubah.',
          errors: { skills: 'Pilih kembali keahlian.' },
        },
        { status: 400 },
      );
    if ('photoUrl' in data && !omitPhoto) persistedPhoto = data.photoUrl;
    const saved = {
      id: '1',
      ...data,
      skills: [...data.skills].reverse(),
      photoUrl: persistedPhoto,
    };
    if (omitPhoto) delete saved.photoUrl;
    return Response.json({ data: saved });
  }
  throw new Error('Unexpected request ' + url.pathname);
};
const { ResourceFormServer } = load(
  path.join(root, 'components/ResourceFormServer.tsx'),
);
const { saveAction } = load(path.join(root, 'app/actions.ts'));
const record = {
  id: '1',
  name: 'Petugas',
  phone: '0812345678',
  status: 'Tersedia',
  skills: ['Sanitasi'],
};
const field = (
  await ResourceFormServer({ resource: 'staff', record })
).props.fields.find((field) => field.name === 'skills');
assert.equal(field.kind, 'multiselect');
assert.deepEqual(field.options, ['Cuci AC', 'Deep Cleaning Rumah']);
assert.match(field.hint, /Sanitasi/);
const form = (skills) => {
  const data = new FormData();
  for (const name of ['name', 'phone', 'status']) data.set(name, record[name]);
  for (const skill of skills) data.append('skills', skill);
  return data;
};
assert.ok((await saveAction('staff', '1', {}, form([]))).errors.skills);
assert.ok(
  (await saveAction('staff', '1', {}, form(['Sanitasi']))).errors.skills,
);
assert.equal(writes, 0);
await assert.rejects(
  saveAction('staff', '1', {}, form(['Cuci AC', 'Deep Cleaning Rumah'])),
  { url: '/petugas?saved=1' },
);
assert.equal(writes, 1);
fail = true;
const failed = await saveAction(
  'staff',
  '1',
  {},
  form(['Cuci AC', 'Deep Cleaning Rumah']),
);
assert.deepEqual(failed.values.skills, ['Cuci AC', 'Deep Cleaning Rumah']);
assert.ok(failed.errors.skills);
services = [{ id: '4', name: 'Layanan baru', active: true }];
const updated = (
  await ResourceFormServer({ resource: 'staff', record })
).props.fields.find((field) => field.name === 'skills');
assert.deepEqual(updated.options, ['Layanan baru']);
assert.ok(
  (await saveAction('staff', '1', {}, form(['Cuci AC']))).errors.skills,
);
assert.equal(writes, 2);
services = [];
const empty = (
  await ResourceFormServer({ resource: 'staff' })
).props.fields.find((field) => field.name === 'skills');
assert.deepEqual(empty.options, []);
assert.match(empty.emptyMessage, /Kelola Layanan/);
services = [{ id: '2', name: 'Cuci AC', active: true }];
fail = false;
const invalidPhoto = form(['Cuci AC']);
invalidPhoto.set(
  'staffPhoto',
  new File(['<svg/>'], 'photo.svg', { type: 'image/svg+xml' }),
);
assert.ok((await saveAction('staff', '1', {}, invalidPhoto)).errors.staffPhoto);
const largePhoto = form(['Cuci AC']);
largePhoto.set(
  'staffPhoto',
  new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', {
    type: 'image/png',
  }),
);
assert.ok((await saveAction('staff', '1', {}, largePhoto)).errors.staffPhoto);
assert.equal(uploads, 0);
const photoForm = () => {
  const data = form(['Cuci AC']);
  data.set(
    'staffPhoto',
    new File([new Uint8Array([1, 2, 3])], 'photo.png', { type: 'image/png' }),
  );
  return data;
};
await assert.rejects(saveAction('staff', '1', {}, photoForm()), {
  url: '/petugas?saved=1',
});
assert.equal(persistedPhoto, '/uploads/staff.png');
await assert.rejects(saveAction('staff', '1', {}, form(['Cuci AC'])), {
  url: '/petugas?saved=1',
});
assert.equal(persistedPhoto, '/uploads/staff.png');
assert.ok(!('photoUrl' in lastPatch));
const removePhoto = form(['Cuci AC']);
removePhoto.set('removeStaffPhoto', 'true');
await assert.rejects(saveAction('staff', '1', {}, removePhoto), {
  url: '/petugas?saved=1',
});
assert.equal(persistedPhoto, null);
omitPhoto = true;
assert.ok((await saveAction('staff', '1', {}, photoForm())).errors.staffPhoto);
const photoRecord = await ResourceFormServer({
  resource: 'staff',
  record: { ...record, photoUrl: '/uploads/staff.png' },
});
assert.equal(
  photoRecord.props.staffPhoto,
  'http://staff-skill-test.invalid/uploads/staff.png',
);
console.log(
  'PASS staff service choices, validation, photo upload, removal, preserved photos, upload limits, and unsaved photo detection',
);
