# 待审校项并入右栏对应 Tab 设计

- 日期：2026-07-11
- 栏目：乡村实践 · 我的实践 · 实践中（采集阶段）
- 关联：[[shuxiang-practice-track]]；上游 `2026-07-11-practice-track-layout-redesign-design.md`、`2026-07-11-upload-panel-by-type-design.md`、`2026-07-11-zip-import-design.md`
- 性质：纯前端状态提升 + 渲染位置重排。adopt 逻辑、富字段、collected/后端全不变。

## 一、问题

导入压缩包/文档后，AI 抽取的待审校项（人物/指标/材料要点）全堆在左栏 AI 区一列竖排。导入量大时左栏几十条排到天上、右栏 Tab 只显示已采纳的、显得很空。审校与最终去向割裂，逐条点采纳也累。

## 二、决策（用户拍板：A 方案）

待审校项按类别并入右栏对应 Tab 的「待审区」，加批量采纳/丢弃，Tab 角标显示待审数。

## 三、设计

### 状态提升
- `draft{people,metrics,materialHints}` + `mergeDraft` + `adoptPerson/Metric/Hint` 从 TrackExtract 提升到 StageTrack。
- TrackExtract 瘦为纯输入区（自然语言框 + AI 提取 + 成果综述），提取结果经回调 merge 进 StageTrack 的 draft，不再自渲染待审列表。
- UploadPanel 导入草稿也 merge 进同一 draft（StageTrack.onImported 直接调 mergeDraft，不再走 TrackExtract 的 ref）。
- 成果综述待审校仍留 AI 区（作品级，不属三类）。

### 右栏三 Tab 各分两区
```
指标 Tab：已采纳前后值表格 + 🕓待审指标(DraftReview)
材料 Tab：MaterialGroups 已归类 + 🕓待审材料要点(DraftReview)
人物 Tab：已采纳人物表格 + 🕓待审人物(DraftReview)
```
Tab 标题角标：`指标 5` + 待审>0 时加 `🕓3`。

### 新增 DraftReview.vue
- props：`kind`（'people'|'metrics'|'materialHints'）、`items`（draft 数组）。
- emits：`adopt(index)`、`discard(index)`、`adopt-all`、`discard-all`。
- 渲染：每条按 kind 显示可编辑字段（人物 name/role/quote、指标 name/value/unit、材料 name/note）+ 来源文件标签 + 把握度 + 采纳/丢弃；顶部「全部采纳」「全部丢弃」批量按钮。
- 复用现有 draft-card 样式。三处 Tab 各用一个实例。

### StageTrack 承接
- 持有 draft、mergeDraft、adopt*（沿用原逻辑，采纳 push 进 state 对应数组 + emit change 保存）。
- adoptAll(kind)/discardAll(kind)：批量循环采纳/清空。
- 三 Tab 内嵌 DraftReview，绑对应 draft 与回调。

## 四、错误处理 / 兼容

- adopt 携带富字段（story/highlight、insight/isHighlight、summary/theme）不变。
- 去重逻辑 mergeDraft 不变。
- collected 结构、后端 API、成果卡消费端全不变。

## 五、测试

- DraftReview：按 kind 渲染正确字段；adopt/discard/adopt-all/discard-all 事件正确 emit。
- StageTrack：merge 后 draft 进对应 Tab；adopt 后项从 draft 移除并入 state；角标计数正确。
- 回归：现有 stageTrack/trackExtract/trackMedia 测试按状态搬迁更新，material 数据流不破。

## 六、不做（YAGNI）

- 待审项拖拽排序、跨类改判。
- 自然语言"管理已上传材料"能力（另议）。
