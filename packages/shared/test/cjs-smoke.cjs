// Smoke test: garante que @plantor/shared funciona via require() puro,
// não só via import — pegou um ERR_PACKAGE_PATH_NOT_EXPORTED em produção
// antes porque só os testes (Vitest/bundler) usavam import.
const assert = require("node:assert");
const shared = require("../dist/index.js");

assert.strictEqual(typeof shared.hashContract, "function", "hashContract deveria existir");
assert.strictEqual(typeof shared.kgToSacas, "function", "kgToSacas deveria existir");
assert.deepStrictEqual(shared.CROPS, ["SOJA", "MILHO", "TRIGO"]);

console.log("OK: @plantor/shared carrega via require() (CommonJS)");
