# 实践中（督进度）阶段升级 · AI 采集工作台设计文档

- 日期：2026-07-10
- 状态：草案，待用户审校
- 用途：数乡计划「我的实践」三阶段工作台中「实践中·督进度」阶段的功能完善
- 关联：延续 [AI 选题设计](2026-07-05-shuxiang-ai-topic-design.md) 方向一（素材采集→结构化管线）、[实践页 phase1](2026-07-05-practice-page-phase1-design.md)

---

## 0. 一句话定位

把「实践中」从四张静态录入表单，升级为 **AI 采集工作台**：队员上传实践材料（照片/音视频存储，文本档 AI 解析），AI 从文本里结构化提取人物、指标、材料要点，队员审校后回填档案；同时用一个四维进度看板真正做到「督进度」。

这条线直接落地实训方向一的「素材采集→结构化词条」管线，可作为 AI 禁飞区手写讲解。

## 1. 背景与现状

「我的实践」工作台按 `实践前(plan) → 实践中(track) → 实践后(result)` 三阶段推进，每阶段一个组件。当前 `实践中`（[StageTrack.vue](../../../DigitalVillageInitiative/src/modules/practice/mine/StageTrack.vue)）由四块纯手动表单构成：

1. 本阶段任务勾选（读 `plan.phases` 里 `stage:'track'` 的任务，勾选回写）。
2. 指标采集（对照 `plan.metrics`，填帮扶前/后值）。
3. 材料清单（仅登记元数据：类型/名称/备注，**不上传文件**）。
4. 人物访谈（姓名/身份/一句话）。

外加一个基于静态阈值的「还缺什么」gap 分析（[gapAnalysis.js](../../../DigitalVillageInitiative/src/modules/practice/mine/gapAnalysis.js)）。

**问题：** 全是被动手工录入，没有「督进度」的智能，且项目核心的 AI 采集管线（方向一）在此完全缺席——材料只有元数据，没有上传、没有解析、没有结构化提取。这正是「功能点不够清晰、没有具体实现」的根因。

**可复用的现成基础：**
- 文本 AI 管线 [aiContentService.js](../../../DigitalVillageInitiative/server/services/aiContentService.js)：`chatJSON` 调 DeepSeek，令牌桶限流、超时控制、`source:auto`+confidence 标记、逐字段人工/自动来源判定。
- 前端「AI 主路径 + 离线兜底」模式 [planGen.js](../../../DigitalVillageInitiative/src/modules/practice/mine/planGen.js)：主调后端，网络/后端不可用时用本地模板，保证永远拿到结构合法结果。
- 档案读写通路 [dossier.js](../../../DigitalVillageInitiative/src/modules/practice/mine/dossier.js) + [dossiers.js](../../../DigitalVillageInitiative/server/routes/dossiers.js)：`collected` 随 dossier `content` JSON 全量落库。

**明确不做（本版范围外）：** 音视频转写（依赖尚不存在的转写 API，成本/不确定性最高，排除）。

## 2. 目标与非目标

**目标：**
- 三条能力线：进度看板（纯前端）、多类型文件上传（后端新增 upload 基建）、AI 结构化回填（复用 DeepSeek 文本管线）。
- 零数据库 schema 迁移：材料项增一个可选 `url` 字段，其余走现有 `collected` JSON 通路。
- 全链路可降级：上传失败/解析失败/AI 不可用，逐层兜底，永不阻塞录入。
- 现有测试基线不回归。

**非目标：**
- 音视频转写（下期）。
- 图片内容识别 / OCR（下期）。
- 联网检索补充（另一功能）。

## 3. 架构与模块划分

### 3.1 前端（`src/modules/practice/mine/`）

`StageTrack.vue` 拆薄为编排壳，三个单一职责子组件：

- **`TrackProgress.vue`** — 四维完成度看板（任务/指标/材料/人物）+ 动态 gap 预警。输入 `dossier`，输出展示，无副作用。
- **`TrackMedia.vue`** — 文件上传 + 材料清单。上传经 `mediaApi.js`，成功后把材料项（带 `url`）并入 `collected.materials`，emit 保存。
- **`TrackExtract.vue`** — AI 提取审校区。粘贴文字或选「已上传的文本档」→ 调 `extract.js` → 渲染「待审校卡片」（人物/指标/材料要点，各带 confidence）→ 采纳/编辑/丢弃 → 采纳项 merge 进 `collected`。

