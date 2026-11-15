# Scout anonymous-session recovery

Anonymous conversations expire after 24 hours without conversation activity.
Restoring a page or reopening Scout does not extend that window. Completed
conversation activity updates `last_activity_at` and the expiry deadline. Existing
seven-day rows also respect the 24-hour inactivity limit without a migration.
Expired conversations and turns remain in the database.

## Recovery bug

A real Chromium cookie jar reproduced the reported welcome → repeated 410 loop
when an expired legacy `scout_session` cookie was scoped to `/api/scout` or `/api`.
Issuing a replacement at `/` leaves the narrower cookie intact. Browsers send
both cookies, and selecting the first credential repeatedly selected the old
owner. This reproduces the reported symptoms; it does not establish the contents
of any particular visitor's browser profile.

The HTTP handler now rejects ambiguous duplicate credentials, expires the known
legacy development-cookie paths during rotation, and issues a fresh root cookie.
Production retains its Secure, HttpOnly, SameSite=Lax, host-only
`__Host-scout_session` cookie at `/`; no invalid non-root `__Host-` cookies are
issued. Credentials never enter JavaScript storage or response bodies.

The client confirms that the new cookie returns on a subsequent snapshot request.
If a send receives the explicit pre-execution `scout_session_reset` response, it
confirms the replacement session and retries the original message and turn ID
once. It never retries an arbitrary authentication error or a partial stream.
Blocked cookies or a second reset stop recovery with an actionable message and
preserve the submitted draft instead of looping.

## Validation

Run against a freshly started production build, not an older process using a
previous `.next` output:

```sh
node --test tests/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
npm run start -- --port 3100
```

In another terminal:

```sh
node tests/scout-cookie-recovery.browser.mjs http://localhost:3100
node tests/scout-session.browser.mjs http://localhost:3100
node tests/scout-conversation.browser.mjs http://localhost:3100
node tests/scout-homepage.browser.mjs http://localhost:3100
```

The cookie-recovery browser test renders the real React UI and uses the actual
HTTP/service handlers through a test-only proxy. Only storage and the model are
fixtures, allowing time to advance without changing real customer records. It
checks six cookie scenarios, desktop/mobile layouts, first-send `hi`, expiry
during submission, a subsequent successful message, preserved historical rows,
accepted Set-Cookie headers, and absence of duplicate model execution. Unit tests
also cover blocked cookies and bounded recovery failure.

No new environment variables, database migration, authentication UI, model change,
Agents SDK change, business-knowledge change, or visual changes are required.
The separate customer-identity proposal is not part of this release.
