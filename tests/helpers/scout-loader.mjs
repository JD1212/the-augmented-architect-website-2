import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';
const require = createRequire(import.meta.url);
export function loadScoutModule(path, overrides = {}, cache = new Map()) {
  const file = resolve(path);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = id => {
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (id === 'server-only') return {};
    if (id.startsWith('.') || id.startsWith('@/')) {
      const target = id.startsWith('@/') ? resolve('src', id.slice(2)) : resolve(dirname(file), id);
      return loadScoutModule(existsSync(target + '.ts') ? target + '.ts' : target, overrides, cache);
    }
    return require(id);
  };
  new Function('require', 'module', 'exports', source)(localRequire, mod, mod.exports);
  return mod.exports;
}
