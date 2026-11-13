import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '..');
const component = (name) => ({ [name]: (props) => ({ type: name, props }) });
function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const resolve = (id) => {
    if (id === 'react/jsx-runtime') return require(id);
    if (id === '@/lib/api') return { ApiError: Error, list: async () => [] };
    if (id === '@/lib/display') return { displayId: (id) => id };
    if (id === '@/lib/resources') return { valueText: String, rupiah: String };
    if (id === '@/lib/whatsapp') return { whatsappLink: () => null };
    if (id === '@/lib/staff-photo') return { staffPhotoSource: () => null };
    if (id === '@/lib/order-work-times') return { withOrderWorkTimes: async (orders) => orders };
    if (id === '@/lib/staff-availability') return {
      activeOrderForStaff: () => undefined, staffOperationalStatus: () => 'Tersedia',
    };
    if (id === '@/lib/order-flow') return { orderTimeText: () => '' };
    if (id === 'next/link') return { default: 'a' };
    if (id.endsWith('StaffDetailModal')) return { ...component('StaffDetailModal'), ...component('StaffPhone') };
    if (id.endsWith('StatusBadge')) return component('Badge');
    if (id.startsWith('./')) return component(id.split('/').at(-1));
    throw Error('Unexpected import: ' + id);
  };
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: file })(resolve, module, module.exports);
  return module.exports;
}
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  if (Array.isArray(node)) return node.map(text).join('');
  return text(node.props?.children);
}
const staff = { id: '1', name: 'Sari', phone: '', skills: [], status: 'Tersedia', rating: 4.9, completedBookings: 2 };
const { PeopleList } = load('components/PeopleList.tsx');
const list = text(PeopleList({ shown: [staff], resource: 'staff' }));
assert.ok(!list.includes('4.9'), 'Staff list must not display legacy person rating');
const { StaffDetailServer } = load('components/StaffDetailServer.tsx');
const detail = await StaffDetailServer({ staff });
const profile = text(detail.props.profile);
assert.ok(!profile.includes('4.9'), 'Staff profile must not display person rating');
assert.ok(profile.includes('2 pesanan selesai tercatat'), 'Use server completed unique booking count, not fetched order list length');
console.log('Staff metrics UI: PASS');
