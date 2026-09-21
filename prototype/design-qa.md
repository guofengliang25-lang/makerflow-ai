# MakerFlow UI Refactor · Design QA

## Reference visuals

- `D:/Downloads/Frame 2 (1).png` — 01 灵感输入
- `D:/Downloads/Frame 3.png` — 02 AI 理解 / 澄清
- `D:/Downloads/Frame 4 (1).png` — 03 方案生成
- `D:/Downloads/Frame 5 (1).png` — 04 编辑优化
- `D:/Downloads/Frame 6 (2).png` — 05 制造交付

## Implementation capture

Browser verification was performed in the local static server at a 1440×900 viewport. The five visible public stages were checked in the live browser, including the SVG preview, Preflight routing, and final delivery page.

## Comparison notes

### Passed

- Warm near-white background, white cards, restrained borders/shadows, and purple AI accent are applied globally.
- Header is reduced to MakerFlow brand + user affordance; internal hardware/pipeline labels are not shown.
- Public navigation exposes exactly five stages; internal Preflight and Resolve Issues remain state-backed but are grouped under 05 制造交付.
- Step 01 uses a single creative input, light MomoRay example entry, four manufacturing shortcuts, and the existing extraction action.
- Step 02 presents one clarification question at a time and keeps the existing Brief validation / Human confirmation logic.
- Step 03 uses three product-oriented visual directions backed by local image assets; existing accept/reject/adjust state handlers remain wired.
- Step 04 keeps the existing SVG-first editor, structure list, canvas selection/dragging, upload, undo, and layout reset.
- Step 05 keeps the SVG-only truth boundary: PDF/PNG are visibly unsupported, partial SVG export remains available, and Studio setup remains a checklist.

### Known deviations / follow-up

- Existing business scope does not include true voice capture, node-anchor editing, resize/rotate, or native xTool integration; the refactor does not invent those capabilities.
- Implementation screenshots are captured during browser QA rather than committed as product assets.

## Automated evidence

`npm test` — 162 passed, 0 failed.

`prototype/tests/five-step-ui.test.mjs` — 2 passed, 0 failed.
