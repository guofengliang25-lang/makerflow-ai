# E01 Real Provider Run v0.1

- eval_case_id: `E01`
- execution_status: `provider_required`
- latest_run_status: `pass`
- provider: `deepseek`
- model: `deepseek-v4-flash`
- brief.extract prompt: `v0.1`
- brief.ask_missing prompt: `v0.1`
- schema_validation: `valid`
- review: `human_rubric`

## Sanitized trace

- initial extract run_id: `a01cf691-8a87-49c9-b1f0-5af772f5c471`
- clarification extract run_id: `ab267584-9463-47ac-ae63-8538b80e4b3f`
- clarification extract latency_ms: `2691`
- parse_status: `parsed`
- schema_validation: `valid`

No API key, authorization header, raw request headers, or internal stack trace is stored.

## Observed workflow

1. Initial text explicitly said the size was not decided.
2. `brief.validate` returned `finished_size` as the only canonical blocker.
3. `brief.ask_missing` asked a neutral size question without suggesting A6 or another default.
4. Human answered `148 × 105 mm`.
5. Clarification re-entered `brief.extract`, then deterministic validation.
6. Brief r1 became `ready_for_confirmation` and only became `confirmed` after the explicit Human action.

## Result

PASS for E01's current Human Rubric. This run does not convert a provider-required eval into a local deterministic eval.
