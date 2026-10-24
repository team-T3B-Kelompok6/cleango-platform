// Isolated frontend demo checks. Never reads/writes the user's demo directory.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
const native = createRequire(import.meta.url);
const ts = native('typescript');
const root = path.resolve(import.meta.dirname, '..');
process.env.NODE_ENV = 'development';
process.env.ADMIN_DEMO_ENABLED = 'true';
process.env.CLEANER_DEMO_DATA_DIR = mkdtempSync(
  path.join(tmpdir(), 'cleango-admin-demo-'),
);
const modules = new Map();
function load(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const require = createRequire(filename);
  const resolve = (id) => {
    if (id === 'server-only') return {};
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
// Any accidental upstream traffic fails the test immediately.
globalThis.fetch = () => {
  throw new Error('Demo must not contact an upstream API.');
};
const api = load(path.join(root, 'lib/demo/admin-api.ts'));
const cleaner = load(path.join(root, 'lib/cleaner/demo-store.ts'));
const request = (url, method = 'GET', body, token = session) =>
  api.adminDemoRequest(
    url,
    { method, ...(body ? { body: JSON.stringify(body) } : {}) },
    token,
  );
let session = '';
const checks = [];
async function check(name, run) {
  await run();
  checks.push(name);
  console.log('PASS ' + name);
}
await check('Authentication required; wrong credentials rejected', async () => {
  await assert.rejects(request('/orders'), { status: 401 });
  await assert.rejects(
    request('/auth/login', 'POST', { username: 'admin', password: 'wrong' }),
    { status: 401 },
  );
  session = (
    await request('/auth/login', 'POST', {
      username: 'admin',
      password: 'admin',
    })
  ).accessToken;
});
await check(
  'All pages have linked data, optional metrics, photos, and varied states',
  async () => {
    const resources = [
      'orders',
      'schedules',
      'services',
      'staff',
      'customers',
      'faqs',
      'promos',
      'banners',
    ];
    const datasets = Object.fromEntries(
      await Promise.all(
        resources.map(async (resource) => [
          resource,
          (await request('/' + resource)).data,
        ]),
      ),
    );
    assert.equal(datasets.orders.length, 20);
    assert.equal(
      datasets.orders.filter((item) => item.status === 'Menunggu Assign')
        .length,
      6,
    );
    assert.equal(datasets.services.length, 6);
    assert.equal(datasets.faqs.length, 7);
    for (const order of datasets.orders) {
      assert.ok(
        datasets.customers.some((item) => item.id === order.customerId),
      );
      assert.ok(
        order.staff.every((name) =>
          datasets.staff.some((item) => item.name === name),
        ),
      );
      assert.ok(Number.isFinite(order.price) && Array.isArray(order.staff));
    }
    assert.ok(
      datasets.customers.every(
        (item) =>
          /^08\d{2}-\d{4}-\d{4}$/.test(item.phone) &&
          item.isDemo === true &&
          item.email.endsWith('@example.com'),
      ),
    );
    assert.ok(datasets.faqs.every((item) => Number.isFinite(item.viewCount)));
    assert.ok(datasets.staff.every((item) => item.joined && item.rating));
    assert.ok(
      datasets.services.every((item) => item.imageUrl && item.features.length),
    );
    assert.ok(
      datasets.orders.some((item) => item.paymentMethod && item.invoiceId),
    );
  },
);
await check(
  'Contact migration replaces placeholders, preserves edited contacts and task progress',
  async () => {
    const before = await cleaner.demoTransaction((store) => {
      store.admin.contactRevision = undefined;
      store.entities.customers[0].phone = '0000000000';
      store.entities.customers[0].email = 'uji01@example.test';
      store.entities.customers[1].phone = '0812-3333-4444';
      store.entities.customers[1].email = 'bagas.edited@example.com';
      return JSON.stringify(store.tasks);
    });
    const people = (await request('/customers')).data;
    assert.equal(people[0].email, 'amanda.pratama@example.com');
    assert.equal(people[0].phone, '0812-8456-2001');
    assert.equal(people[1].phone, '0812-3333-4444');
    assert.equal(people[1].email, 'bagas.edited@example.com');
    assert.equal(
      await cleaner.demoTransaction((store) => JSON.stringify(store.tasks)),
      before,
    );
  },
);
await check(
  'Repeated initialization never duplicates or resets existing cleaner progress',
  async () => {
    const before = await request('/orders');
    await request('/auth/login', 'POST', {
      username: 'admin',
      password: 'admin',
    });
    assert.deepEqual(await request('/orders'), before);
    const entry = (await cleaner.demoTaskSummaries()).find(
      (item) => item.task.orderId === 'DEMO-ACTIVE-07',
    );
    assert.equal(entry.task.stage, 'working');
    assert.equal(entry.task.linkDelivery.status, 'simulated');
  },
);
await check(
  'CRUD persists and deleted records remain deleted after reads',
  async () => {
    const created = (
      await request('/faqs', 'POST', {
        question: '[UJI] FAQ test',
        answer: 'Jawaban pengujian',
        category: 'Pemesanan',
        published: false,
      })
    ).data;
    await request('/faqs/' + created.id, 'PATCH', {
      answer: 'Jawaban yang sudah diubah.',
    });
    assert.equal(
      (await request('/faqs/' + created.id)).data.answer,
      'Jawaban yang sudah diubah.',
    );
    await request('/faqs/' + created.id, 'DELETE');
    await assert.rejects(request('/faqs/' + created.id), { status: 404 });
    assert.equal((await request('/faqs')).data.length, 7);
  },
);
await check(
  'Exact routes reject dispatch payloads and unsupported creates',
  async () => {
    const count = (await request('/orders')).data.length;
    await assert.rejects(
      request('/orders/DEMO-ORD-01/cleaner-tasks', 'POST', { resend: true }),
      { status: 404 },
    );
    await assert.rejects(request('/orders', 'POST', { staffName: 'wrong' }), {
      status: 405,
    });
    await assert.rejects(request('/schedules', 'POST', {}), { status: 400 });
    assert.equal((await request('/orders')).data.length, count);
  },
);
await check(
  'Assign, depart, complete, and retry preserve report with simulation delivery',
  async () => {
    const pending = (await request('/orders/DEMO-ORD-03')).data;
    const previousShift = (await request('/schedules')).data.find(
      (shift) =>
        shift.staff === 'Fajar Hidayat' &&
        shift.date === pending.date &&
        shift.time === '13.00–17.00 WIB',
    );
    await request(
      previousShift ? '/schedules/' + previousShift.id : '/schedules',
      previousShift ? 'PATCH' : 'POST',
      {
        staff: 'Fajar Hidayat',
        date: pending.date,
        time: '13.00–17.00 WIB',
        status: 'Terjadwal',
      },
    );
    await request('/orders/DEMO-ORD-03', 'PATCH', {
      staff: ['Fajar Hidayat'],
      status: 'Menunggu Lokasi',
    });
    const entry = (await cleaner.issueDemoTasks('DEMO-ORD-03'))[0];
    const token = entry.publicPath.split('/').at(-1);
    await cleaner.demoEvent(token, { kind: 'depart' });
    assert.equal(
      (await request('/orders/DEMO-ORD-03')).data.status,
      'Menuju Lokasi',
    );
    assert.equal(
      (await request('/staff')).data.find(
        (person) => person.name === 'Fajar Hidayat',
      ).status,
      'Bertugas',
    );
    const departure = (await cleaner.demoTaskByToken(token)).departedAt;
    await cleaner.demoEvent(token, { kind: 'depart' });
    assert.equal((await cleaner.demoTaskByToken(token)).departedAt, departure);
    await cleaner.demoEvent(token, { kind: 'arrive' });
    await cleaner.demoEvent(token, {
      kind: 'complete',
      summary: 'Seluruh ruangan bersih dan telah diperiksa.',
      checked: true,
    });
    await cleaner.sendDemo(entry.task.id, 'report');
    const task = await cleaner.demoTaskByToken(token);
    assert.equal(task.stage, 'completed');
    assert.equal(task.reportDelivery.status, 'failed');
    assert.equal((await request('/orders/DEMO-ORD-03')).data.status, 'Selesai');
    const savedOrder = (await request('/orders/DEMO-ORD-03')).data;
    assert.equal(savedOrder.startedAt, task.startedAt);
    assert.equal(savedOrder.completedAt, task.completedAt);
    assert.equal(
      (await request('/staff')).data.find(
        (person) => person.name === 'Fajar Hidayat',
      ).status,
      'Tersedia',
    );
    await cleaner.sendDemo(entry.task.id, 'report', true);
    assert.equal(
      (await cleaner.demoTaskByToken(token)).reportDelivery.status,
      'simulated',
    );
  },
);
await check(
  'Staff shifts contain no customer fields; duplicate shifts rejected and independent CRUD persists',
  async () => {
    const before = (await request('/schedules')).data;
    assert.ok(
      before.every(
        (shift) => !shift.customer && !shift.service && !shift.address,
      ),
    );
    const created = (
      await request('/schedules', 'POST', {
        staff: 'Dina Rahma',
        date: '2026-12-20',
        time: '08.00–12.00 WIB',
        status: 'Terjadwal',
      })
    ).data;
    await assert.rejects(
      request('/schedules', 'POST', {
        staff: 'Dina Rahma',
        date: '2026-12-20',
        time: '09.00–11.00 WIB',
        status: 'Terjadwal',
      }),
      { status: 409 },
    );
    await request('/schedules/' + created.id, 'PATCH', {
      time: '13.00–17.00 WIB',
    });
    assert.equal(
      (await request('/schedules/' + created.id)).data.time,
      '13.00–17.00 WIB',
    );
    await request('/schedules/' + created.id, 'DELETE');
    await assert.rejects(request('/schedules/' + created.id), { status: 404 });
    assert.equal((await request('/schedules')).data.length, before.length);
  },
);
await check(
  'Assignment requires matching shift; linked active shifts cannot be moved or deleted; overlapping jobs rejected',
  async () => {
    const rules = load(path.join(root, 'lib/staff-schedules.ts'));
    const order = (await request('/orders/DEMO-CHECK-01')).data;
    const person = (await request('/staff')).data.find(
      (person) => person.name === 'Dina Rahma',
    );
    const shifts = (await request('/schedules')).data;
    const allOrders = (await request('/orders')).data;
    assert.equal(
      rules.assignmentIssue(person, order, [], allOrders),
      'Belum ada shift aktif yang mencakup tanggal dan jam pesanan.',
    );
    const shift = shifts.find(
      (shift) =>
        shift.staff === person.name &&
        shift.date === order.date &&
        rules.scheduleCovers(shift, { ...order, staff: [person.name] }),
    );
    assert.ok(shift);
    const assignment = (
      await request('/orders/' + order.id, 'PATCH', {
        staff: [person.name],
        status: 'Menunggu Lokasi',
      })
    ).data;
    assert.ok(rules.linkedOrders(shift, [assignment]).length === 1);
    await assert.rejects(
      request('/schedules/' + shift.id, 'PATCH', { status: 'Nonaktif' }),
      { status: 409 },
    );
    await assert.rejects(request('/schedules/' + shift.id, 'DELETE'), {
      status: 409,
    });
    await assert.rejects(
      request('/orders/DEMO-CHECK-02', 'PATCH', {
        staff: [person.name],
        date: order.date,
        time: order.time,
        status: 'Menunggu Lokasi',
      }),
      { status: 409 },
    );
    assert.deepEqual((await request('/orders/DEMO-CHECK-02')).data.staff, []);
    assert.equal(
      rules.assignmentIssue(
        person,
        { ...order, time: '12.00–13.00 WIB' },
        shifts,
        [],
      ),
      'Belum ada shift aktif yang mencakup tanggal dan jam pesanan.',
    );
    assert.equal(rules.overlaps('08.00–12.00 WIB', '12.00–13.00 WIB'), false);
    assert.equal(rules.timeRange('25.00–26.00 WIB'), null);
    await request('/orders/' + order.id, 'PATCH', {
      staff: [],
      status: 'Menunggu Assign',
    });
  },
);
await check(
  'Active staff tasks exclude ready, completed, and other crew progress; recommendations use skills',
  async () => {
    const roster = load(path.join(root, 'lib/staff-availability.ts'));
    const rules = load(path.join(root, 'lib/staff-schedules.ts'));
    const person = {
      id: 'p',
      name: 'Dina',
      status: 'Tersedia',
      skills: ['Deep Cleaning', 'Sanitasi'],
    };
    const order = {
      id: 'target',
      staff: [],
      status: 'Menunggu Assign',
      service: 'Deep Cleaning Rumah 2 Lantai',
      date: '2026-12-20',
      time: '08.00–12.00 WIB',
    };
    const shift = {
      id: 'shift',
      staff: 'Dina',
      date: order.date,
      time: order.time,
      status: 'Terjadwal',
    };
    assert.equal(rules.assignmentIssue(person, order, [shift], [order]), '');
    assert.ok(
      rules.assignmentIssue(
        { ...person, status: 'Bertugas' },
        order,
        [shift],
        [order],
      ),
    );
    assert.ok(rules.assignmentIssue(person, order, [], [order]));
    const busy = {
      ...order,
      id: 'busy',
      staff: ['Dina'],
      status: 'Menuju Lokasi',
      time: '15.00–17.00 WIB',
    };
    assert.ok(rules.assignmentIssue(person, order, [shift], [order, busy]));
    const mixedCrew = {
      ...busy,
      status: 'Sedang Dikerjakan',
      staffProgress: [{ staffName: 'Dina', stage: 'assigned' }],
    };
    assert.equal(
      rules.assignmentIssue(person, order, [shift], [order, mixedCrew]),
      '',
    );
    assert.equal(
      roster.staffOperationalStatus(person, [mixedCrew]),
      'Siap Berangkat',
    );
    assert.equal(
      rules.assignmentIssue(
        person,
        order,
        [shift],
        [
          order,
          {
            ...busy,
            status: 'Sedang Dikerjakan',
            time: order.time,
            staffProgress: [{ staffName: 'Dina', stage: 'completed' }],
          },
        ],
      ),
      '',
    );
    assert.equal(
      roster.activeOrderForStaff(person, [
        {
          ...busy,
          status: 'Menunggu Lokasi',
          staffProgress: [{ staffName: 'Dina', stage: 'assigned' }],
        },
      ]),
      undefined,
    );
    assert.equal(
      roster.staffOperationalStatus(person, [busy]),
      'Menuju Lokasi',
    );
    assert.equal(
      roster.staffOperationalStatus(person, [
        { ...busy, status: 'Sedang Dikerjakan' },
      ]),
      'Sedang Bekerja',
    );
    assert.equal(
      roster.activeOrderForStaff(person, [
        {
          ...busy,
          status: 'Sedang Dikerjakan',
          staffProgress: [{ staffName: 'Dina', stage: 'completed' }],
        },
      ]),
      undefined,
    );
    assert.deepEqual(roster.recommendedSkills(person, order), [
      'Deep Cleaning',
    ]);
    assert.deepEqual(
      roster.recommendedSkills(
        { ...person, skills: ['AC'] },
        { ...order, service: 'Pembersihan Kaca' },
      ),
      [],
    );
    assert.deepEqual(
      roster.recommendedSkills(person, {
        ...order,
        service: 'Cuci & Perawatan AC',
      }),
      [],
    );
  },
);
await check(
  'Recent activity sorts ahead of older creation; historical orders cannot invent cleaner records',
  async () => {
    const flow = load(path.join(root, 'lib/order-flow.ts'));
    assert.deepEqual(
      [
        { id: 'created', createdAt: '2026-10-17T08:00:00+07:00' },
        {
          id: 'updated',
          createdAt: '2026-10-01T08:00:00+07:00',
          updatedAt: '2026-10-17T09:00:00+07:00',
        },
      ]
        .sort(flow.newestOrderFirst)
        .map((item) => item.id),
      ['updated', 'created'],
    );
    assert.equal(flow.orderStatusLabel('Menunggu Lokasi'), 'Siap Berangkat');
    const before = (await cleaner.demoTaskSummaries()).length;
    await assert.rejects(cleaner.issueDemoTasks('DEMO-HISTORY-01'), {
      status: 409,
    });
    assert.equal((await cleaner.demoTaskSummaries()).length, before);
  },
);
await check(
  'Image upload persists, requires authentication, and rejects traversal',
  async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'test.png', {
      type: 'image/png',
    });
    const form = new FormData();
    form.set('file', file);
    const result = await api.adminDemoRequest(
      '/uploads',
      { method: 'POST', body: form },
      session,
    );
    const id = result.data.url.split('/').at(-1);
    assert.equal((await api.adminDemoMedia(id, session)).type, 'image/png');
    await assert.rejects(api.adminDemoMedia(id, ''), { status: 401 });
    await assert.rejects(api.adminDemoMedia('../store.json', session), {
      status: 404,
    });
  },
);
await check(
  'Cleaner reset leaves catalogs and unrelated demo tasks/history intact',
  async () => {
    await cleaner.seedDemo(true);
    assert.equal((await request('/orders')).data.length, 20);
    assert.equal(
      (await request('/orders/DEMO-ORD-03')).data.status,
      'Menunggu Assign',
    );
    assert.equal((await request('/services')).data.length, 6);
    assert.equal((await cleaner.demoTaskSummaries()).length, 2);
  },
);
await check(
  'Category deletion protects linked services and persists unused deletions',
  async () => {
    const category = (await request('/categories?resource=services')).data.find(
      (item) => item.name === 'Rumah',
    );
    assert.ok(category);
    await assert.rejects(request('/categories/' + category.id, 'DELETE'), {
      status: 409,
    });
    assert.ok(
      (await request('/categories?resource=services')).data.some(
        (item) => item.id === category.id,
      ),
    );
    const created = (
      await request('/categories', 'POST', {
        name: 'Kategori kosong',
        resource: 'services',
      })
    ).data;
    await request('/categories/' + created.id, 'DELETE');
    assert.ok(
      !(await request('/categories?resource=services')).data.some(
        (item) => item.id === created.id,
      ),
    );
    await assert.rejects(request('/categories/' + created.id, 'DELETE'), {
      status: 404,
    });
  },
);
await check(
  'Category cascade requires consent and only deletes services in the chosen category',
  async () => {
    const category = (
      await request('/categories', 'POST', {
        name: 'Kategori hapus bersama',
        resource: 'services',
      })
    ).data;
    const before = (await request('/services')).data.length;
    for (const active of [true, false])
      await request('/services', 'POST', {
        name: 'Layanan hapus ' + active,
        category: category.name,
        active,
      });
    await assert.rejects(request('/categories/' + category.id, 'DELETE'), {
      status: 409,
    });
    assert.equal((await request('/services')).data.length, before + 2);
    await request(
      '/categories/' + category.id + '?deleteServices=true',
      'DELETE',
    );
    const remaining = (await request('/services')).data;
    assert.equal(remaining.length, before);
    assert.ok(!remaining.some((service) => service.category === category.name));
    assert.ok(
      !(await request('/categories?resource=services')).data.some(
        (item) => item.id === category.id,
      ),
    );
  },
);
await check(
  'Disabled and production modes cannot serve demo authentication/data',
  async () => {
    process.env.ADMIN_DEMO_ENABLED = 'false';
    await assert.rejects(request('/orders'), { status: 404 });
    process.env.ADMIN_DEMO_ENABLED = 'true';
    process.env.NODE_ENV = 'production';
    await assert.rejects(
      request('/auth/login', 'POST', { username: 'admin', password: 'admin' }),
      { status: 404 },
    );
  },
);
console.log(checks.length + ' groups passed; no external requests.');
