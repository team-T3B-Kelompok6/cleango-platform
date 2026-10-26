// Isolated contract checks: no cookies, real API, files, or database mutations.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
const native = createRequire(import.meta.url);
const ts = native('typescript');
const root = path.resolve(import.meta.dirname, '..');
const order = {
  id: '9',
  staff: ['Sari'],
  status: 'Menuju Lokasi',
  customer: 'Pelanggan Uji',
  service: 'Uji Bersih',
  address: 'Alamat uji',
  date: '2026-10-25',
  time: '09:00',
  latitude: -7.94,
  longitude: 112.62,
};
const task = {
  id: '7',
  orderId: '9',
  staffId: '3',
  staffName: 'Sari',
  customer: 'Pelanggan Uji',
  customerPhone: '',
  address: 'Alamat uji',
  service: 'Uji Bersih',
  notes: '',
  date: '2026-10-25',
  time: '09:00',
  orderStatus: 'en_route',
  stage: 'en_route',
  demo: false,
  departedAt: '2026-10-25T02:00:00Z',
  updatedAt: '2026-10-25T02:01:00Z',
  expiresAt: '2030-01-01T00:00:00Z',
  photos: [],
  linkDelivery: { status: 'manual_ready', mode: 'manual', attempts: 1 },
  reportDelivery: { status: 'not_sent', mode: 'manual', attempts: 0 },
  location: {
    latitude: -7.97,
    longitude: 112.61,
    updatedAt: '2026-10-25T02:01:00Z',
  },
};
let payload;
class ApiError extends Error {}
const api = {
  ApiError,
  request: async () => ({ data: payload }),
  list: async (name) =>
    name === 'orders' ? [order] : [{ id: '3', name: 'Sari', status: 'Aktif' }],
};
const modules = new Map();
function load(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const require = (id) => {
    if (id === 'server-only') return {};
    if (id === 'react') return { cache: (fn) => fn };
    if (id === '@/lib/api') return api;
    if (id.endsWith('demo-store'))
      return {
        demoEnabled: () => false,
        isDemoId: () => false,
        tokenHash: (value) => value,
      };
    if (id === '@/lib/demo/mode') return { adminDemoEnabled: () => false };
    if (id === '@/lib/whatsapp') return { whatsappLink: () => undefined };
    if (id.startsWith('@/')) return load(path.join(root, id.slice(2) + '.ts'));
    if (id.startsWith('.'))
      return load(path.resolve(path.dirname(filename), id + '.ts'));
    return native(id);
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
  })(require, module, module.exports);
  return module.exports;
}
const service = load(path.join(root, 'lib/cleaner/service.ts'));
const work = load(path.join(root, 'lib/order-work-times.ts'));
for (const data of [
  [{ task, publicPath: '/tugas/test-token' }],
  { items: [{ task }] },
]) {
  payload = data;
  const board = await service.adminTaskBoard('http://localhost:3000');
  assert.deepEqual(board.items[0].task.location, task.location);
  assert.deepEqual(board.items[0].destinationLocation, {
    latitude: -7.94,
    longitude: 112.62,
  });
  assert.equal(board.items[0].demo, false);
  const orders = await work.withOrderWorkTimes([order]);
  assert.deepEqual(orders[0].staffProgress, [
    { staffName: 'Sari', stage: 'en_route' },
  ]);
}
payload = { items: [{ task: { ...task, location: undefined } }] };
assert.equal(
  (await service.adminTaskBoard('http://localhost:3000')).items[0].task
    .location,
  undefined,
);
payload = {
  items: [
    {
      task: {
        ...task,
        startedAt: '2026-10-25T02:00:00Z',
        stage: 'working',
        estimatedCompletedAt: '2026-10-25T04:00:00Z',
        serviceDurationMinutes: 120,
      },
    },
  ],
};
const working = (await service.adminTaskBoard('http://localhost:3000')).items[0]
  .task;
assert.equal(working.estimatedCompletedAt, '2026-10-25T04:00:00Z');
console.log(
  'PASS: array/items board contracts, GPS, ownership destination, work records and SOP estimate; no external traffic.',
);
