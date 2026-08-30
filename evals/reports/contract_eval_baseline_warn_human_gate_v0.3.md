# MakerFlow Contract Eval Baseline — Revision-bound Human Gate v0.3

> Provider: none（未调用真实模型API）  
> Generated at: 2026-08-23T11:21:40.618Z  
> Dataset: `evals/contract/cases.json`

## Summary

- total: 12
- pass: 6
- fail: 1
- skipped: 5
- error: 0

## Results

| eval_id | status | failure_reason |
|---|---|---|
| E01 | SKIPPED_PROVIDER_REQUIRED | SKIPPED_PROVIDER_REQUIRED: 当前未接入真实Model Provider。 |
| E02 | FAIL | CONTRACT_OWNER_MISMATCH: A6映射存在于plan-policy，但当前没有可调用的brief.validate实现/输出位置。 |
| E03 | SKIPPED_PROVIDER_REQUIRED | SKIPPED_PROVIDER_REQUIRED: 当前未接入真实Model Provider。 |
| E04 | SKIPPED_PROVIDER_REQUIRED | SKIPPED_PROVIDER_REQUIRED: 当前未接入真实Model Provider。 |
| E05 | PASS | — |
| E06 | SKIPPED_PROVIDER_REQUIRED | SKIPPED_PROVIDER_REQUIRED: 当前未接入真实Model Provider。 |
| E07 | PASS | — |
| E08 | PASS | — |
| E09 | PASS | — |
| E10 | PASS | — |
| E11 | PASS | — |
| E12 | SKIPPED_PROVIDER_REQUIRED | SKIPPED_PROVIDER_REQUIRED: 当前未接入真实Model Provider。 |

## Failures

### E02

- failure_reason: CONTRACT_OWNER_MISMATCH: A6映射存在于plan-policy，但当前没有可调用的brief.validate实现/输出位置。
- Expected:

```json
{
  "implementation_owner": "brief.validate",
  "normalized_size": {
    "preset_size": "A6",
    "width": 148,
    "height": 105,
    "unit": "mm",
    "status": "confirmed"
  }
}
```

- Actual:

```json
{
  "implementation_owner": "prototype/plan-policy.normalizeFinishedSize",
  "callable_target_skill": null,
  "normalized_size": {
    "preset_size": "A6",
    "width": 148,
    "height": 105,
    "unit": "mm",
    "status": "confirmed",
    "source": "preset"
  }
}
```

## Boundary

SKIPPED不计为PASS。本报告未调用模型API，也未修改产品逻辑或Expected。
