import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const filename = new URL('../lib/promo-rules.ts', import.meta.url);
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const module = { exports: {} };
vm.runInThisContext('(function(module,exports){' + source + '\n})')(
  module,
  module.exports,
);
const { quotePromo, parsePromo } = module.exports;
const promo = {
  discountType: 'percentage',
  discountValue: 25,
  maxDiscount: null,
  minPurchase: 0,
  stackable: false,
};
assert.deepEqual(quotePromo(promo, { price: 350000, discountPrice: 299000 }), {
  price: 350000,
  discount: 87500,
  total: 262500,
  reason: '',
});
assert.equal(
  quotePromo(
    { ...promo, stackable: true },
    { price: 350000, discountPrice: 299000 },
  ).total,
  262500,
);
console.log('PASS Percentage uses normal price and ignores legacy stacking');
assert.equal(
  quotePromo({ ...promo, maxDiscount: 50000 }, { price: 350000 }).total,
  300000,
);
assert.equal(
  quotePromo(
    { ...promo, discountType: 'fixed', discountValue: 500000 },
    { price: 350000 },
  ).total,
  0,
);
console.log(
  'PASS Maximum discount and fixed discount never produce negative totals',
);
const below = quotePromo({ ...promo, minPurchase: 400000 }, { price: 350000 });
assert.equal(below.total, 350000);
assert.equal(below.discount, 0);
assert.ok(below.reason);
console.log(
  'PASS Minimum purchase keeps normal price and gives a clear reason',
);
const form = new FormData();
for (const [key, value] of Object.entries({
  name: 'Harga layanan',
  code: 'HEMAT25',
  discountType: 'percentage',
  discountValue: '25',
  maxDiscount: '',
  minPurchase: '0',
  scope: 'all',
  startsOn: '2026-10-16',
  endsOn: '2026-10-31',
  usageLimit: '',
  perCustomerLimit: '1',
  active: 'true',
  stackable: 'true',
}))
  form.set(key, value);
const parsed = parsePromo(form);
assert.deepEqual(parsed.errors, {});
assert.equal(parsed.data.stackable, false);
form.set('discountValue', '101');
assert.ok(parsePromo(form).errors.discountValue);
console.log(
  'PASS Promo parser disables stacking and rejects percentage above 100',
);
console.log('4 pricing groups passed.');
