// Isolated persistence/security checks; never opens the application's demo store.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, mkdtempSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createHmac } from 'node:crypto';
const require = createRequire(import.meta.url);
const ts = require('../../node_modules/typescript');
const root = path.resolve(import.meta.dirname, '../..');
const testDir = mkdtempSync(path.join(tmpdir(), 'cleango-cleaner-test-'));
const oldDir = process.env.CLEANER_DEMO_DATA_DIR;
const oldEnabled = process.env.CLEANER_DEMO_ENABLED;
process.env.CLEANER_DEMO_DATA_DIR = testDir;
process.env.CLEANER_DEMO_ENABLED = 'true';
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
      : id === './errors'
        ? load('lib/cleaner/errors.ts')
        : id === '../demo/mode'
          ? load('lib/demo/mode.ts')
          : nativeRequire(id);
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', {
    filename,
  })(localRequire, module, module.exports);
  return module.exports;
}
const checks = [];
async function check(name, run) {
  await run();
  checks.push({ name, passed: true });
}
try {
  let store = load('lib/cleaner/demo-store.ts');
  await check('Repeated isolated seed is idempotent', async () => {
    await store.seedDemo();
    await store.seedDemo();
    assert.equal((await store.demoRecords('orders')).length, 3);
    assert.equal((await store.demoRecords('staff')).length, 3);
  });
  await store.demoMutation('orders', 'DEMO-ORD-01', 'PATCH', {
    staff: ['[UJI] Raka Saputra'],
    status: 'Menunggu Lokasi',
  });
  let item = (await store.issueDemoTasks('DEMO-ORD-01'))[0];
  let token = item.publicPath.split('/').at(-1);
  await store.demoEvent(token, { kind: 'depart' });
  const departure = (await store.demoTaskByToken(token)).departedAt;
  await check(
    'Reloaded server module retains secret, assignment, stage and time',
    async () => {
      store = load('lib/cleaner/demo-store.ts');
      assert.equal((await store.demoTaskByToken(token)).departedAt, departure);
      assert.equal((await store.demoTaskByToken(token)).stage, 'en_route');
    },
  );
  await check('Signed expired links are rejected', async () => {
    const state = JSON.parse(readFileSync(path.join(testDir, 'store.json')));
    const payload = Buffer.from(
      JSON.stringify({ v: 1, id: item.task.id, exp: Date.now() - 1000 }),
    ).toString('base64url');
    const expired =
      'demo.' +
      payload +
      '.' +
      createHmac('sha256', state.secret).update(payload).digest('base64url');
    await assert.rejects(
      store.demoTaskByToken(expired),
      (error) => error.status === 410,
    );
  });
  await check('Reassignment revokes the old capability', async () => {
    await store.demoMutation('orders', 'DEMO-ORD-01', 'PATCH', {
      staff: ['[UJI] Dina Rahma'],
      status: 'Menunggu Lokasi',
    });
    await assert.rejects(
      store.demoTaskByToken(token),
      (error) => error.status === 403,
    );
    item = (await store.issueDemoTasks('DEMO-ORD-01'))[0];
    token = item.publicPath.split('/').at(-1);
    assert.equal(
      (await store.demoTaskByToken(token)).staffName,
      '[UJI] Dina Rahma',
    );
  });
  await check(
    'Interrupted delivery becomes retryable without losing the task',
    async () => {
      await store.demoTransaction((state) => {
        state.tasks[0].linkDelivery = {
          status: 'sending',
          mode: 'simulation',
          attempts: 1,
          updatedAt: new Date(Date.now() - 60000).toISOString(),
        };
      });
      assert.equal(
        (await store.demoTaskByToken(token)).linkDelivery.status,
        'failed',
      );
      await store.sendDemo(item.task.id, 'link');
      assert.equal(
        (await store.demoTaskByToken(token)).linkDelivery.status,
        'simulated',
      );
    },
  );
  await check(
    'Manual admin completion cannot be reopened by an old departure click',
    async () => {
      await store.demoMutation('orders', 'DEMO-ORD-01', 'PATCH', {
        status: 'Selesai',
      });
      assert.equal(
        (await store.demoEvent(token, { kind: 'depart' })).stage,
        'completed',
      );
      assert.equal((await store.demoRecords('orders'))[0].status, 'Selesai');
      await assert.rejects(
        store.sendDemo(item.task.id, 'report'),
        (error) => error.status === 409,
      );
    },
  );
  await check(
    'Cancel and later restore never resurrects a shared link',
    async () => {
      await store.demoMutation('orders', 'DEMO-ORD-01', 'PATCH', {
        status: 'Batal',
      });
      await assert.rejects(
        store.demoTaskByToken(token),
        (error) => error.status === 403,
      );
      await store.demoMutation('orders', 'DEMO-ORD-01', 'PATCH', {
        status: 'Menunggu Lokasi',
      });
      await assert.rejects(
        store.demoTaskByToken(token),
        (error) => error.status === 403,
      );
      item = (await store.issueDemoTasks('DEMO-ORD-01'))[0];
      token = item.publicPath.split('/').at(-1);
    },
  );
  await check('Crash lock recovery and serialized transactions', async () => {
    const lock = path.join(testDir, 'store.lock');
    writeFileSync(lock, '0');
    const past = new Date(Date.now() - 60000);
    utimesSync(lock, past, past);
    const pair = await Promise.all([
      store.demoRecords('orders'),
      store.demoRecords('staff'),
    ]);
    assert.equal(pair[0].length, 3);
    assert.equal(pair[1].length, 3);
    const reloaded = load('lib/cleaner/demo-store.ts');
    await Promise.all(
      Array.from({ length: 40 }, (_, index) =>
        (index % 2 ? store : reloaded).demoTransaction((state) => {
          const person = state.entities.staff[0];
          person.testCounter = (person.testCounter || 0) + 1;
        }),
      ),
    );
    assert.equal((await store.demoRecords('staff'))[0].testCounter, 40);
  });
  await check(
    'Multiple assigned cleaners finish independently before the order completes',
    async () => {
      await store.demoMutation('orders', 'DEMO-ORD-02', 'PATCH', {
        status: 'Menunggu Lokasi',
        staff: ['[UJI] Raka Saputra', '[UJI] Dina Rahma'],
      });
      const crew = await store.issueDemoTasks('DEMO-ORD-02');
      assert.equal(crew.length, 2);
      for (const [index, assignment] of crew.entries()) {
        const crewToken = assignment.publicPath.split('/').at(-1);
        await store.demoEvent(crewToken, { kind: 'depart' });
        await store.demoEvent(crewToken, { kind: 'arrive' });
        await store.demoEvent(crewToken, {
          kind: 'complete',
          summary: 'Hasil kerja kru ' + index + ' sudah diperiksa.',
          checked: true,
        });
        const order = (await store.demoRecords('orders')).find(
          (record) => record.id === 'DEMO-ORD-02',
        );
        assert.equal(
          order.status,
          index === 0 ? 'Sedang Dikerjakan' : 'Selesai',
        );
      }
    },
  );
  await check(
    'Reset revokes links and restores three unassigned orders',
    async () => {
      await store.seedDemo(true);
      await assert.rejects(
        store.demoTaskByToken(token),
        (error) => error.status === 403,
      );
      const orders = await store.demoRecords('orders');
      assert.equal(orders.length, 3);
      assert.ok(
        orders.every(
          (order) => order.status === 'Menunggu Assign' && !order.staff.length,
        ),
      );
    },
  );
  await check('Demo disabled denies access to demo storage', async () => {
    process.env.CLEANER_DEMO_ENABLED = 'false';
    await assert.rejects(
      store.demoTaskByToken(token),
      (error) => error.status === 404,
    );
  });
  writeFileSync(
    new URL('./store-checks.json', import.meta.url),
    JSON.stringify(
      { date: new Date().toISOString(), isolated: true, checks },
      null,
      2,
    ) + '\n',
  );
  console.log(JSON.stringify({ checks }, null, 2));
} finally {
  if (oldDir === undefined) delete process.env.CLEANER_DEMO_DATA_DIR;
  else process.env.CLEANER_DEMO_DATA_DIR = oldDir;
  if (oldEnabled === undefined) delete process.env.CLEANER_DEMO_ENABLED;
  else process.env.CLEANER_DEMO_ENABLED = oldEnabled;
}
