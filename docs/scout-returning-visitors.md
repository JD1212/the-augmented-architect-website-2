# Scout returning-visitor choice

Scout's HttpOnly session cookie still owns the anonymous conversation. No model,
agent instructions, business knowledge, schema, credentials or environment
variables change for this feature.

On a return visit, the hook fetches the authorized snapshot but does not put its
messages into rendered state. An active saved conversation instead displays:

> Welcome back! Would you like to continue our previous conversation or start something new?

Continue fetches a fresh authorized snapshot, rechecks expiry, and reveals the
transcript. It sends no message and does not execute the agent. Start New uses
DELETE and the existing cookie-rotation/confirmation flow, then shows the original
welcome and four options. Failed requests leave the old transcript hidden and
allow retry. Expired sessions use the existing fresh-session recovery.

## Visit policy

`src/lib/scout/visit.ts` stores only the boolean `1` under
`aa.scout.conversation-visible.v1` in sessionStorage after a visitor sends or
explicitly continues. This is display state, never an ownership credential. No
transcript, token, name, email or conversation ID enters browser storage.

- Refresh with an active display choice preserves the conversation.
- Client navigation and same-origin document navigation preserve that choice.
- A direct/external document visit, a new tab without a choice, or a back/forward
  return asks again if the server still has an active conversation.
- Before pagehide, the rendered transcript is cleared synchronously so the
  browser's back/forward cache cannot display its old contents on return.
- A restored cached page forgets its display choice and fetches again.
- Switching tabs or minimizing Scout within the same visit does not reset choice.
- Reset/expiry forgets choice. Denied sessionStorage fails closed on the next page
  load while supporting an in-memory choice during the current page visit.

Initial restore failures disable messaging until a successful retry determines
whether a saved conversation needs a choice. This prevents an unknown session
from displaying its history as a side effect of a new message.

## Validation

```sh
node --test tests/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
npm run start -- --port 3100
```

Against that exact server:

```sh
node tests/scout-returning.browser.mjs http://localhost:3100
node tests/scout-cookie-recovery.browser.mjs http://localhost:3100
node tests/scout-session.browser.mjs http://localhost:3100
node tests/scout-conversation.browser.mjs http://localhost:3100
node tests/scout-homepage.browser.mjs http://localhost:3100
```

Run the two fixture-proxy tests sequentially because both use port 3191. Their
model/storage fixtures avoid touching historical customer data. The returning
suite checks both desktop and mobile, including DOM mutation monitoring for
transcript flashes and recoverable restore/reset failures.

Panel bounds are measured after the existing opening animation finishes. The
settled panel matches the verified Production baseline at 360 × 600: desktop
(1440 × 1000) bounds are left 1056, top 380, right 1416, bottom 980; mobile
(390 × 844) bounds are left 18, top 232, right 378, bottom 832. Earlier checks
sampled transformed bounds during the animation. No size/position CSS was changed.
The test's sessionStorage setup is scoped to the website origin so simulated
returns through `about:blank` do not generate unrelated storage-access errors.

After Git-integrated Production deployment, `tests/scout-live.browser.mjs`
checks real streaming, persistence, secure cookies, return choice, Continue,
refresh, and Start New using synthetic conversations on the approved Vercel URL.
