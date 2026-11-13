// Isolated GPS checks: no browser, real API, or database mutations.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ts = createRequire(import.meta.url)('typescript');
const root = path.resolve(import.meta.dirname, '..');
function load(relative, require = () => ({}), globals = {}) {
  const filename = path.join(root, relative);
  const js = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${js}\n})`, {
    Error,
    ...globals,
  })(require, mod, mod.exports);
  return mod.exports;
}
const { watchLocation } = load('components/cleaner/location-watch.ts');
let success,
  failure,
  cleared = 0,
  sent = [],
  errors = [],
  notices = 0;
let time = 10000,
  allowed = true,
  pending,
  rejectNext = false;
const stop = watchLocation({
  geolocation: {
    watchPosition: (ok, fail, options) => {
      success = ok;
      failure = fail;
      assert.equal(options.maximumAge, 30000);
      assert.equal(options.timeout, 60000);
      assert.equal(options.enableHighAccuracy, true);
      return 7;
    },
    clearWatch: (id) => {
      assert.equal(id, 7);
      cleared++;
    },
  },
  canSend: () => allowed,
  now: () => time,
  send: async (coords) => {
    sent.push(coords);
    if (rejectNext) throw Error('offline');
    if (pending) await pending;
  },
  onError: (message, stopped) => errors.push([message, stopped]),
  onSent: () => notices++,
});
const position = (latitude, longitude, timestamp = time) => ({
  coords: { latitude, longitude },
  timestamp,
});
await success(position(1, 2));
assert.equal(sent[0].capturedAt, time, 'GPS acquisition time survives upload');
await success(position(3, 4));
assert.equal(sent.length, 1, 'successful fixes throttled to 10 seconds');
time += 10000;
await success(position(91, 4));
await success(position(NaN, 4));
assert.equal(sent.length, 1, 'invalid fixes rejected');
await success(position(3, 4, time - 30001));
assert.match(errors.at(-1)[0], /sudah usang/);
assert.equal(sent.length, 1, 'cached stale fixes rejected');
allowed = false;
await success(position(3, 4));
assert.equal(sent.length, 1, 'foreground action reserves sender');
allowed = true;
rejectNext = true;
await success(position(3, 4));
assert.equal(errors.at(-1)[0], 'offline');
rejectNext = false;
let resolve;
pending = new Promise((done) => {
  resolve = done;
});
const inFlight = success(position(5, 6));
await success(position(7, 8));
assert.equal(
  sent.length,
  3,
  'GPS requests never overlap; failed send does not throttle',
);
failure({ code: 2 });
assert.match(errors.at(-1)[0], /tidak tersedia/);
failure({ code: 3 });
assert.match(errors.at(-1)[0], /kehabisan waktu/);
assert.equal(cleared, 0, 'unavailable/timeout keep watcher alive');
stop();
resolve();
await inFlight;
assert.equal(notices, 1, 'stopped watcher ignores late completion');
await success(position(9, 10));
assert.equal(sent.length, 3);
stop();
assert.equal(cleared, 1, 'stop remains idempotent');

let denied;
watchLocation({
  geolocation: {
    watchPosition: (_ok, fail) => {
      denied = fail;
      return 7;
    },
    clearWatch: () => cleared++,
  },
  canSend: () => true,
  send: async () => {},
  onSent: () => {},
  onError: (message, stopped) => errors.push([message, stopped]),
});
denied({ code: 1 });
assert.equal(cleared, 2);
assert.equal(errors.at(-1)[1], true);
assert.match(errors.at(-1)[0], /ditolak/);

// Minimal hook harness, same transpile/VM approach as existing checks.
const slots = [],
  effects = [];
let cursor = 0;
const hooks = {
  useState: (initial) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [
      slots[index],
      (value) => {
        slots[index] = value;
      },
    ];
  },
  useRef: (initial) => {
    const index = cursor++;
    return (slots[index] ??= { current: initial });
  },
  useEffect: (callback, deps) => {
    const index = cursor++;
    const previous = slots[index];
    if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
      effects.push(() => {
        previous?.cleanup?.();
        slots[index] = { deps, cleanup: callback() };
      });
    }
  },
};
const jsx = (type, props) => ({ type, props });
let gps,
  stopped = 0,
  posts = [],
  postResolvers = [],
  unique = 0;
let secure = false;
const task = {
  stage: 'assigned',
  demo: false,
  orderStatus: 'Siap Berangkat',
  expiresAt: '2099-01-01',
  date: '2026-11-13',
  address: 'Test',
  customer: 'Test',
  staffName: 'Test',
  photos: [],
  orderId: '1',
};
const { CleanerPortal } = load(
  'components/cleaner/CleanerPortal.tsx',
  (id) => {
    if (id === 'react') return hooks;
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id === './location-watch')
      return {
        watchLocation: (options) => {
          gps = options;
          return () => stopped++;
        },
      };
    if (id === '@/lib/order-flow') return { orderTimeText: () => '09:00' };
    if (id === '@/lib/display') return { displayId: (id) => id };
    if (id === '@/types/cleaner') return { stageLabels: {} };
    return {};
  },
  {
    window: {
      get isSecureContext() {
        return secure;
      },
      parent: { postMessage: () => {} },
      location: { origin: 'https://example.test' },
    },
    navigator: { geolocation: {} },
    crypto: { randomUUID: () => `key-${++unique}` },
    setInterval: () => 1,
    clearInterval: () => {},
    AbortController,
    AbortSignal,
    fetch: (_url, options) => {
      posts.push(JSON.parse(options.body));
      return new Promise((resolve) => postResolvers.push(resolve));
    },
  },
);
const render = () => {
  cursor = 0;
  const tree = CleanerPortal({ initial: task, token: 'test' });
  while (effects.length) effects.shift()();
  return tree;
};
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree))
    return tree.flatMap((child) => nodes(child, predicate));
  return [
    ...(predicate(tree) ? [tree] : []),
    ...nodes(tree.props?.children, predicate),
  ];
}
function button(tree, text) {
  return nodes(
    tree,
    (node) =>
      node.type === 'button' &&
      JSON.stringify(node.props.children).includes(text),
  )[0];
}
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
let tree = render();
button(tree, 'Mulai Berbagi').props.onClick();
tree = render();
assert.match(JSON.stringify(tree), /HTTPS atau localhost/);
assert.equal(gps, undefined, 'HTTP LAN cannot start GPS');
secure = true;
button(tree, 'Mulai Berbagi').props.onClick();
tree = render();
assert.ok(gps);
const first = gps.send({ latitude: 1, longitude: 2 });
postResolvers.shift()({
  ok: false,
  status: 503,
  json: async () => ({ message: 'offline' }),
});
await assert.rejects(first, /offline/);
const second = gps.send({ latitude: 3, longitude: 4 });
assert.notEqual(
  posts[0].key,
  posts[1].key,
  'new coordinate never reuses failed key',
);
button(tree, 'Berangkat Sekarang').props.onClick();
assert.equal(posts.length, 2, 'depart waits for GPS request');
assert.equal(
  gps.canSend(),
  false,
  'depart reserves request slot before awaiting GPS',
);
postResolvers.shift()({
  ok: false,
  status: 503,
  json: async () => ({ message: 'offline' }),
});
await assert.rejects(second);
await settle();
assert.equal(posts.at(-1).kind, 'depart', 'GPS failure cannot swallow depart');
postResolvers.shift()({
  ok: true,
  json: async () => ({ data: { ...task, stage: 'en_route' } }),
});
await settle();
tree = render();
const third = gps.send({ latitude: 5, longitude: 6 });
button(tree, 'Saya Sudah Tiba').props.onClick();
assert.ok(stopped, 'arrival clears watcher immediately');
assert.equal(posts.length, 4, 'arrival waits for in-flight location');
postResolvers.shift()({
  ok: false,
  status: 503,
  json: async () => ({ message: 'offline' }),
});
await assert.rejects(third);
await settle();
assert.equal(posts.at(-1).kind, 'arrive', 'GPS failure cannot swallow arrival');
postResolvers.shift()({
  ok: false,
  status: 503,
  json: async () => ({ message: 'offline' }),
});
await settle();
tree = render();
button(tree, 'Mulai Berbagi').props.onClick();
tree = render();
button(tree, 'Hentikan Berbagi').props.onClick();
render();
assert.ok(stopped >= 2, 'explicit stop cleans watcher');
console.log(
  'PASS: GPS throttle, validation, no overlap, errors, cleanup, HTTPS gate, fresh keys, depart/arrive priority.',
);
