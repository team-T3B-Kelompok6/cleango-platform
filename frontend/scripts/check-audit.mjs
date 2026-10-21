import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

const native = createRequire(import.meta.url);
const ts = native('typescript');
const root = path.resolve(import.meta.dirname, '..');
const modules = new Map();
let session = '';
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
        cookies: async () => ({
          get: () => (session ? { value: session } : undefined),
        }),
      };
    if (id === 'next/navigation')
      return {
        redirect: (url) => {
          throw Object.assign(new Error('Redirect'), { redirect: url });
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

process.env.NODE_ENV = 'development';
process.env.ADMIN_DEMO_ENABLED = 'true';
process.env.CLEANER_DEMO_DATA_DIR = mkdtempSync(
  path.join(tmpdir(), 'cleango-audit-'),
);
const audit = load(path.join(root, 'lib/audit.ts'));
const demo = load(path.join(root, 'lib/demo/admin-api.ts'));
const api = load(path.join(root, 'lib/audit-api.ts'));
globalThis.fetch = () => {
  throw new Error('Demo must not contact an upstream API');
};
const request = (url, method = 'GET', body, token = session) =>
  demo.adminDemoRequest(
    url,
    {
      method,
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
    token,
  );
const checks = [];
async function check(name, run) {
  await run();
  checks.push(name);
  console.log('PASS ' + name);
}

await check(
  'Filters validate real dates, range, action, page and search length',
  async () => {
    for (const query of [
      { from: '2026-02-30' },
      { from: '2026-99-01' },
      { from: '2026-10-22', to: '2026-10-20' },
      { action: 'constructor' },
      { page: '0' },
      { page: '1.5' },
      { q: 'x'.repeat(151) },
    ])
      assert.ok(audit.auditFilters(query).error);
    assert.equal(
      audit.auditFilters({ from: '2024-02-29', to: '2024-02-29' }).error,
      undefined,
    );
    const filters = audit.auditFilters({
      q: 'harga & layanan',
      adminId: 'admin 1',
      action: 'update',
      from: '2026-10-20',
      to: '2026-10-21',
    }).filters;
    const query = new URLSearchParams(audit.auditQuery(filters, 2));
    assert.equal(query.get('q'), 'harga & layanan');
    assert.equal(query.get('page'), '2');
    assert.equal(query.get('adminId'), 'admin 1');
  },
);

await check(
  'Date filters include the full Jakarta day across UTC boundaries',
  async () => {
    const base = {
      admin: { id: '1', name: 'Admin' },
      action: 'update',
      summary: 'Ubah harga',
      entityType: 'services',
      entityId: '1',
    };
    const logs = [
      '2026-10-19T17:00:00Z',
      '2026-10-20T16:59:59Z',
      '2026-10-20T17:00:00Z',
    ].map((createdAt, index) => ({ ...base, id: String(index), createdAt }));
    const filters = audit.auditFilters({
      from: '2026-10-20',
      to: '2026-10-20',
    }).filters;
    assert.deepEqual(
      audit.filterAuditLogs(logs, filters).map((log) => log.id),
      ['1', '0'],
    );
  },
);

await check(
  'Audit endpoints require authentication and reject writes',
  async () => {
    await assert.rejects(request('/audit-logs'), { status: 401 });
    session = (
      await request('/auth/login', 'POST', {
        username: 'admin',
        password: 'admin',
      })
    ).accessToken;
    await assert.rejects(request('/audit-logs', 'POST', {}), { status: 405 });
  },
);

await check(
  'Example history is labeled, seeded once, sorted and paginated',
  async () => {
    const result = await request('/audit-logs');
    assert.equal(result.meta.total, 9);
    assert.equal(result.data.length, 8);
    assert.equal(result.admins.length, 2);
    assert.ok(result.data.some((log) => log.isExample));
    assert.equal((await request('/audit-logs?page=2')).data.length, 1);
    assert.equal((await request('/audit-logs?page=3')).data.length, 0);
    assert.equal((await request('/audit-logs')).meta.total, 9);
    for (let index = 1; index < result.data.length; index++)
      assert.ok(
        Date.parse(result.data[index - 1].createdAt) >=
          Date.parse(result.data[index].createdAt),
      );
    const filtered = await request(
      '/audit-logs?adminId=demo-service-admin&action=create',
    );
    assert.ok(filtered.data.length > 0);
    assert.ok(
      filtered.data.every(
        (log) =>
          log.admin.id === 'demo-service-admin' && log.action === 'create',
      ),
    );
    assert.equal(
      (await request('/audit-logs?q=tidak-ada-hasil')).meta.total,
      0,
    );
  },
);

await check(
  'Successful create/update/delete capture before and after without credentials',
  async () => {
    const service = (
      await request('/services', 'POST', {
        name: 'Layanan audit',
        price: 100000,
        category: 'Rumah',
        password: 'PRIVATE',
        settings: { accessToken: 'PRIVATE', visible: true },
      })
    ).data;
    await request('/services/' + service.id, 'PATCH', { price: 150000 });
    await request('/services/' + service.id, 'DELETE');
    const result = await request(
      '/audit-logs?q=' + encodeURIComponent(service.id),
    );
    assert.equal(result.meta.total, 3);
    const updated = result.data.find((log) => log.action === 'update');
    assert.equal(updated.before.price, 100000);
    assert.equal(updated.after.price, 150000);
    const created = result.data.find((log) => log.action === 'create');
    assert.equal(created.before, null);
    const deleted = result.data.find((log) => log.action === 'delete');
    assert.equal(deleted.after, null);
    assert.ok(!JSON.stringify(result).includes('PRIVATE'));
    assert.ok(
      audit.auditChanges(updated).some((change) => change.key === 'price'),
    );
  },
);

await check(
  'Failed mutations and GET requests do not invent audit entries',
  async () => {
    const before = (await request('/audit-logs')).meta.total;
    await assert.rejects(
      request('/services/missing', 'PATCH', { price: 123 }),
      { status: 404 },
    );
    const category = (await request('/categories?resource=services')).data.find(
      (item) => item.name === 'Rumah',
    );
    await assert.rejects(request('/categories/' + category.id, 'DELETE'), {
      status: 409,
    });
    await request('/services');
    assert.equal((await request('/audit-logs')).meta.total, before);
  },
);

await check(
  'Core resources record actual changes, while audit reads remain immutable',
  async () => {
    const customer = (await request('/customers')).data[0];
    const oldAddress = customer.address;
    await request('/customers/' + customer.id, 'PATCH', {
      address: 'Alamat audit',
    });
    const logs = (await request('/audit-logs?q=' + customer.id)).data;
    assert.equal(logs[0].before.address, oldAddress);
    assert.equal(logs[0].after.address, 'Alamat audit');
    const changed = await request('/audit-logs');
    changed.data[0].summary = 'tampered';
    assert.notEqual((await request('/audit-logs')).data[0].summary, 'tampered');
    const filtered = await api.listAuditLogs(
      audit.auditFilters({ action: 'update' }).filters,
    );
    assert.ok(filtered.data.every((log) => log.action === 'update'));
  },
);

await check(
  'Category cascade records each removed service and the category',
  async () => {
    const category = (
      await request('/categories', 'POST', {
        name: 'Kategori audit cascade',
        resource: 'services',
      })
    ).data;
    const services = [];
    for (const active of [true, false])
      services.push(
        (
          await request('/services', 'POST', {
            name: 'Audit cascade ' + active,
            category: category.name,
            active,
          })
        ).data,
      );
    const before = (await request('/audit-logs')).meta.total;
    await request(
      '/categories/' + category.id + '?deleteServices=true',
      'DELETE',
    );
    assert.equal((await request('/audit-logs')).meta.total, before + 3);
    for (const entity of [category, ...services]) {
      const logs = (
        await request('/audit-logs?q=' + encodeURIComponent(entity.id))
      ).data;
      const deletion = logs.find((log) => log.action === 'delete');
      assert.equal(deletion.before.name, entity.name);
      assert.equal(deletion.after, null);
    }
  },
);

await check(
  'API mode forwards filters/auth and handles missing, failing and malformed APIs without demo fallback',
  async () => {
    process.env.ADMIN_DEMO_ENABLED = 'false';
    process.env.CLEANER_DEMO_ENABLED = 'false';
    process.env.API_URL = 'http://audit-test.invalid/api';
    const filters = audit.auditFilters({
      adminId: 'admin-1',
      action: 'update',
      from: '2026-10-20',
      to: '2026-10-21',
    }).filters;
    const payload = {
      data: [
        {
          id: '1',
          admin: { id: 'admin-1', name: 'Admin' },
          action: 'update',
          entityType: 'services',
          entityId: '1',
          summary: 'Ubah harga',
          createdAt: '2026-10-20T23:00:00Z',
          before: { price: 1, token: 'PRIVATE' },
          after: {
            price: 2,
            nested: { passwordHash: 'PRIVATE', active: true },
          },
        },
      ],
      admins: [{ id: 'admin-1', name: 'Admin' }],
      meta: { total: 1, page: 1, pageSize: 8 },
    };
    globalThis.fetch = async (input, options) => {
      const url = new URL(input);
      assert.equal(url.origin, 'http://audit-test.invalid');
      assert.equal(url.pathname, '/api/audit-logs');
      assert.equal(url.searchParams.get('adminId'), 'admin-1');
      assert.equal(url.searchParams.get('to'), '2026-10-21');
      assert.equal(options.headers.Authorization, 'Bearer ' + session);
      return Response.json(payload);
    };
    assert.ok(
      !JSON.stringify(await api.listAuditLogs(filters)).includes('PRIVATE'),
    );
    for (const status of [404, 403, 503]) {
      globalThis.fetch = async () =>
        Response.json({ message: 'Unavailable' }, { status });
      await assert.rejects(api.listAuditLogs(filters), { status });
    }
    for (const bad of [
      { data: [] },
      { ...payload, data: [{ ...payload.data[0], createdAt: 'not-a-date' }] },
      { ...payload, meta: { total: 1, page: 1, pageSize: 0 } },
    ]) {
      globalThis.fetch = async () => Response.json(bad);
      await assert.rejects(api.listAuditLogs(filters), { status: 502 });
    }
  },
);
console.log(checks.length + ' audit groups passed.');
