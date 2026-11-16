import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScoutModule } from './helpers/scout-loader.mjs';
import { schedulingFixture } from './helpers/scheduling-fixture.mjs';

// Opt in locally: SCOUT_INTRO_LIVE=1 node --env-file=.env.local --test tests/scout-intro.test.mjs
// Uses the configured model and real SDK/skill; all scheduling/storage/email services
// are fixtures. No website session, database row, invitation, or appointment is created.
test('suggested business introduction is conversational; requested package facts remain complete', {
  skip: process.env.SCOUT_INTRO_LIVE !== '1', timeout: 180000,
}, async t => {
  const f = schedulingFixture(), calls = [];
  const service = new Proxy(f.service, { get(target, key) {
    const value = Reflect.get(target, key);
    if (typeof value !== 'function') return value;
    return (...args) => { if (key !== 'ui') calls.push(key); return value.apply(target, args); };
  } });
  const { createScoutModel } = loadScoutModule('src/lib/scout/agent.ts', {
    '@/lib/booking/scheduling-server': { schedulingEnabled: () => true, schedulingService: () => service },
  });
  const { assistantContent } = loadScoutModule('src/content/assistant.ts');
  const question = assistantContent.starters[0].message;
  assert.equal(question, 'What can you build for my business?');
  const model = createScoutModel();
  await model.verify();
  const ask = messages => model.reply(messages, AbortSignal.timeout(45000), () => {}, {
    ownerHash: 'synthetic-intro-review', visitorTimezone: 'America/Los_Angeles',
  });
  let introduction;
  // Multiple fresh runs exercise natural variation, not a canned UI response.
  for (let i = 0; i < 3; i++) {
    const reply = await ask([{ id: 'intro', role: 'user', content: question }]);
    const text = reply.text.trim(); introduction ??= text;
    t.diagnostic(`Introduction ${i + 1}: ${text}`);
    assert(text.split(/\s+/).length <= 95, 'Brief introductory response');
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
    assert(sentences.length >= 2 && sentences.length <= 4, 'Two to four short sentences');
    assert.match(text, /custom business applications/i);
    for (const topic of [/website/i, /customers/i, /employees|team|staff/i, /software|systems/i, /AI assistant/i, /schedul/i]) assert.match(text, topic);
    assert.equal((text.match(/\?/g) ?? []).length, 1, 'One useful follow-up');
    assert.match(text, /(?:what|which).*business[^?]*\?\s*$/i, 'Ends with a relevant business question');
    assert.doesNotMatch(text, /\$|\bpric(?:e|ing)\b|\b10,?000\b|up to four|integration limits|consultation|\bbook(?:ing)?\b|\b30.minute\b/i, 'No unsolicited package dump or booking pitch');
  }
  const facts = (await ask([
    { id: 'intro', role: 'user', content: question },
    { id: 'reply', role: 'assistant', content: introduction },
    { id: 'facts', role: 'user', content: 'What is the starting price, how many supported integrations are included, does calendar scheduling count toward that total, and is an AI assistant included? What happens beyond the agreed scope?' },
  ])).text;
  t.diagnostic(`Requested package facts: ${facts}`);
  assert.match(facts, /\$10,000/);
  assert.match(facts, /up to (?:four|4)/i);
  assert.match(facts, /(?:calendar|scheduling).*(?:count|includ|total)|(?:count|includ|total).*(?:calendar|scheduling)/is);
  assert.match(facts, /(?:one|1).*assistant|assistant.*(?:one|1)/is);
  assert.match(facts, /separately|additional scope|separate scope|scoped|extra|additional cost/i);
  assert.deepEqual(calls, [], 'Introductory/factual answers need no scheduling actions');
  assert.equal(f.sent.length, 0); assert.equal(f.records.size, 0); assert.equal(f.booking.creates, 0);
});