保留的直接编辑表单（指标前后值、人物、材料备注）仍在，AI 只是「预填 + 待审校」，不取代手动编辑。

新增前端模块：
- **`mine/extract.js`** — 提取管线调用 + 离线兜底（仿 `planGen.js`）。`export async function extractFromText(text) → { people, metrics, materialHints }`。主调后端；失败走本地正则/分句极简提取，标 `source:'template'`。
- **`mine/mediaApi.js`** — 上传封装。`uploadMedia(dossierId, file) → { url, name, size, ext, kind }`；`extractUploadedDoc(dossierId, fileRef) → 抽出的文本`。

### 3.2 后端（`server/`）

- **`routes/media.js`** — `POST /api/practice/media`（multipart，需登录，扩展名白名单，**按类型分档限制大小**，见下）；文本档解析 `POST /api/practice/media/extract-text`（body 带已上传文件引用，返回抽出的纯文本）。静态托管 `uploads/practice/`。
- **`services/mediaService.js`** — 存文件到 `uploads/practice/<dossierId>/`，返回元数据 `{ url, name, size, ext, kind }`。`kind` ∈ `image`/`av`/`doc`/`table`/`other`。校验归属（该 dossier 所属队成员才能传）。

  **按类型分档大小限制：** multer 用 `diskStorage`（落盘，不进内存，避免大文件爆内存），`limits.fileSize` 设为最大档（200MB）放行，落盘后在 service 层按 `kind` 二次校验超限并拒绝（超限则删除已落盘文件 + 返回 413）。分档上限：

  | kind | 上限 | 说明 |
  |---|---|---|
  | 音视频（av） | 200MB | 短纪录片/访谈录像够用 |
  | 图片（image） | 20MB | 单张照片绰绰有余 |
  | 文本档（doc/table） | 10MB | docx/pdf/表格，喂 LLM 前还会截断 |
  | 其他（other） | 20MB | 杂项兜底 |

  注：200MB 音视频对国内轻量云服务器的带宽/上传耗时是真实压力（演示时大视频上传耗时长、占连接）。分档上限保证文本/图片档不被误放行到几百 MB；音视频档如实训演示不强求真上传，可在部署时调低该档上限。
- **`lib/fileText.js`** — 按扩展名分派抽文本：`txt/md` 直读、`docx`→mammoth、`pdf`→pdf-parse、`csv`→papaparse、`xlsx`→sheetjs。返回 `{ text, truncated }`，超长按字数上限截断（喂 LLM 前控制 token）。
- **`services/practiceExtractService.js`** — 仿 `aiContentService.js`：`chatJSON(EXTRACT_SYSTEM, text)` → `{ people:[{name,role,quote,confidence}], metrics:[{name,value,unit,confidence}], materialHints:[{name,note,confidence}] }`，每项标 `source:'auto'`。经令牌桶限流、超时 30s。
- **`services/prompts/`** 下新增 `EXTRACT_SYSTEM` + `buildExtractUserPrompt`。

### 3.3 依赖新增

- 后端：`multer`（multipart 上传）、`mammoth`（docx）、`pdf-parse`（pdf）、`papaparse`（csv）、`xlsx`/sheetjs（xlsx）。均为成熟稳定库，锁定版本。

## 4. 文件分档

**A 档 · 存储即可（不解析内容）：** 照片（jpg/png/webp/gif）、视频、音频、及其他杂项。上传存 `uploads/`，材料清单显示缩略图/文件卡，仅登记元数据。无 AI。

**B 档 · 可抽文字 → 喂 AI 提取：** `txt / md / docx / pdf / csv / xlsx`。上传后经 `lib/fileText.js` 抽纯文本 → `practiceExtractService` 结构化提取 → 队员审校采纳。表格类（csv/xlsx）抽出的文本带列头，提取指标更准。

粘贴文字入口在 `TrackExtract` 始终保留，作为最稳的兜底与离线测试路径。

## 5. 数据流

### 5.1 AI 提取（文本 → 结构化）

