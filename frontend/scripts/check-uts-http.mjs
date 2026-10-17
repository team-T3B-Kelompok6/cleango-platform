// Exercise the real server data layer against the isolated HTTP fixture.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const native = createRequire(import.meta.url),
  ts = native('typescript');
const root = path.resolve(import.meta.dirname, '..');
const output = path.join(
  root,
  process.argv.includes('--checklist')
    ? 'docs/checklist-review-2026-10-17'
    : process.argv.includes('--recheck')
      ? 'docs/recheck-2026-10-17'
      : process.argv.includes('--revision')
        ? 'docs/ui-revision-2026-10-16'
        : 'docs/uts-2026-10-16',
);
mkdirSync(output, { recursive: true });
process.env.API_URL = 'http://127.0.0.1:4410/api';
process.env.ADMIN_DEMO_ENABLED = 'false';
process.env.CLEANER_DEMO_ENABLED = 'false';
let token = '';
const modules = new Map();
function load(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const require = createRequire(filename);
  const resolve = (id) =>
    id === 'server-only'
      ? {}
      : id === 'react'
        ? { cache: (fn) => fn }
        : id === 'next/headers'
          ? {
              cookies: async () => ({
                get: () => (token ? { value: token } : undefined),
              }),
            }
          : id === 'next/navigation'
            ? {
                redirect: (url) => {
                  throw Object.assign(new Error('Redirect'), { redirect: url });
                },
                notFound: () => {
                  throw Object.assign(new Error('Not found'), { status: 404 });
                },
              }
            : id.startsWith('.')
              ? load(path.resolve(path.dirname(filename), id + '.ts'))
              : id.startsWith('@/')
                ? load(path.join(root, id.slice(2) + '.ts'))
                : require(id);
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
const api = load(path.join(root, 'lib/api.ts'));
const request = (route, method = 'GET', body, anonymous = false) =>
  api.request(
    route,
    { method, ...(body ? { body: JSON.stringify(body) } : {}) },
    anonymous,
  );
const mode = async (value) => {
  const response = await fetch(
    'http://127.0.0.1:4410/__qa/mode?value=' + value,
    { method: 'POST' },
  );
  assert.ok(response.ok);
};
const checks = [];
async function check(name, run) {
  await run();
  checks.push({ name, passed: true });
  console.log('PASS ' + name);
}
const fixtureReset = await fetch('http://127.0.0.1:4410/__qa/reset', {
  method: 'POST',
});
assert.ok(fixtureReset.ok, 'Start npm run qa:api before this check.');
assert.equal((await fixtureReset.json()).fixture, true);
await mode('normal');
try {
  await check(
    'Login rejects wrong credentials and returns a usable session',
    async () => {
      await assert.rejects(
        request(
          '/auth/login',
          'POST',
          { username: 'admin', password: 'wrong' },
          true,
        ),
        { status: 401 },
      );
      token = (
        await request(
          '/auth/login',
          'POST',
          { username: 'admin', password: 'admin' },
          true,
        )
      ).accessToken;
      assert.ok(token);
    },
  );
  for (const resource of ['services', 'staff', 'faqs']) {
    await check(
      resource + ': POST, GET, PATCH and DELETE travel through HTTP',
      async () => {
        const bodies = {
          services: {
            name: '[UJI UTS] Layanan HTTP',
            category: 'Rumah',
            duration: '2 jam',
            price: 150000,
            discountPrice: null,
            description: 'Layanan sementara untuk pemeriksaan HTTP.',
            active: true,
            features: ['Peralatan lengkap'],
          },
          staff: {
            name: '[UJI UTS] Petugas HTTP',
            phone: '0000000000',
            skills: ['Deep Cleaning'],
            status: 'Tersedia',
          },
          customers: {
            name: '[UJI UTS] Customer HTTP',
            phone: '0000000000',
            email: 'uts@example.test',
            address: 'Alamat fiktif pengujian',
            joined: '2026-10-16',
            active: true,
          },
          faqs: {
            question: '[UJI UTS] FAQ HTTP',
            answer: 'Jawaban pengujian API frontend.',
            category: 'Pemesanan',
            published: true,
          },
        };
        const created = (
          await request('/' + resource, 'POST', bodies[resource])
        ).data;
        assert.equal((await api.detail(resource, created.id)).id, created.id);
        const patch =
          resource === 'faqs'
            ? { answer: 'Jawaban diubah melalui HTTP.' }
            : resource === 'services'
              ? { price: 160000, discountPrice: null }
              : resource === 'staff'
                ? { skills: ['Cuci AC', 'Deep Cleaning'] }
                : { address: 'Alamat uji diubah melalui HTTP.' };
        await request('/' + resource + '/' + created.id, 'PATCH', patch);
        const saved = await api.detail(resource, created.id);
        for (const [key, value] of Object.entries(patch))
          assert.deepEqual(saved[key], value);
        await request('/' + resource + '/' + created.id, 'DELETE');
        await assert.rejects(api.detail(resource, created.id), { status: 404 });
      },
    );
  }
  await check(
    'Customers support read/update/delete without admin registration',
    async () => {
      const customer = (await api.list('customers')).find(
        (item) => item.id === 'DEMO-CUS-04',
      );
      assert.ok(customer);
      await request('/customers/' + customer.id, 'PATCH', {
        address: 'Alamat customer diperbarui melalui HTTP.',
      });
      assert.equal(
        (await api.detail('customers', customer.id)).address,
        'Alamat customer diperbarui melalui HTTP.',
      );
      await request('/customers/' + customer.id, 'DELETE');
      await assert.rejects(api.detail('customers', customer.id), {
        status: 404,
      });
    },
  );
  await check(
    'Orders support assignment/update/read/delete with no create from admin',
    async () => {
      await assert.rejects(request('/orders', 'POST', {}), { status: 405 });
      const order = (await api.list('orders')).find(
        (item) => item.id === 'DEMO-CHECK-01',
      );
      assert.ok(order);
      const rules = load(path.join(root, 'lib/staff-schedules.ts'));
      const [staff, schedules, orders] = await Promise.all([
        api.list('staff'),
        api.list('schedules'),
        api.list('orders'),
      ]);
      const candidate = staff.find(
        (person) => !rules.assignmentIssue(person, order, schedules, orders),
      );
      assert.ok(
        candidate,
        'Fixture must have staff with a matching active shift.',
      );
      await request('/orders/' + order.id, 'PATCH', {
        staff: [candidate.name],
        status: 'Menunggu Lokasi',
      });
      const saved = await api.detail('orders', order.id);
      assert.deepEqual(saved.staff, [candidate.name]);
      assert.equal(saved.status, 'Menunggu Lokasi');
      await request('/orders/' + order.id, 'DELETE');
      await assert.rejects(api.detail('orders', order.id), { status: 404 });
    },
  );
  await check(
    'Staff shifts support create/read/update/delete without customer or service fields',
    async () => {
      await assert.rejects(request('/schedules', 'POST', {}), { status: 400 });
      const schedule = (
        await request('/schedules', 'POST', {
          staff: 'Raka Saputra',
          date: '2026-12-22',
          time: '08.00–12.00 WIB',
          status: 'Terjadwal',
        })
      ).data;
      assert.ok(schedule);
      assert.equal(schedule.customer, undefined);
      assert.equal(schedule.service, undefined);
      await request('/schedules/' + schedule.id, 'PATCH', {
        time: '13.00–17.00 WIB',
      });
      assert.equal(
        (await api.detail('schedules', schedule.id)).time,
        '13.00–17.00 WIB',
      );
      await request('/schedules/' + schedule.id, 'DELETE');
      await assert.rejects(api.detail('schedules', schedule.id), {
        status: 404,
      });
    },
  );
  await check(
    'Image upload persists and returns readable image bytes',
    async () => {
      const form = new FormData();
      form.set(
        'file',
        new File(
          [
            readFileSync(
              path.join(root, 'public/demo/service_detail_hero.jpeg'),
            ),
          ],
          'service.jpeg',
          { type: 'image/jpeg' },
        ),
      );
      const uploaded = await api.request('/uploads', {
        method: 'POST',
        body: form,
      });
      const image = await fetch(uploaded.data.url);
      assert.ok(image.ok);
      assert.equal(image.headers.get('content-type'), 'image/jpeg');
      assert.ok((await image.arrayBuffer()).byteLength > 1000);
    },
  );
  await check(
    'Categories, banners and promo settings persist through HTTP',
    async () => {
      const category = (
        await request('/categories', 'POST', {
          name: '[UJI UTS] Kategori',
          resource: 'services',
        })
      ).data;
      assert.ok(
        (await request('/categories?resource=services')).data.some(
          (item) => item.id === category.id,
        ),
      );
      const banner = (
        await request('/banners', 'POST', {
          imageUrl: '/demo/promo_banner.png',
        })
      ).data;
      assert.equal(
        (await request('/banners/' + banner.id)).data.imageUrl,
        '/demo/promo_banner.png',
      );
      await request('/banners/' + banner.id, 'DELETE');
      const promo = (
        await request('/promos', 'POST', {
          name: '[UJI UTS] Diskon',
          code: 'UTSTEST20',
          discountType: 'percentage',
          discountValue: 20,
          maxDiscount: 50000,
          minPurchase: 100000,
          scope: 'all',
          serviceIds: [],
          startsOn: '2026-10-16',
          endsOn: '2026-10-30',
          usageLimit: 10,
          perCustomerLimit: 1,
          stackable: false,
          active: true,
        })
      ).data;
      assert.equal(
        (await request('/promos/' + promo.id)).data.code,
        'UTSTEST20',
      );
      await request('/promos/' + promo.id, 'DELETE');
    },
  );
  await check(
    'Empty state passes through as an empty resource list',
    async () => {
      await mode('empty');
      assert.deepEqual(await api.list('services'), []);
      await mode('normal');
    },
  );
  await check(
    'API failure and recovery preserve a clear error status',
    async () => {
      await mode('error');
      await assert.rejects(api.list('services'), { status: 503 });
      await mode('normal');
      assert.ok((await api.list('services')).length);
    },
  );
  await check(
    'Expired session redirects instead of rendering protected records',
    async () => {
      await mode('expired');
      await assert.rejects(api.list('orders'), {
        redirect: '/login?expired=1',
      });
      await mode('normal');
    },
  );
  await check(
    'Slow API remains awaitable by the server data layer',
    async () => {
      await mode('slow');
      const start = Date.now();
      await api.list('staff');
      assert.ok(Date.now() - start >= 1500);
      await mode('normal');
    },
  );
} finally {
  await mode('normal');
  const journal = await (
    await fetch('http://127.0.0.1:4410/__qa/journal')
  ).json();
  writeFileSync(
    path.join(output, 'http-results.json'),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        transport:
          'Isolated loopback HTTP contract fixture, not team API/MySQL',
        checks,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    path.join(output, 'http-requests.json'),
    JSON.stringify(journal, null, 2),
  );
}
console.log(
  checks.length + ' HTTP contract groups passed. User demo data unchanged.',
);
