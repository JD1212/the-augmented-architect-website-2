import test from 'node:test';import assert from 'node:assert/strict';import {loadScoutModule} from './helpers/scout-loader.mjs';
const {consultationMessage,consultationIntent}=loadScoutModule('src/lib/assistant/booking-entry.ts');
test('CTA details use the existing user-message channel with explicit booking intent and arbitrary detail order',()=>{
 for(const details of ['Wednesday at 2pm. Alex, alex@example.invalid.','alex@example.invalid; Alex; next Friday morning','My name is Alex.','Next Tuesday please.'])assert.equal(consultationMessage(details),consultationIntent+details);
});
test('booking entry never truncates details or exceeds the existing message limit',()=>{
 assert.equal(consultationMessage('  '),null);assert.equal(consultationMessage('x'.repeat(1000)),null);
 const details='x'.repeat(1000-consultationIntent.length);assert.equal(consultationMessage(details).length,1000);
});
test('requested introduction stays exact and editable in the central UI content',()=>{
 const {assistantContent:c}=loadScoutModule('src/content/assistant.ts');assert.equal(c.bookingEntry.introduction,"I'd be happy to schedule your free 30-minute consultation! Just tell me your name, email address, and a day and time that works for you. I'll check availability and take care of the rest.");
});