```
队员在 TrackExtract 粘贴文字，或选「已上传文本档」
  → （文本档情形）POST /api/practice/media/extract-text → 后端 fileText 抽文本
  → extractFromText(text) → POST /api/practice/extract { text }
  → practiceExtractService: chatJSON(EXTRACT_SYSTEM, text)
  → { people[], metrics[], materialHints[] }（各带 confidence, source:auto）
  → 前端渲染「待审校卡片」，每张可编辑/采纳/丢弃
  → 采纳 → merge 进 state.people / state.metricValues / state.materials
  → 保存 → emit('update', { collected }) → PUT /api/dossiers/:id（现有通路）
```

无 key/网络断/超时 → `extract.js` 本地兜底（正则分句极简提取），`source:'template'`，保证离线可测可演示。

### 5.2 文件上传

```
TrackMedia 选文件 → POST /api/practice/media (multipart, 限类型/大小/需登录)
  → mediaService 存 uploads/practice/<dossierId>/ + 返回 { url, name, size, ext, kind }
  → 前端 push { type, name, url, kind } 进 state.materials
  → 保存走现有 collected 通路
```

## 6. 数据模型

**不改数据库表结构。**

- `collected.materials` 每项**增一个可选 `url` 字段**（现有纯元数据项 `url` 缺省，向后兼容）；再增可选 `kind`（用于前端区分缩略图/文件卡）。
- `collected` 整体仍随 dossier 落库（现有 `PUT /api/dossiers/:id` 全量更新）。
- AI 提取结果**不单独入库**——审校采纳后才并进 `collected`，未采纳的丢弃。零 schema 迁移。

`normalizeDossier`（dossier.js）对旧档案的 `materials` 项无 `url`/`kind` 时按 undefined 处理，视图按可选渲染，不崩。

## 7. 错误处理与降级（逐层兜底，永不阻塞）

- **上传**：类型不在白名单/超限 → 400 明确错误提示；成功但后续解析失败 → 文件仍存下、材料仍登记，只是无 AI 回填（退化为 A 档效果）。
- **抽文本**：某格式解析库抛错 → 该文件降级为「存储即可」，前端提示「这个文件没能自动解析，已作为材料保存」。
- **AI 提取**：无 key/网络断/超时 → 前端走离线兜底，`source:'template'`。
- **审校**：AI 结果一律进「待审校」区，**不自动写库**，队员采纳才 merge，避免 AI 幻觉直接污染档案。

## 8. 进度看板与动态 gap

`TrackProgress.vue` 展示四维完成度：
- **任务**：`plan.phases` 里 `track` 段任务的勾选完成率。
- **指标**：`plan.metrics` 中前后值都填齐的比例。
- **材料**：已登记材料数 / 建议阈值（现 `MATERIAL_MIN=3`）。
- **人物**：已记录人物数 / 建议阈值（现 `PEOPLE_MIN=2`）。

动态 gap 预警在现有 `gapAnalysis.js` 基础上增一条规则：**若档案有 `startDate/endDate` 且当前时间过半、但整体完成度不足 50%**，给 `warn` 级「时间过半、进度偏慢」提醒。其余规则（无方案、指标缺值、材料/人物偏少）沿用。

## 9. 测试策略

沿用 Vitest，LLM 与文件解析在测试里 mock，不消耗额度、不依赖真实文件。

- **纯函数单测**：`extract.js` 离线兜底提取；`fileText.js` 各格式分派（mock 解析库）；进度看板四维完成度计算；动态 gap（时段过半+进度不足）。
- **后端接口测**（supertest）：`/api/practice/media` 上传鉴权/类型校验/超限；`practiceExtractService` mock DeepSeek 校验输出形状 + `source:auto`/confidence。
- **组件测**：`TrackExtract` 采纳/丢弃卡片后 `collected` 正确 merge；`TrackMedia` 上传成功后材料带 `url`/`kind`。
- **不回归** 现有测试基线。

**AI 禁飞区候选**：`practiceExtractService` 提取编排 + `lib/fileText.js` 分派逻辑，手写、可逐行讲解。

## 10. 安全说明

- 上传接口需登录 + 校验 dossier 归属（该队成员才能传）；限扩展名白名单与按类型分档的大小上限（音视频 200MB / 图片 20MB / 文本档 10MB / 其他 20MB，见 §3.2）。
- 存储路径按 `dossierId` 分目录，文件名重铸（避免路径穿越/覆盖）。
- LLM API Key 经环境变量注入，不入库不进仓库。
- 提取接口对输入文本做长度上限约束，防超长与提示词注入滥用。
- 静态托管仅暴露 `uploads/practice/` 下文件，不暴露服务端其他路径。
