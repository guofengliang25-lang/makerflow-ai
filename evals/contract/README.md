# MakerFlow Contract Eval Dataset v0.1

`cases.json`是由已确认Contract Eval Audit转换得到的Provider-neutral数据集。它不包含Prompt、Provider SDK或模型名称绑定；未来接入DeepSeek时继续复用相同`eval_id`、input、expected和forbidden约束。

## 当前执行策略

- `definition_status`只表达Case定义质量，不由PASS/FAIL推导；
- `execution_status = runnable_local`：Runner调用当前本地Rule、Tool或Workflow入口；
- `execution_status = provider_required`：当前输出`SKIPPED_PROVIDER_REQUIRED`；
- `execution_status = blocked`：保留Case定义；有诊断executor时如实运行并FAIL，没有executor时报告`EXECUTOR_UNAVAILABLE`；
- `latest_run_status`记录最近一次真实Baseline结果；
- `automation.provider_required = false`：Runner优先调用当前Demo已有的local Mock、Rule或Tool。
- `automation.provider_required = true`：当前输出`SKIPPED_PROVIDER_REQUIRED`，不伪造模型结果。
- `grader_type = human_rubric`且需要Provider：保持跳过，未来由实际Provider输出进入Human Review。
- 找不到与目标Skill一致的可调用实现时必须FAIL，不能由其他模块冒充通过。
- Expected来自已确认Eval，不因产品当前行为不同而修改。

## 运行

在MakerFlow项目根目录执行：

```powershell
node evals/runners/run_contract_evals.js
```

生成Markdown报告：

```powershell
node evals/runners/run_contract_evals.js --report evals/reports/contract_eval_baseline_brief_validate_v0.4.md
```

Runner退出规则：存在FAIL或ERROR时退出码为1；只有PASS与SKIPPED时退出码为0。SKIPPED不计为PASS。

## 当前边界

- 不调用真实模型API；
- 不修改产品逻辑；
- 不执行xTool Studio或设备操作；
- Design Spec Schema仍为Draft，相关严格字段约束保留`[待确认]`；
- Runner只输出观察结果，不自动更新Expected。
