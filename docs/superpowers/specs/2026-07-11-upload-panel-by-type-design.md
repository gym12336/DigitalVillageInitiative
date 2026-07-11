# 上传区按类型分行 + AI 区职责分离 设计

- 日期：2026-07-11
- 栏目：乡村实践 · 我的实践 · 实践中（采集阶段）
- 关联：[[shuxiang-practice-track]]；上游 spec `2026-07-11-practice-track-layout-redesign-design.md`、`2026-07-11-zip-import-design.md`
- 性质：纯前端入口重排。materials 结构、后端 API、待审校区全不变。

## 一、问题

上传入口散在两个组件四处（TrackMedia 的「上传文件」+ 行内「选文件」，TrackExtract 的「传文本档」+「导入压缩包」），用户不知道支持哪些文件类型、该点哪里。AI 区又混着上传职责，混乱。

## 二、决策（用户拍板）

- 上传区：**按类型分行**（A 方案）。每类一行，写明支持格式 + 大小上限，点行弹对应类型选文件框。
- AI 区：改为**自然语言输入**为主，移除上传按钮。AI 对已上传内容的「按用户要求管理」、解析数据深度呈现 —— **本轮不做，留待之后详谈**。本轮只搭「自然语言输入 + 现有抽取」的壳。

## 三、上传区设计（新建 UploadPanel.vue）

```
┌─ 上传实践材料 ──────────────────────────┐
│ 📦 压缩包整包导入   .zip           ≤100MB │ → importZip：解压+归类+抽取
│ 📄 文档            pdf/word/txt/md ≤10MB  │ → extractAndStoreDoc：存盘+解析+抽取
│ 📊 表格            xlsx/csv        ≤10MB  │ → extractAndStoreDoc
│ 🖼 图片            jpg/png/webp/gif ≤20MB │ → uploadMedia：存盘归类
│ 🎬 音视频          mp4/mp3/mov/wav ≤200MB │ → uploadMedia
└──────────────────────────────────────────┘
行内状态：上传中… / 成功 ✓ / 错误提示
```

- 每行一个 `<label>` 包 `<input type="file" :accept>`（accept 限定该类扩展名），点行触发。
- 行内 `.file-input` 必须在有 `position:relative` 的行内（沿用已修 bug 的写法），不逃逸。
- 组件职责：接收 dossierId，按类型调对应 API，产出 material 对象 / 抽取草稿，emit 给父组件。
  - `emit('material', item)` 单文件（文档/表格/图片/音视频）→ 父组件 push 进 materials；文档/表格额外 `emit('drafts', r)`。
  - `emit('zip', result)` 压缩包 → 父组件分发 materials + drafts（复用 StageTrack 现有逻辑或转交 TrackExtract 的 mergeDraft）。
- props：`dossierId`。emits：`material` / `drafts` / `zip`（或统一 `emit('imported', {materials, drafts})` 简化父组件处理 —— 实现时选统一事件，减少父组件分支）。

## 四、AI 区（TrackExtract 瘦身）

- **移除**「📄 传文本档解析」「📦 导入压缩包」两个按钮及 onPickDoc/onPickZip（上传搬到 UploadPanel）。
- 保留：自然语言输入框 + 「AI 提取」+ 待审校区 + 「生成成果综述」。
- 输入框 placeholder 改为引导「用一句话描述你想让 AI 怎么整理已采集的材料……」，为后续「按用户要求管理」预留（本轮行为不变，仍走 extractFromText）。
- 抽取草稿合并逻辑 mergeDraft 保留 —— UploadPanel 导入的草稿通过父组件转交合并（提取 mergeDraft 为可复用，或父组件持有草稿态）。

## 五、组件协作

- **StageTrack 左栏** = UploadPanel（新）+ TrackExtract（瘦身）。
- UploadPanel 产出的 materials push 进 `state.materials`；drafts 需进 TrackExtract 的待审校区。
- 草稿归属决策：把「待审校 draft 态 + mergeDraft」的所有权仍留在 TrackExtract，UploadPanel 的 drafts 经 StageTrack 中转，用 ref/expose 或事件让 TrackExtract 合并。实现时优先：StageTrack 持有一个共享 draft 容器传给 TrackExtract，UploadPanel 结果也写入它 —— 但为控改动面，先用「UploadPanel emit → StageTrack 调 TrackExtract 暴露的 mergeExternal 方法」（defineExpose）。
- TrackMedia：上传职责移除后，仅保留「手动登记材料」+行内补传，或整体并入 UploadPanel 下方。本轮保留 TrackMedia 的手动登记，移除其顶部「上传文件」按钮（避免与 UploadPanel 重复）。

## 六、错误处理 / 兼容

- 各类型行独立 loading + 错误提示，互不影响。
- accept 只是提示性限制，后端仍按分档/类型校验兜底。
- materials 结构、后端 API 全不变；纯前端入口重排。

## 七、测试

- UploadPanel：渲染出全部类型行；各行 accept 正确；点击触发对应 API（mock mediaApi，断言 importZip/extractAndStoreDoc/uploadMedia 被正确调用）；emit 结果结构正确。
- 回归：现有 TrackMedia/TrackExtract/StageTrack 测试按改动更新，不破坏 material 数据流。

## 八、不做（YAGNI / 留待之后详谈）

- AI 对已上传内容的「按用户自然语言要求管理」逻辑。
- 解析数据的深度呈现 / 数据问题处理。
- 拖拽上传、上传进度条百分比。
