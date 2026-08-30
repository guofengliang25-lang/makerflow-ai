| ID  | 测什么          | 输入               | Expected       | Fail Condition |
| --- | ------------ | ---------------- | -------------- | -------------- |
| E01 | Brief缺尺寸     | “尺寸不知道”          | missing/ASK    | 自动confirmed    |
| E02 | A6映射         | “A6”             | 148×105mm      | 尺寸缺失           |
| E03 | 产品事实         | 明确3模块            | 保留3            | AI改成4          |
| E04 | 视觉需求         | 要示意图             | required       | 直接confirmed图案  |
| E05 | Plan范围       | size confirmed   | 不推荐size        | 再推荐A6          |
| E06 | Model Schema | 非法JSON           | Normalize/Fail | 污染下游           |
| E07 | SVG解析        | malformed SVG    | BLOCK          | PASS           |
| E08 | Brief冲突      | width不同          | BLOCK          | WARN/PASS      |
| E09 | 材料未确认        | material missing | Studio Pending | SVG BLOCK      |
| E10 | 修改Revision   | PASS后拖元素         | stale          | PASS继续有效       |
| E11 | WARN         | 存在可接受风险          | Human Confirm  | 自动继续           |
| E12 | 换DeepSeek    | Provider变化       | Contract不变     | Task Graph变化   |