import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '..');

function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const resolve = (id) => {
    if (id === '@/types') return {};
    if (id.startsWith('.')) return {};
    return require(id);
  };
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', {
    filename: file,
  })(resolve, module, module.exports);
  return module.exports;
}

const reports = load('features/reports/data/reportRules.ts');

// Periode
assert.equal(reports.parseReportMonth('2026-11'), '2026-11');
for (const invalid of ['2026-13', '2026-00', '11-2026', '', null, 42])
  assert.equal(reports.parseReportMonth(invalid), '', String(invalid));
assert.equal(reports.reportTab('Laporan Harian'), 'Laporan Harian');
assert.equal(reports.reportTab('Mingguan'), reports.REPORT_TABS[0]);
assert.equal(reports.reportMonthLabel(''), 'Semua Periode');
assert.match(reports.reportMonthLabel('2026-11'), /November 2026/);

// Fixture: satu order bisa punya dua kru.
const orders = [
  {
    id: 'A',
    customer: 'Ani',
    service: 'Deep Cleaning',
    date: '2026-11-01',
    status: 'Selesai',
    price: 100000,
    staff: ['Sari', 'Budi'],
    paymentMethod: 'Midtrans',
  },
  {
    id: 'B',
    customer: 'Ani',
    service: 'Sofa',
    date: '2026-11-08',
    status: 'Selesai',
    price: 50000,
    staff: ['Sari'],
    paymentMethod: 'Tunai',
  },
  {
    id: 'C',
    customer: 'Bima',
    service: 'Kost',
    date: '2026-11-29',
    status: 'Selesai',
    price: 25000,
    staff: ['Budi'],
  },
  {
    id: 'D',
    customer: 'Citra',
    service: 'Kantor',
    date: '2026-11-15',
    status: 'Batal',
    price: 999000,
    staff: ['Sari'],
  },
  {
    id: 'E',
    customer: 'Dewi',
    service: 'AC',
    date: '2026-10-30',
    status: 'Selesai',
    price: 70000,
    staff: ['Sari'],
  },
];

const november = reports.completedOrders(orders, '2026-11');
assert.deepEqual(
  november.map((order) => order.id),
  ['A', 'B', 'C'],
);
assert.equal(reports.completedOrders(orders, '').length, 4);

const summary = reports.reportSummary(november);
assert.deepEqual(summary, { total: 175000, customers: 2, count: 3 });

// Tanggal 29 masuk minggu keempat, bukan minggu kelima.
assert.deepEqual(reports.weeklyTotals(november), [100000, 50000, 0, 25000]);
assert.deepEqual(
  reports.weeklyTotals([
    { date: '2026-11-07', price: 1 },
    { date: '2026-11-08', price: 2 },
    { date: '2026-11-31', price: 3 },
  ]),
  [1, 2, 0, 3],
);
assert.equal(reports.barHeight([100], 100), '90%');
assert.equal(reports.barHeight([100], 0), '2%');

const payments = reports.paymentBreakdown(november);
assert.equal(payments.total, 3);
assert.equal(payments.missing, 1);
assert.deepEqual(payments.entries, [
  { name: 'Midtrans', count: 1, percent: 33 },
  { name: 'Tunai', count: 1, percent: 33 },
]);

assert.deepEqual(reports.groupReport(november, reports.REPORT_TABS[0]), []);
assert.deepEqual(reports.groupReport(november, reports.REPORT_TABS[1]), [
  { name: '2026-11-01', count: 1, amount: 100000 },
  { name: '2026-11-08', count: 1, amount: 50000 },
  { name: '2026-11-29', count: 1, amount: 25000 },
]);
assert.deepEqual(reports.groupReport(november, reports.REPORT_TABS[2]), [
  { name: 'Ani', count: 2, amount: 150000 },
  { name: 'Bima', count: 1, amount: 25000 },
]);
assert.deepEqual(reports.groupReport(november, reports.REPORT_TABS[3]), [
  { name: 'Sari', count: 2, amount: 150000 },
  { name: 'Budi', count: 2, amount: 125000 },
]);

// Tautan
assert.equal(reports.reportHref({}), '/laporan');
assert.equal(
  reports.reportHref({ month: '2026-11', tab: 'Laporan Harian' }),
  '/laporan?month=2026-11&tab=Laporan+Harian',
);
assert.equal(reports.reportExportHref(''), '/laporan/export');
assert.equal(
  reports.reportExportHref('2026-11'),
  '/laporan/export?month=2026-11',
);

// CSV: BOM, CRLF, kutip ganda, dan guard formula.
const csv = reports.reportCsv([
  {
    id: 'A',
    customer: 'Ani "P"',
    service: '=CMD()',
    date: '2026-11-01',
    status: 'Selesai',
    price: 100000,
  },
]);
assert.ok(csv.startsWith('\uFEFF"ID","Pelanggan"'));
assert.ok(csv.includes('\r\n'));
assert.ok(csv.includes('"Ani ""P"""'));
assert.ok(csv.includes(`"'=CMD()"`));
assert.equal(reports.reportFilename(''), 'laporan-cleango.csv');
assert.equal(reports.reportFilename('2026-11'), 'laporan-cleango-2026-11.csv');

console.log('PASS laporan: periode, agregasi mingguan, pembayaran, grup, CSV');
