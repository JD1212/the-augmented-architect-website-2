# Scout composer dictation

Dictation is browser-native input assistance. It updates the same editable Scout
draft and never sends it. Tap once to start and again to stop; use Send normally.
Existing typed text is retained, interim results replace their own speech span,
and manual edits take precedence over subsequent recognition corrections.

The small microphone appears only when `SpeechRecognition` or
`webkitSpeechRecognition` is available. Permission is requested by the browser on
an explicit tap. Recognition errors leave typing available. Startup, silence and
missing-end watchdogs prevent a stuck listening state. Closing, submitting,
using the composer booking button, navigation, hiding/leaving the page, or unmounting aborts
capture and detaches callbacks. Nothing automatically restarts recognition.

No new backend, credentials, audio storage, speech synthesis, or agent changes
are involved. The browser/provider may process speech online; this is not a claim
of offline or on-device processing. Support and permission requirements vary:
https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

## Verification

- `node --test tests/dictation.test.mjs`: real controller/draft reducer with fake
  native recognition events, failures and watchdogs.
- `node tests/scout-dictation.browser.mjs http://localhost:3100`: actual production
  React UI in Chrome at desktop/mobile sizes, standard/prefixed/unsupported API
  paths, live draft updates, explicit send, denial/failure recovery and cleanup.
  Chat responses are fixtures; no appointments or verification emails are created.
- The browser test also checks native Chrome API availability and failure recovery
  with denied microphone permission and fake hardware. Successful speech events
  are simulated. This does not certify real-world audio recognition.
- Safari automation could not start because Allow Remote Automation is disabled.
  No Safari settings were changed. Prefixed API contract tests in Chrome do not
  substitute for actual Safari or iOS testing.

Before relying on dictation in a particular browser/device, manually grant its
microphone permission, speak a short phrase, stop, edit, then explicitly send.
Also check denied permission and silence. Native services can end listening on
silence or network failure; the visitor can tap to retry. Typing remains available.
