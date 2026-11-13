// Smoke test: garante que @plantor/shared carrega via require() puro (CommonJS),
// do mesmo jeito que a API compilada o consome em runtime. Os testes do Vitest
// usam import/bundler e não pegam um ERR_PACKAGE_PATH_NOT_EXPORTED ou um
// "require is not defined in ES module scope" — este script pega.
// Rode depois do build: npm run test:cjs-smoke --workspace=@plantor/shared
const assert = require('node:assert');
const shared = require('@plantor/shared');

assert.strictEqual(typeof shared.canonicalHash, 'function', 'canonicalHash deveria existir');
assert.strictEqual(typeof shared.canTransition, 'function', 'canTransition deveria existir');
assert.strictEqual(typeof shared.calculatePriceAdjustment, 'function');
assert.ok(shared.GRAIN_TYPES.includes('soja'), 'GRAIN_TYPES deveria incluir soja');
assert.strictEqual(shared.SACK_WEIGHT_KG, 60);

console.log('OK: @plantor/shared carrega via require() (CommonJS)');
