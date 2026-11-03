const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

module.exports = function loadTypeScript(file, mocks = {}) {
  const filename = path.resolve(__dirname, "..", file);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const result = { exports: {} };
  const localRequire = id => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  new Function("require", "module", "exports", source)(localRequire, result, result.exports);
  return result.exports;
};
