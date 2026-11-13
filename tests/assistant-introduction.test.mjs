import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/assistant-introduction.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const testModule = { exports: {} };
vm.runInNewContext(compiled, { module: testModule, exports: testModule.exports });
const { createIntroductionSession, introductionSessionKey } = testModule.exports;

function tabStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('handling an introduction is persisted across remounts and page reloads', () => {
  const storage = tabStorage();
  const first = createIntroductionSession(storage);
  assert.equal(first.isConsumed(), false);
  assert.equal(first.consume(), true);
  assert.equal(storage.getItem(introductionSessionKey), '1');
  assert.equal(first.isConsumed(), true);
  assert.equal(createIntroductionSession(storage).isConsumed(), true);
});

test('independent tab sessions can each receive their own introduction', () => {
  const first = createIntroductionSession(tabStorage());
  const second = createIntroductionSession(tabStorage());
  first.consume();
  assert.equal(first.isConsumed(), true);
  assert.equal(second.isConsumed(), false);
});

test('unavailable or denied session storage suppresses automatic opening', () => {
  const missing = createIntroductionSession(null);
  assert.equal(missing.isConsumed(), true);
  assert.equal(missing.consume(), false);
  const denied = createIntroductionSession({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
  assert.equal(denied.isConsumed(), true);
  assert.equal(denied.consume(), false);
});

test('a failed write never grants permission to auto-open, including on later attempts', () => {
  const storage = { getItem: () => null, setItem() { throw new Error('read-only'); } };
  const session = createIntroductionSession(storage);
  assert.equal(session.isConsumed(), false);
  assert.equal(session.consume(), false);
  assert.equal(session.isConsumed(), true);
  assert.equal(createIntroductionSession(storage).consume(), false);
});
