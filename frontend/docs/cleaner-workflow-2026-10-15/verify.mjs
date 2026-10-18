// Run after assigning the three [UJI] orders. Only DEMO-ORD-02 is advanced here.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const base = process.env.TEST_APP_URL || 'http://127.0.0.1:3000';
const cookie = process.env.TEST_ADMIN_COOKIE;
if (!cookie)
  throw new Error('Set TEST_ADMIN_COOKIE to an authenticated preview session.');
const checks = [];
async function check(name, fn) {
  await fn();
  checks.push({ name, passed: true });
}
async function call(path, body, admin = false, headers = {}) {
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    redirect: 'manual',
    headers: {
      ...(admin ? { Cookie: cookie } : {}),
      ...(body === undefined
        ? {}
        : { 'Content-Type': 'application/json', Origin: base }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = await response.json();
  return { response, status: response.status, ...json };
}
const adminPath = '/api/admin/cleaner-tasks';
await check('Admin authentication and origin', async () => {
  assert.equal((await call(adminPath)).status, 401);
  assert.equal(
    (
      await call(adminPath, undefined, false, {
        Cookie: 'cleango-session=invalid',
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await call(adminPath, { intent: 'seed' }, true, {
        Origin: 'https://example.invalid',
      })
    ).status,
    403,
  );
  assert.equal((await call(adminPath, null, true)).status, 400);
});
await check('Repeated seed has exactly three distinct orders', async () => {
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await call(adminPath, { intent: 'seed' }, true)).data.orders,
      3,
    );
});
let board = (await call(adminPath, undefined, true)).data;
const rows = board.items.filter((item) => item.demo);
assert.equal(
  rows.length,
  3,
  'Assign each demo order before running this audit.',
);
const paths = new Map(
  rows.map((item) => [
    item.orderId,
    item.publicPath.replace('/tugas/', '/api/tugas/'),
  ]),
);
const path = paths.get('DEMO-ORD-02');
const event = (kind, extra = {}, key = crypto.randomUUID()) =>
  call(path, { kind, key, ...extra });
await check('Task capability scope, tampering, CSRF, no-store', async () => {
  const result = await call(path);
  assert.equal(result.status, 200);
  assert.equal(result.data.orderId, 'DEMO-ORD-02');
  assert.equal(result.data.staffName, '[UJI] Dina Rahma');
  assert.equal(result.response.headers.get('referrer-policy'), 'no-referrer');
  assert.match(result.response.headers.get('cache-control'), /no-store/);
  for (const forbidden of [
    'secret',
    'entities',
    'orders',
    'accessToken',
    'email',
    'role',
  ])
    assert.ok(!(forbidden in result.data));
  assert.equal(result.data.customerPhone, '');
  const last = path.at(-1);
  assert.equal(
    (await call(path.slice(0, -1) + (last === 'a' ? 'b' : 'a'))).status,
    403,
  );
  assert.equal(
    (
      await call(path, { kind: 'depart', key: crypto.randomUUID() }, false, {
        Origin: 'https://example.invalid',
      })
    ).status,
    403,
  );
  assert.equal((await call(path, null)).status, 400);
  assert.equal((await call(path, { kind: 'depart', key: 'bad' })).status, 400);
  assert.equal((await call(path, { content: 'x'.repeat(13000) })).status, 413);
});
await check('Photo cannot be read from a different assignment', async () => {
  const ownerPath = paths.get('DEMO-ORD-01');
  const task = (await call(ownerPath)).data;
  assert.ok(task.photos.length > 0, 'Upload a test photo to order 01 first.');
  const id = task.photos[0].id;
  assert.equal((await fetch(base + ownerPath + '/foto/' + id)).status, 200);
  assert.equal((await fetch(base + path + '/foto/' + id)).status, 404);
});
await check('Out-of-order actions rejected', async () => {
  assert.equal((await event('arrive')).status, 409);
  assert.equal(
    (
      await event('complete', {
        summary: 'Pekerjaan sudah diperiksa.',
        checked: true,
      })
    ).status,
    409,
  );
});
await check('Concurrent departure is idempotent and persists', async () => {
  const pair = await Promise.all([
    event('depart'),
    event('depart', { orderId: 'DEMO-ORD-03' }),
  ]);
  assert.equal(pair[0].data.departedAt, pair[1].data.departedAt);
  const task = (await call(path)).data;
  assert.equal(task.stage, 'en_route');
  assert.equal(task.orderId, 'DEMO-ORD-02');
  assert.equal(task.departedAt, pair[0].data.departedAt);
  assert.equal(
    (await event('location', { latitude: 91, longitude: 106 })).status,
    400,
  );
  assert.equal(
    (await event('location', { latitude: -6.27, longitude: 106.75 })).status,
    200,
  );
});
await check('Concurrent arrival preserves server start time', async () => {
  const pair = await Promise.all([event('arrive'), event('arrive')]);
  assert.equal(pair[0].data.startedAt, pair[1].data.startedAt);
  assert.equal(pair[0].data.stage, 'working');
  assert.equal(
    (await event('complete', { summary: 'short', checked: false })).status,
    400,
  );
  assert.equal((await call(path)).data.stage, 'working');
});
await check('Photo validation, storage, removal', async () => {
  const bad = new FormData();
  bad.set(
    'file',
    new Blob(['not an image'], { type: 'image/png' }),
    'fake.png',
  );
  assert.equal(
    (
      await fetch(base + path, {
        method: 'POST',
        headers: { Origin: base },
        body: bad,
      })
    ).status,
    400,
  );
  const good = new FormData();
  good.set(
    'file',
    new Blob(
      [
        await readFile(
          new URL(
            '../../public/branding/cleango-logo-source.png',
            import.meta.url,
          ),
        ),
      ],
      { type: 'image/png' },
    ),
    'test.png',
  );
  const uploaded = await fetch(base + path, {
    method: 'POST',
    headers: { Origin: base },
    body: good,
  });
  assert.equal(uploaded.status, 200);
  const task = (await uploaded.json()).data;
  assert.equal(task.photos.length, 1);
  const id = task.photos[0].id;
  assert.equal((await fetch(base + path + '/foto/' + id)).status, 200);
  assert.equal(
    (await event('remove_photo', { photoId: id })).data.photos.length,
    0,
  );
  assert.equal((await fetch(base + path + '/foto/' + id)).status, 404);
});
await check(
  'Concurrent completion saves one report and one simulated send',
  async () => {
    const summary =
      'Sofa dan kasur sudah dibersihkan serta diperiksa. Laporan pengujian.';
    const pair = await Promise.all([
      event('complete', { summary, checked: true }),
      event('complete', {
        summary: 'Tidak boleh menimpa laporan pertama.',
        checked: true,
      }),
    ]);
    assert.equal(pair[0].data.completedAt, pair[1].data.completedAt);
    const task = (await call(path)).data;
    assert.equal(task.stage, 'completed');
    assert.equal(task.orderStatus, 'Selesai');
    assert.equal(task.reportDelivery.status, 'simulated');
    assert.equal(task.reportDelivery.attempts, 1);
    const retried = (await event('retry_report')).data;
    assert.equal(retried.reportDelivery.attempts, 1);
    assert.equal(retried.completedAt, task.completedAt);
    assert.equal(
      (await event('remove_photo', { photoId: 'missing' })).status,
      409,
    );
  },
);
await check(
  'Admin uses the same completed order; no real sends on dummy data',
  async () => {
    board = (await call(adminPath, undefined, true)).data;
    const completed = board.items.find(
      (item) => item.orderId === 'DEMO-ORD-02',
    );
    assert.equal(completed.orderStatus, 'Selesai');
    assert.equal(completed.task.stage, 'completed');
    for (const row of board.items.filter((item) => item.demo)) {
      assert.equal(row.linkDelivery.mode, 'simulation');
      assert.notEqual(row.linkDelivery.status, 'sent');
      assert.notEqual(row.task.reportDelivery.status, 'sent');
    }
  },
);
const result = {
  date: new Date().toISOString(),
  environment: 'Local preview fixture; no real messages sent',
  checks,
};
await writeFile(
  new URL('./api-checks.json', import.meta.url),
  JSON.stringify(result, null, 2) + '\n',
);
console.log(JSON.stringify(result, null, 2));
