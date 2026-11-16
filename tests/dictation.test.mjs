import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScoutModule } from './helpers/scout-loader.mjs';
const { recognitionConstructor, createDictationDraft, createDictation } = loadScoutModule('src/lib/assistant/dictation.ts');
const results = (...words) => words.map(transcript => ({ 0: { transcript } }));
function fixture(extra = {}) {
  const instances = [], changes = [], statuses = [], errors = [];
  class Recognition {
    starts = 0; stops = 0; aborts = 0;
    constructor() { instances.push(this); }
    start() { this.starts++; }
    stop() { this.stops++; }
    abort() { this.aborts++; }
  }
  const controller = createDictation({ Constructor: Recognition, lang: 'en-US', onDraft: t => changes.push(t), onStatus: s => statuses.push(s), onError: e => errors.push(e), ...extra });
  return { controller, instances, changes, statuses, errors };
}
test('standard and Safari-prefixed feature detection, without assuming browser support', () => {
  const Standard = class {}, Prefixed = class {};
  assert.equal(recognitionConstructor({ SpeechRecognition: Standard, webkitSpeechRecognition: Prefixed }), Standard);
  assert.equal(recognitionConstructor({ webkitSpeechRecognition: Prefixed }), Prefixed);
  assert.equal(recognitionConstructor({}), undefined);
});
test('interim results replace only the previous speech span, preserving the typed draft and avoiding duplicates', () => {
  const draft = createDictationDraft('I need help');
  assert.equal(draft.result(results('with Sales')).text, 'I need help with Sales');
  assert.equal(draft.result(results('with Salesforce')).text, 'I need help with Salesforce');
  assert.equal(draft.result(results('with Salesforce', 'and integrations')).text, 'I need help with Salesforce and integrations');
  assert.equal(draft.result(results('with Salesforce', 'and integrations')).text, 'I need help with Salesforce and integrations');
});
test('typing before and after live speech remains intact during later interim corrections', () => {
  const draft = createDictationDraft('Discuss');draft.result(results('AI'));
  draft.edit('Please Discuss AI');draft.edit('Please Discuss AI today.');
  assert.equal(draft.result(results('AI architecture')).text, 'Please Discuss AI architecture today.');
});
test('manual edits inside dictated words take precedence; new phrases can still append', () => {
  const draft = createDictationDraft('');draft.result(results('Sales force'));
  draft.edit('Salesforce');assert.equal(draft.result(results('Sales force')).text, 'Salesforce');
  assert.equal(draft.result(results('Sales force', 'architecture')).text, 'Salesforce architecture');
});
test('whitespace and message limits preserve existing typed content', () => {
  assert.equal(createDictationDraft('Hello ').result(results('world')).text, 'Hello world');
  const initial='x'.repeat(995), result=createDictationDraft(initial).result(results('abcdef'));
  assert.equal(result.text.length, 1000);assert(result.text.startsWith(initial));assert.equal(result.full,true);
});
test('one tap starts, requests live results, and a second tap stops with final editable text', () => {
  const f=fixture();f.controller.start('Typed');const r=f.instances[0];
  assert.equal(r.starts,1);assert(r.continuous&&r.interimResults);assert.equal(r.lang,'en-US');assert.equal(f.statuses.at(-1),'starting');
  r.onstart();assert.equal(f.statuses.at(-1),'listening');r.onresult({results:results('and spoken')});
  f.controller.start('ignored');assert.equal(f.instances.length,1);
  f.controller.stop();assert.equal(r.stops,1);assert.equal(f.statuses.at(-1),'stopping');
  r.onresult({results:results('and spoken words')});r.onend();assert.equal(f.statuses.at(-1),'idle');assert.equal(f.changes.at(-1),'Typed and spoken words');
  f.controller.start(f.changes.at(-1));f.instances[1].onresult({results:results('again')});assert.equal(f.changes.at(-1),'Typed and spoken words again');f.controller.dispose();
});
test('permission denial, service/network errors, and startup exceptions preserve the draft and permit retry', () => {
  for(const [error,expected]of [['not-allowed','denied'],['service-not-allowed','denied'],['network','network'],['audio-capture','unavailable'],['no-speech','noSpeech'],['other','failed']]) {
    const f=fixture();f.controller.start('Keep this');const r=f.instances[0];r.onerror({error});
    assert.equal(f.errors.at(-1),expected);assert.equal(f.statuses.at(-1),'idle');assert.equal(f.changes.length,0);assert.equal(r.aborts,1);
    f.controller.start('Keep this');assert.equal(f.instances.length,2);f.controller.dispose();
  }
  for(const exception of [Object.assign(new Error(),{name:'NotAllowedError'}),{name:'NotAllowedError'},{name:'SecurityError'}]){const f=fixture({Constructor:class { start(){throw exception;} abort(){} }});f.controller.start('Typed');assert.equal(f.errors.at(-1),'denied');assert.equal(f.statuses.at(-1),'idle');f.controller.dispose();}
});
test('silence and missing browser end events cannot leave recognition stuck', async () => {
  const f=fixture({timeouts:{startup:15,silence:15,stop:15}});f.controller.start('Kept');f.instances[0].onstart();
  await new Promise(r=>setTimeout(r,55));assert.equal(f.errors.at(-1),'noSpeech');assert.equal(f.statuses.at(-1),'idle');assert.equal(f.instances[0].stops,1);assert.equal(f.instances[0].aborts,1);assert.equal(f.changes.length,0);
  f.controller.start('Kept');await new Promise(r=>setTimeout(r,25));assert.equal(f.errors.at(-1),'unavailable');assert.equal(f.statuses.at(-1),'idle');f.controller.dispose();
});
test('cancel/dispose abort once, detach callbacks, and reject stale events after send, navigation or unmount', () => {
  const f=fixture();f.controller.start('Keep');const r=f.instances[0], late=r.onresult;
  r.onresult({results:results('this')});f.controller.cancel();assert.equal(r.aborts,1);assert.equal(r.onresult,null);
  late({results:results('must not appear')});assert.equal(f.changes.at(-1),'Keep this');
  f.controller.dispose();assert.equal(r.aborts,1);
  f.controller.start('New');const next=f.instances[1], count=f.statuses.length;f.controller.dispose();assert.equal(next.aborts,1);assert.equal(f.statuses.length,count);
});
test('natural end, no-match and full-input handling remain recoverable without auto restarting', () => {
  const f=fixture();f.controller.start('Text');f.instances[0].onend();assert.equal(f.errors.at(-1),'noSpeech');assert.equal(f.instances.length,1);
  f.controller.start('Text');f.instances[1].onnomatch();assert.equal(f.instances[1].stops,1);f.controller.cancel();
  f.controller.start('x'.repeat(1000));assert.equal(f.errors.at(-1),'tooLong');assert.equal(f.instances.length,2);f.controller.dispose();
});
