import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScoutModule } from './helpers/scout-loader.mjs';
const { hasBookingRequest } = loadScoutModule('src/lib/assistant/booking-entry.ts');
const { assistantContent: copy } = loadScoutModule('src/content/assistant.ts');
const user = content => ({ id: 'visitor', role: 'user', content });
test('CTA request is an exact standalone user message, with no details concatenation', () => {
  assert.equal(copy.bookingEntry.request, "I'd like to book a free 30-minute consultation.");
  assert.equal(hasBookingRequest([user(copy.bookingEntry.request)]), true);
});
test('repeated CTA can resume an existing standalone booking request without another send', () => {
  for (const text of [copy.bookingEntry.request, "I'd like to schedule a free 30-minute consultation.", 'Book a free consultation', 'Please book a consultation.', 'I want to book an appointment.']) {
    assert.equal(hasBookingRequest([user(text), {id:'reply',role:'assistant',content:'What date and time would you prefer?'}]), true);
  }
  assert.equal(hasBookingRequest([]), false, 'Reset/expiry permits a fresh booking request');
});
test('business discovery, capability questions and assistant invitations do not suppress explicit CTA booking', () => {
  for (const text of ['What can you build for my business?', 'Can your assistant book appointments?', 'How does scheduling a consultation work?', "I'd like to schedule a free 30-minute consultation.\n\nWhat can you build for my business?"]) assert.equal(hasBookingRequest([user(text)]), false);
  assert.equal(hasBookingRequest([{id:'reply',role:'assistant',content:'Book a free consultation'}]), false);
});
