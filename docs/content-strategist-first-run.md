# First Content Strategist run: retained evidence and diagnostic correction

Run `02614e8c-bcf9-4b66-bda2-e624c2624ebb` failed in protected Preview commit `700f713` on November 24, 2026. The owner triggered it; no agent retry was initiated.

## Verified retained facts

- Package v0.1.0; model `gpt-6-luna`.
- Started 19:42:49.636 UTC; finished 19:42:53.639 UTC (about four seconds).
- One returned provider response receipt: 33,045 input tokens, 55 output tokens, 33,100 total. Provider charge is unknown (`measuredCost: null`).
- Failure phase `model`, with rule, field path and HTTP status all null; issue list empty.
- The history contains one failed execution and one consumed approval reservation. No content draft, partial revision or publication was saved.
- No hosted web search or paid research was part of the execution.

One completed provider request is proven. Total attempted requests, including a possible request without a returned response, were not counted by the previous adapter and cannot be independently reconstructed. Initial model access worked; the returned response was well below the configured output limit and the overall execution was far below the 150-second timeout. The retained data does not identify the original post-response exception, tool call, final-output status or citation failure.

The retained Preview logs contained no corresponding caught exception. A read-only attempt to retrieve the provider response returned 404; this execution used `store:false` and tracing was disabled. No original output is available through that response endpoint. The historical record is preserved without speculative backfills. If the owner has separately retained OpenAI project request logs, they may provide additional evidence; their availability is not assumed.

## Confirmed diagnostic defect and correction

The error formatter omitted SDK types including ToolCallError and InvalidToolInputError, and did not inspect safe nested causes. Such errors could become a null rule even when an actionable SDK type or underlying validation code was available. This is a confirmed observability defect, not proof that a tool-input failure caused the original live run.

The correction keeps bounded SDK error names, safe nested codes/schema paths where retained, categories, HTTP statuses and bounded stack frame basenames/line numbers (without full paths or exception messages). It never serializes SDK state, tool arguments, prompts, provider messages, source bodies or credentials. SDK-redacted details stay unknown; the application does not bypass SDK privacy redaction. Future records distinguish request attempts reaching the model boundary from returned provider responses and identify source-reading, model-response, validation and persistence stages. Attempt counters are dispatch-boundary observations, not proof of network transmission.

Deterministic tests reproduce the former null diagnostic for SDK-wrapped failures. A separate real-SDK test uses a mocked malformed source-tool call and provider usage receipt to verify safe classification and no retry. That malformed input is a test scenario; it is not claimed to be the original model output.

## Remaining limitation and execution controls

The original generation root cause remains unproven. No speculative agent behavior, citation relaxation, token-budget increase or tool changes were made. Generation is explicitly disabled in the corrected Preview, and the previous authorization remains consumed. No new authorization, model execution, paid research or publication is part of this correction. A second attempt requires separate owner authorization after review. The independent package and Production remain unchanged.
