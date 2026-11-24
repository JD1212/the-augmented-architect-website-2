# Second Content Strategist execution: confirmed source-ID contract failure

## Actual retained execution

Execution `c3b48b08-f80a-4613-9ad8-26c871a9bb33` ran in protected Preview at website `04967b79b712706c9e1a5cd9c319ebcb2141c2cc`, package v0.1.1, model `gpt-6-luna`. It started November 24, 2026 at 21:40:41.266 UTC and failed at 21:40:45.300 UTC.

The saved diagnostic is precise:

- One model request attempted, one provider response observed, one normalized SDK response.
- HTTP 200; provider status completed; output type function_call; three read_verified_source calls.
- Each call's sanitized argument check reported UNAUTHORIZED_SOURCE_ID at id.
- Three tool_execute boundaries, no tool_complete or host source-reading boundary.
- Final failure: UNAUTHORIZED_SOURCE_ID, phase tool_execute. No final structured message, article-schema validation, citation validation or draft persistence was reached.
- Usage: 19,163 input tokens, 72 output tokens, 19,235 total. One receipt; measured provider charge unknown/null; zero hosted web searches.
- No draft/partial revision exists. Only the consumed single-run reservation was added to the content workflow. The failed record and receipt remain unchanged.

The retained Vercel runtime-log query covering the execution returned no matching error, warning or fatal entries. The error was caught and persisted in the execution record; that record supplies the diagnosis. Raw model text, unknown argument strings, credentials and private visitor data were not retrieved or exposed.

## Confirmed cause

The native tool schema advertised id as any string up to 100 characters. Its implementation correctly accepted only an exact member of the current verified source catalog. The model therefore proposed three strings that conformed to the advertised schema but failed the runtime catalog check. SDK parsing and dispatch succeeded; the runtime guard correctly stopped all three reads.

The exact unrecognized strings were intentionally not retained. Their spelling or the model's internal reason for choosing them cannot be established. The saved summaries and native failure prove the catalog mismatch without those values.

A deterministic replay against the unmodified installed v0.1.1 package, actual approved context, real SDK and mocked provider response reproduced the mechanism: one response with three unknown string identifiers, three native tool starts, zero host source reads and UNAUTHORIZED_SOURCE_ID at tool_execute. Synthetic unknown labels were used; they are not claimed to be recovered model arguments.

## Correction and validation

Independent package v0.1.2 derives a strict id enum from the current run's verified sources, with a short explanation of the identifier namespace. The tool definition sent to the provider and the SDK argument parser now expose the same closed catalog enforced by the runtime. Unknown identifiers are rejected before execution even if a mocked provider bypasses strict decoding. No alias guessing, URL-to-ID inference, authorization bypass or source replacement was added.

Runtime authorization, snapshot matching, inspected-source/citation requirements, factual grounding, model, instructions, budgets and no-retry policy remain unchanged. The correction is business-independent; catalogs come from authorized host input. Tests assert the actual SDK request has strict=true and the exact catalog enum, excludes unverified sources, rejects three unknown IDs without retries or reads, and still completes valid source calls and final content validation.

The website's known-patch registration transition is prepared for a later fresh authorized claim; it supports the existing v0.1.0/v0.1.1 registration only with matching instructions and no active lease, using compare-and-swap. No database registration or historical execution was modified during this fix. A newer/different/disabled registration is not overwritten.

## Comparison with the first failure

First execution `02614e8c-bcf9-4b66-bda2-e624c2624ebb` had one returned response, 33,045 input / 55 output tokens, and an unresolved post-response failure. It lacks the tool and argument observations needed to establish its cause. Both versions used the permissive string parameter and both failed after a short first response, so a shared cause is possible, not proven. The separate context-budget blocker corrected in v0.1.1 is not the second run's cause: this run recorded only 70,912 input-budget bytes and failed in the source tool before another model request.

## Release boundary

Generation remains disabled and both authorizations remain consumed. No third authorization, live model execution, paid research, publication or Production deployment is part of this correction. A separately authorized controlled test is technically justified by the confirmed reproduction and strict-catalog fix, but live editorial quality and downstream model choices remain unverified. Neither successful article generation nor the first failure's root cause is claimed.

The emitted strict schema was checked against the installed SDK and [OpenAI's function-calling guidance](https://developers.openai.com/api/docs/guides/function-calling). Local tests inspect the actual serialized Responses tool definition, not just the source-level Zod object. Parallel source calls remain supported; no serial-only change was introduced.
