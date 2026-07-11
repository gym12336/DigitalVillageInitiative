# 实践中工作台布局重构 · 材料列表归并右栏

- 作者：gym
- 日期：2026-07-11
- 状态：草案，待用户审校
- 用途：解决「实践中」采集工作台左栏被材料列表撑长、左右两份材料列表重复的问题
- 关联：延续 [实践中 AI 采集工作台设计](2026-07-11-practice-track-layout-redesign-design.md)

---

## 0. 一句话定位

把左栏的「手动登记材料」清单（`TrackMedia`）移进右栏「材料 Tab」，让左栏回归纯操作区（上传 + AI 输入），材料的编辑与审校集中在右栏一个 Tab 内滚动查看。

## 1. 背景与问题

当前 `StageTrack.vue` 左右分栏，左栏从上到下堆三块：

```
左栏                          右栏（Tab）
① UploadPanel  上传材料        [指标] [材料] [人物]
② TrackExtract AI 输入 + 综述   材料 Tab → MaterialGroups（只读分组）+ DraftReview
③ TrackMedia   手动登记材料清单
```

两个问题：

1. **左栏被撑长**：`TrackMedia` 把整份材料清单平铺在 AI 输入框正下方。材料一多，AI 输入框被推离视口，操作不便。
2. **材料列表重复**：右栏材料 Tab 已有一份材料展示（`MaterialGroups`，只读按类型分组），与左栏 `TrackMedia` 内容重复，用户不清楚以哪份为准。

> 澄清：右栏的「待审校」（`DraftReview`）不是待办清单，而是 AI 从上传文件/粘贴文本里抽出的候选条目（人物/指标/材料要点），供用户采纳或丢弃。它是 AI 产出，保留现状。

## 2. 目标布局

```
┌─────────────────────────────┬──────────────────────────────┐
│ 左栏：纯操作区（高度稳定）    │ 右栏：采集成果（Tab，内部滚动）  │
│                             │  [指标] [材料] [人物]          │
│ ① UploadPanel  上传材料      │                              │
│ ② TrackExtract AI 输入+综述  │  材料 Tab：                    │
│                             │   · 可编辑材料列表（滚动）       │
│  （左栏到此结束）             │   · + 手动登记材料             │
│                             │   · DraftReview 材料要点待审校  │
└─────────────────────────────┴──────────────────────────────┘
```

## 3. 具体改动

### 3.1 左栏：移除 TrackMedia

`StageTrack.vue` 的 `.col-left` 只保留 `UploadPanel` + `TrackExtract`。左栏高度从此由这两块的固定内容决定，AI 输入框稳定在视口内。

### 3.2 右栏材料 Tab：用 TrackMedia 取代 MaterialGroups

右栏材料 Tab 内，用 `TrackMedia`（可编辑列表）取代 `MaterialGroups`（只读分组）。取舍理由：`TrackMedia` 功能更全，涵盖 `MaterialGroups` 的展示能力且额外支持编辑：

- 每条材料：缩略图/类型图标 · 类型下拉 · 名称 · 备注
- 行内操作：📎 补传文件（手动登记行）· 🤖 AI 描述此图 · 查看 ↗ · 删除
- 底部：`+ 手动登记材料` 按钮
- 其下接 `DraftReview`（材料要点待审校），保持不变

`MaterialGroups.vue` 在实践中工作台不再被引用（其 `@preview` 预览能力已由 `TrackMedia` 内置的 `MediaPreview` 覆盖）。本次不删除该组件文件，仅解除引用，避免影响其他潜在使用点。

### 3.3 右栏滚动

给右栏 Tab 面板（`.tab-panel`）设 `max-height` + `overflow-y: auto`，材料再多也只在 Tab 内部滚动，不撑长整个页面。三个 Tab（指标/材料/人物）统一处理，行为一致。

### 3.4 预览目标整合

当前 `StageTrack.vue` 持有 `preview` 状态供 `MaterialGroups` 的 `@preview` 使用。改用 `TrackMedia` 后，预览由 `TrackMedia` 自身内置的 `MediaPreview` 处理，`StageTrack` 中为 `MaterialGroups` 准备的 `preview` 状态与 `<MediaPreview>` 可一并移除（若无其他 Tab 使用）。

## 4. 数据流

不变。`TrackMedia` 绑定 `state.materials`（父组件 `StageTrack` 的响应式引用），采纳 `onImported` / `adoptDraft` 写入的仍是同一数组。组件只是从左栏搬到右栏材料 Tab，props（`materials`、`dossierId`）与 emit（`change`）不变，保存/督进逻辑不受影响。

`dossierForAnalysis`（喂给 `TrackProgress` 的四维督进）读的是 `state.materials`，来源不变，进度看板照常工作。

## 5. 影响面与测试

- **改动文件**：`StageTrack.vue`（模板结构 + 少量样式）。`TrackMedia.vue` 本身不改。
- **解除引用**：`MaterialGroups.vue`（不删文件）。
- **回归测试**：`npm test` 跑现有用例（`mine-trackMedia.test.js`、`mine-stageTrack-tasks.test.js` 等）。`TrackMedia` 逻辑未变应继续通过；`StageTrack` 结构变动需确认相关用例不断言旧的左栏 `TrackMedia` 位置。
- **手动验证**：① 上传多个材料后左栏不被撑长；② 右栏材料 Tab 列表可滚动、可编辑、可补传/识图/删除；③ 待审校采纳后条目进入材料列表。

## 6. YAGNI 边界

- 不引入拖拽排序、不改材料数据结构、不动上传接口。
- 不删 `MaterialGroups.vue` 文件（仅解除引用），避免波及未知使用点。
- 指标/人物 Tab 的现有结构不动，只统一加滚动。
