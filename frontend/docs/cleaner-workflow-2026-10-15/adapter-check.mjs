// Contract checks with an in-memory HTTP adapter. No external requests/messages.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const ts = require('../../node_modules/typescript');
const root = path.resolve(import.meta.dirname, '../..');
const oldAPI = process.env.API_URL;
process.env.API_URL = 'https://api.example.test/api';
const requests = [];
let task;
const now = new Date().toISOString();
const baseTask = () => ({
  id: 'task-a',
  orderId: 'ORDER-A',
  staffId: 'STAFF-A',
  staffName: 'Petugas Contoh',
  customer: 'Customer Contoh',
  customerPhone: '081298765432',
  address: 'Alamat pengujian',
  date: now.slice(0, 10),
  time: '09.00–11.00 WIB',
  service: 'Deep Cleaning',
  notes: '',
  orderStatus: 'Selesai',
  stage: 'completed',
  demo: false,
  updatedAt: now,
  completedAt: now,
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  report: {
    summary: 'Seluruh ruangan telah dibersihkan dan diperiksa.',
    checked: true,
  },
  photos: [{ id: 'photo-a', type: 'image/png' }],
  linkDelivery: { status: 'not_sent', mode: 'manual', attempts: 0 },
  reportDelivery: {
    status: 'manual_ready',
    mode: 'manual',
    attempts: 1,
    draftUrl: 'https://wa.me/628100000001?text=wrong-recipient',
  },
  secret: 'must-not-be-returned',
  orders: ['another-order'],
  role: 'admin',
});
class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
const api = {
  ApiError,
  list: async () => [],
  request: async () => {
    throw new ApiError('Not implemented', 404);
  },
};
async function fakeFetch(url, options) {
  requests.push({ url, options });
  if (url.endsWith('/photos/photo-a'))
    return new Response(new Uint8Array([137, 80, 78, 71]), {
      headers: { 'Content-Type': 'image/png' },
    });
  return Response.json({ data: structuredClone(task) });
}
function load(file) {
  const filename = path.join(root, file);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  const nativeRequire = createRequire(filename);
  const localRequire = (id) =>
    id === 'server-only'
      ? {}
      : id === '@/lib/api'
        ? api
        : id === './demo-store'
          ? {
              demoEnabled: () => false,
              isDemoId: (id) => id.startsWith('DEMO-'),
              tokenHash: (value) =>
                createHash('sha256').update(value).digest('hex'),
            }
          : id === './errors'
            ? load('lib/cleaner/errors.ts')
            : id === '@/lib/whatsapp'
              ? load('lib/whatsapp.ts')
              : nativeRequire(id);
  vm.runInThisContext(
    '(function(require,module,exports,fetch){' + code + '\n})',
    { filename },
  )(localRequire, module, module.exports, fakeFetch);
  return module.exports;
}
const service = load('lib/cleaner/service.ts');
const checks = [];
async function check(name, run) {
  task = baseTask();
  await run();
  checks.push({ name, passed: true });
}
try {
  await check(
    'Public adapter forwards only the task bearer token and allowlisted fields',
    async () => {
      const data = await service.getCleanerTask('opaque-task-token');
      assert.equal(
        requests.at(-1).options.headers.Authorization,
        'Bearer opaque-task-token',
      );
      assert.ok(!('Cookie' in requests.at(-1).options.headers));
      for (const key of ['secret', 'orders', 'role']) assert.ok(!(key in data));
    },
  );
  await check(
    'Manual report draft always targets this order customer',
    async () => {
      const data = await service.getCleanerTask('opaque-task-token');
      const draft = new URL(data.reportDelivery.draftUrl);
      assert.equal(draft.pathname, '/6281298765432');
      assert.match(draft.searchParams.get('text'), /ORDER-A/);
      assert.match(draft.searchParams.get('text'), /Seluruh ruangan/);
      assert.equal(data.reportDelivery.status, 'manual_ready');
      assert.notEqual(data.reportDelivery.status, 'sent');
    },
  );
  await check(
    'No delivered claim without chatbot provider acknowledgement',
    async () => {
      task.reportDelivery = { status: 'sent', mode: 'chatbot', attempts: 1 };
      await assert.rejects(
        service.getCleanerTask('opaque-task-token'),
        (error) => error.status === 502,
      );
      task.reportDelivery.providerMessageId = 'provider-accepted-id';
      const data = await service.getCleanerTask('opaque-task-token');
      assert.equal(data.reportDelivery.status, 'sent');
      assert.equal(data.reportDelivery.draftUrl, undefined);
    },
  );
  await check('Simulation never offers a real WhatsApp draft', async () => {
    task.demo = true;
    task.linkDelivery = {
      status: 'simulated',
      mode: 'simulation',
      attempts: 1,
      draftUrl: 'https://wa.me/628100000001?text=test',
    };
    task.reportDelivery.mode = 'simulation';
    task.reportDelivery.status = 'simulated';
    const data = await service.getCleanerTask('opaque-task-token');
    assert.equal(data.linkDelivery.draftUrl, undefined);
    assert.equal(data.reportDelivery.draftUrl, undefined);
  });
  await check(
    'Expired and incomplete backend task states are rejected',
    async () => {
      task.expiresAt = new Date(Date.now() - 1000).toISOString();
      await assert.rejects(
        service.getCleanerTask('opaque-task-token'),
        (error) => error.status === 410,
      );
      task = baseTask();
      task.stage = 'working';
      await assert.rejects(
        service.getCleanerTask('opaque-task-token'),
        (error) => error.status === 502,
      );
    },
  );
  await check(
    'Events forward the idempotency key without admin credentials',
    async () => {
      await service.cleanerEvent('opaque-task-token', {
        kind: 'complete',
        key: 'action-12345678',
        summary: task.report.summary,
        checked: true,
      });
      const request = requests.at(-1);
      assert.equal(
        request.options.headers['Idempotency-Key'],
        'action-12345678',
      );
      assert.equal(JSON.parse(request.options.body).kind, 'complete');
      assert.ok(request.url.endsWith('/cleaner-task/events'));
    },
  );
  await check('Live photo proxy checks task ownership first', async () => {
    await assert.rejects(
      service.cleanerPhoto('opaque-task-token', 'foreign-photo'),
      (error) => error.status === 404,
    );
    const photo = await service.cleanerPhoto('opaque-task-token', 'photo-a');
    assert.equal(photo.type, 'image/png');
    assert.equal(photo.bytes.length, 4);
    assert.equal(
      requests.at(-1).options.headers.Authorization,
      'Bearer opaque-task-token',
    );
  });
  await check(
    'Missing dispatch endpoint reports unavailable without pretending a send',
    async () => {
      assert.equal(
        await service.dispatchAssignment({
          id: 'ORDER-A',
          staff: ['Petugas Contoh'],
          status: 'Menunggu Lokasi',
        }),
        'unavailable',
      );
    },
  );
  const result = {
    date: new Date().toISOString(),
    transport: 'In-memory contract fixture; no network requests',
    checks,
  };
  writeFileSync(
    new URL('./adapter-checks.json', import.meta.url),
    JSON.stringify(result, null, 2) + '\n',
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (oldAPI === undefined) delete process.env.API_URL;
  else process.env.API_URL = oldAPI;
}
