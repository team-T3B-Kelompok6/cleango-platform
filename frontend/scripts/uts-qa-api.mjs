// Loopback-only HTTP contract fixture for frontend tests, never a team backend.
// All records/files use a new temporary directory and fictional contacts.
import http from 'node:http';
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
  path.join(tmpdir(), 'cleango-uts-http-'),
);
const modules = new Map();
function load(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const require = createRequire(filename);
  const resolve = (id) =>
    id === 'server-only'
      ? {}
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
const api = load(path.join(root, 'lib/demo/admin-api.ts'));
const journal = [];
let mode = 'normal',
  session = '';
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1:4410');
    const send = (status, body) => {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === '/__qa/journal' && req.method === 'GET')
      return send(200, { fixture: true, mode, requests: journal });
    if (url.pathname === '/__qa/health') return send(200, { fixture: true });
    if (url.pathname === '/__qa/reset' && req.method === 'POST') {
      // Each test run receives a fresh fixture; never touches the app demo store.
      process.env.CLEANER_DEMO_DATA_DIR = mkdtempSync(
        path.join(tmpdir(), 'cleango-uts-http-'),
      );
      journal.length = 0;
      mode = 'normal';
      session = '';
      return send(200, { fixture: true, reset: true });
    }
    if (url.pathname === '/__qa/mode' && req.method === 'POST') {
      const next = url.searchParams.get('value');
      if (
        ![
          'normal',
          'empty',
          'error',
          'slow',
          'expired',
          'audit-unavailable',
          'audit-error',
        ].includes(next)
      )
        return send(400, { message: 'Unknown QA mode' });
      mode = next;
      return send(200, { mode });
    }
    const entry = {
      method: req.method,
      path: url.pathname,
      time: new Date().toISOString(),
      mode,
    };
    journal.push(entry);
    try {
      if (url.pathname.startsWith('/media/') && req.method === 'GET') {
        const image = await api.adminDemoMedia(url.pathname.slice(7), session);
        res.writeHead(200, {
          'Content-Type': image.type,
          'X-Content-Type-Options': 'nosniff',
        });
        res.end(image.bytes);
        entry.status = 200;
        return;
      }
      if (!url.pathname.startsWith('/api/')) {
        entry.status = 404;
        return send(404, { message: 'Route fixture tidak ditemukan.' });
      }
      const pathname = url.pathname.slice(4);
      const categoryRoute = /^\/admin\/categories(?:\/[^/]+)?$/.test(pathname);
      const route =
        (categoryRoute
          ? pathname.replace('/admin/categories', '/categories')
          : pathname) + url.search;
      if (mode === 'error') {
        entry.status = 503;
        return send(503, { message: 'Gangguan API khusus pengujian.' });
      }
      if (mode === 'expired' && route !== '/auth/login') {
        entry.status = 401;
        return send(401, { message: 'Sesi uji berakhir.' });
      }
      if (
        pathname === '/audit-logs' &&
        (mode === 'audit-unavailable' || mode === 'audit-error')
      ) {
        entry.status = mode === 'audit-unavailable' ? 404 : 503;
        return send(entry.status, {
          message: 'Kondisi API audit khusus pengujian.',
        });
      }
      if (mode === 'slow')
        await new Promise((resolve) => setTimeout(resolve, 1800));
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 8 * 1024 * 1024)
          throw Object.assign(new Error('Isian terlalu besar.'), {
            status: 413,
          });
        chunks.push(chunk);
      }
      const bytes = Buffer.concat(chunks);
      const body =
        route === '/uploads'
          ? await new Request('http://qa.local', {
              method: 'POST',
              headers: { 'Content-Type': req.headers['content-type'] },
              body: bytes,
            }).formData()
          : bytes.length
            ? bytes.toString()
            : undefined;
      const result = await api.adminDemoRequest(
        route,
        { method: req.method, ...(body ? { body } : {}) },
        String(req.headers.authorization ?? '').replace(/^Bearer /, ''),
      );
      if (categoryRoute && result.data) {
        const nativeCategory = (category) => {
          const { resource, ...record } = category;
          return record;
        };
        result.data = Array.isArray(result.data)
          ? result.data.map(nativeCategory)
          : nativeCategory(result.data);
      }
      if (route === '/auth/login') session = result.accessToken;
      if (route === '/uploads')
        result.data.url =
          'http://127.0.0.1:4410/media/' + result.data.url.split('/').at(-1);
      if (
        mode === 'empty' &&
        req.method === 'GET' &&
        Array.isArray(result.data)
      )
        result.data = [];
      entry.status = 200;
      send(200, result);
    } catch (error) {
      entry.status = error.status ?? 500;
      send(entry.status, { message: error.message ?? 'QA fixture error' });
    }
  })
  .listen(4410, '127.0.0.1', () =>
    console.log(
      'Isolated frontend HTTP fixture: 127.0.0.1:4410. Not the team API.',
    ),
  );
