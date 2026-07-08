# 方案生成升级：LLM 分阶段任务方案（DeepSeek + 规则兜底）设计文档

- 日期：2026-07-08
- 落地：把「实践前」的方案生成从「模板填空」升级为「因地制宜的分阶段可执行方案」，主体接真实 LLM（DeepSeek），失败静默回落规则引擎
- 关联：[「实践前」自动检索 + 概要加权设计](./2026-07-06-practice-result-visualizer-design.md)、[「我的实践」后端与数据库设计](./2026-07-07-my-practice-backend-design.md)

---

## 0. 目标、范围与决策

### 现状与问题

现在方案生成由前端纯函数 `planGen.js` 的 `generatePlan(idea, refs)` 完成，简陋在：

1. **只有 4 个写死选题**（文化/产业/教育/生态）+ 1 个兜底，靠 `includes` 关键词匹配，任何不在四类里的 idea 都掉进「乡村综合调研」。
2. **指标是选题绑定的固定三条**，与具体 idea 无关——所有做产业的队拿到一样的「月销售额/合作农户数/上架商品数」。
3. **`goal` 是一句模板拼接**，句式永远相同。
4. **没真正用上采纳的资源**：`generatePlan` 收了 `refs` 却只把标题塞进关键词草堆，「乡村之声」的真实需求、往届成果内容都没进方案。
5. **缺「怎么做」**：只有 goal/topic/village/metrics/expected 五字段，没有阶段步骤、方法、排期、风险。

### 已确认的关键决策

1. **方案主体 = 分阶段任务清单**：对齐现有「实践前/实践中/实践后」三阶段工作台，每阶段列具体任务（做什么、产出什么），任务**可勾选打钩**。
2. **接真实 LLM（DeepSeek），规则版兜底**：后端代理调用 DeepSeek（OpenAI 兼容接口），密钥只在服务端；失败/无 key/坏输出时**静默回落**增强版规则引擎，前端提示一句「本次用了离线模板」。
3. **同步调用**：用户在「实践前」点「生成方案初稿」时同步请求，按钮进 loading 态等几秒。
4. **任务勾选只在实践中**：实践前生成/编辑任务但不勾；「实践中」页面只读渲染 `stage:'track'` 那组任务并打钩、显示进度，叠加在现有指标/材料收集之上。
5. **向后兼容（尽力而为）**：`plan` 旧五字段全保留，`StageResult` / `gapAnalysis` 不受影响；旧档案（无新字段）由 `normalizeDossier` 补空数组以尽量不崩，但**不作为硬约束**——若历史档案确实打不开，直接删除该旧档案即可（实训期数据无保留压力）。

### 本期范围

**做：**

- 后端 LLM 代理：`POST /api/plan/generate`（需登录），DeepSeek 封装 + 超时重试 + 静默回落。
- 后端规则兜底引擎（增强版，输出新 plan 结构），既是兜底也是 LLM 输出的参照。
- LLM 返回结构的 schema 校验（不合格即兜底）。
- 前端：`generatePlan` 改 async 调接口 + 前端轻量兜底；`StagePlan` 分区表单（含三阶段任务编辑）+ loading + 来源提示；`StageTrack` 任务勾选块 + 进度条。
- `normalizeDossier` 补新字段；`.env` 加 `DEEPSEEK_API_KEY`。
- 后端 service/lib 与前端数据层的 Vitest 单测；现有基线不回归。

**不做（明确排除）：**

- **任务联动指标/缺口分析**：任务不自动驱动 `gapAnalysis`，两者独立（YAGNI）。
- **任务的负责人/预计天数字段**：task 保持精简 `{ text, output, done }`，后续要加不破坏结构。
- **甘特排期表 / 时间线视图**：本期用分阶段清单，不做按天排期。
- **联网检索、成果搭建台 DIY**：延续原设计的非目标，不动。
- **流式输出**：同步一次性返回，不做 SSE 流式。

### 成功标准

- 配了 `DEEPSEEK_API_KEY` 时，点「生成方案初稿」几秒内拿到**因地制宜的分阶段任务** AI 方案；实践中能勾选 track 任务、看进度条。
- 没 key / 断网 / LLM 坏输出时，自动拿到规则版方案，界面提示「本次用了离线模板」，流程不中断。
- 旧档案（无 phases）尽量兼容打开；确实打不开的可直接删除，不作硬要求。
- 密钥与 DeepSeek 原始错误绝不透给前端。
- 全量 `vitest run` 不回归 + `vite build` 通过。

---

## 1. 数据结构：新 plan 形状

`plan` 在旧五字段基础上扩展，**旧字段全保留**（向后兼容 StageResult / gapAnalysis）：

```js
plan: {
  // —— 保留旧字段 ——
  goal: '',                       // 一句话目标
  topic: '',                      // 选题方向
  targetVillage: '',              // 目标村
  expected: '',                   // 预期成果
  metrics: [{ name: '', unit: '' }],

  // —— 新增 ——
  background: '',                 // 一句话背景/痛点（来自采纳的"乡村之声"需求）
  methods: ['半结构化访谈', '问卷调查'],   // 建议调研方法（字符串数组）
  risks: ['雨季道路受阻，备线上访谈'],     // 风险与预案（字符串数组）
  phases: [
    {
      stage: 'plan',              // 'plan' | 'track' | 'result'，对齐三阶段
      title: '实践前准备',
      tasks: [
        { text: '联系村委确认 3 位竹编手艺人', output: '受访名单', done: false },
      ],
    },
    { stage: 'track', title: '实践中执行', tasks: [/* ... */] },
    { stage: 'result', title: '实践后总结', tasks: [/* ... */] },
  ],

  source: 'ai',                   // 'ai' | 'template'，本次方案来源（前端提示用）
  generatedAt: '2026-07-08T...',  // 生成时间戳（ISO）
}
```

### 约束

- **`phases` 恒为三段**，`stage` 取值 `plan`/`track`/`result` 各一，顺序固定。校验时缺段则补空段。
- **`tasks` 是数组**，每条 `{ text, output, done }`；`text` 必填非空，`output` 可空，`done` 默认 `false`。
- **`methods` / `risks` 是字符串数组**，可空。
- **`source`**：LLM 成功且校验通过为 `'ai'`，其余（无 key/超时/坏 JSON/校验失败/后端不可达前端兜底）为 `'template'`。
- 旧档案无 `phases/methods/risks/background/source` → `normalizeDossier` 补空数组/空串，视图按空渲染，不崩。

---

## 2. 后端 LLM 代理

### 接口

```
POST /api/plan/generate          （需登录，挂 auth 中间件）
body:  { idea, refs?, village?, topic?, startDate?, endDate? }
返回:  { plan: { ...新结构... } }   // HTTP 恒 200（兜底也 200），plan.source 标来源
错误:  400 缺 idea；401 未登录
```

- **不带 teamId**：方案生成是纯计算，不落库、不涉及队权限；生成结果由前端并入档案后走既有 `PUT /api/dossiers/:id` 落库。

### 服务端组件（follow 现有 lib/ + services/ + routes/ 分层）

- **`server/lib/deepseek.js`（新）**：薄封装 DeepSeek OpenAI 兼容接口 `POST https://api.deepseek.com/chat/completions`。用 Node 内置 `fetch`；读 `process.env.DEEPSEEK_API_KEY`；`AbortController` 设 **20s 超时**；失败**一次重试**；请求 `response_format: { type: 'json_object' }` 强制 JSON。导出 `chatJSON({ system, user, signal }) → 解析后的对象`，无 key 时抛特定错误（由 service 捕获兜底）。
- **`server/lib/planTemplate.js`（新）**：增强版规则兜底。把现有前端 `planGen.js` 逻辑搬到后端并增强——选题库每类配「阶段任务模板 + 方法 + 风险」；按 idea 关键词命中生成 `phases` 三段任务；结合 `startDate/endDate` 在 background 里带上时段。输出完整新 plan 结构，`source: 'template'`。纯函数、可单测。
- **`server/lib/planSchema.js`（新）**：`validatePlanShape(obj) → { ok, plan }`。校验 LLM 返回：必备字段齐全、phases 三阶段、tasks 是数组且每条有非空 text。不合格返回 `ok:false`，由 service 兜底。做**规范化**（补 done 默认、去多余字段、phases 补齐三段）。
- **`server/services/planService.js`（新）**：编排。拼 prompt（idea + 采纳资源摘要 + village/topic/日期，**截断长度上限**防超长）→ 调 `deepseek.chatJSON` → `validatePlanShape` → 通过则 `source:'ai'` 返回；**任一步抛错/不合格 → 回落 `planTemplate`**（`source:'template'`）。核心无授权逻辑，是纯编排 + 一次外部调用。
- **`server/routes/plan.js`（新）**：HTTP 层，校验 body 有 idea（`validate.js` 加 `validatePlanRequest`），调 planService，返回 `{ plan }`。`app.js` 挂 `/api/plan`。

### Prompt 要点

- **system**：设定角色「大学生乡村实践方案规划助手」，要求输出**严格 JSON**，字段与 §1 结构一致，phases 必须三段对齐 plan/track/result，任务要具体可执行、贴合给定 idea 与目标村。
- **user**：idea 原文 + 采纳资源（refs 的 title/sub 摘要，尤其"乡村之声"真实需求）+ village/topic + 起止日期。长度截断（idea ≤ 500 字，refs 摘要总长 ≤ 1500 字）。
- **max_tokens** 设合理上限（如 2000），控制成本与延迟。

### 环境变量

- `.env` 加 `DEEPSEEK_API_KEY=`（空则 planService 直接走规则版，本地无需 key 也能跑）。
- `.env.example` 补一行注释说明。

---

## 3. 前端改造

### 数据层

- **`api.js`（改）**：加 `apiGeneratePlan(idea, refs, opts) → plan`，POST `/api/plan/generate`，body 带 `{ idea, refs, village, topic, startDate, endDate }`。
- **`planGen.js`（改）**：`generatePlan` 从同步纯函数改为 **async**，内部调 `apiGeneratePlan`。**保留前端轻量兜底** `localTemplatePlan(idea, refs)`：接口失败（网络断/后端挂）时本地跑精简规则版，返回 `source:'template'`，保证永远有结果。现有 TOPICS/pickTopic/pickTargetVillage 逻辑复用为本地兜底。
- **`dossier.js`（改）**：`normalizeDossier` 给缺失的 `phases`(空数组)、`methods`(空数组)、`risks`(空数组)、`background`(空串)、`source`(空串) 补默认，尽量兼容历史/迁移档案（尽力而为，非硬约束——打不开的旧档案可直接删）。

### 视图

- **`StagePlan.vue`（改，③ 方案初稿区）**：
  - 「生成方案初稿」按钮点击 → **loading 态**（文案「AI 生成中…」+ 禁用），await `generatePlan` 后填充。
  - 表单从 5 个输入框扩展为**分区**：目标/选题/目标村/背景 → 方法 chips（可增删）→ **三阶段任务清单**（每阶段可增删改任务的 text/output）→ 指标（现有）→ 风险 chips（可增删）。
  - 顶部来源提示：`plan.source === 'template'` 时显示「本次用了离线模板，可重新生成试 AI」。
  - 任务 `done` 在实践前**不勾**（留给实践中），此处只编辑内容。
- **`StageTrack.vue`（改，实践中）**：
  - 顶部新增「本阶段任务」块——渲染 `plan.phases` 里 `stage:'track'` 的任务，每条可勾选 `done`（checkbox），带**进度条**（如 3/5 完成）。勾选即 `emit('update', { plan })` 写回。
  - 现有指标登记、材料收集**不动**，任务块叠加在上方。
- **`StageResult.vue`**：不改（旧字段全在，成果卡照常）。

### 路由 / 其他

- 无路由改动；无新页面。

---

## 4. 测试策略（Vitest）

### 后端（内存库 / mock fetch，不打真实 API）

- **`planTemplate`**：各选题命中生成对应阶段任务；无命中回落默认选题；phases 恒三段、每段 tasks 非空；带日期时 background 含时段。
- **`planSchema`**：合法结构 `ok:true` 且规范化（补 done、补齐三段）；缺字段/phases 不足/tasks 非数组/task 缺 text → `ok:false`。
- **`planService`**：mock `deepseek.chatJSON` 返回合法 JSON → `source:'ai'` 透传；返回坏 JSON / 抛错（超时/限流）/ 无 key → 回落规则版 `source:'template'`；校验剔除不合格结构后兜底。
- **`routes/plan` supertest**：未登录 401；正常返回 plan 且结构合法；body 缺 idea → 400。

### 前端（mock fetch / mock api）

- **`planGen`（async）**：mock `apiGeneratePlan` 成功 → 透传 AI plan；失败（reject）→ 回落 `localTemplatePlan`，`source:'template'`。
- **`api.js`**：`apiGeneratePlan` 请求形状（路径 `/api/plan/generate`、method POST、body 含 idea/refs/village/topic/日期）。
- **`StagePlan`（轻量）**：loading 态渲染、来源提示按 `source` 显隐。
- **`StageTrack`（轻量）**：track 任务勾选 → 进度条数字变化 + emit update。

### 错误处理

- DeepSeek 超时(20s)/限流/坏 JSON/无 key → planService 静默回落，HTTP 仍 200 + `source:'template'`。
- 后端整个不可达 → 前端 `localTemplatePlan` 兜底。
- 密钥与 DeepSeek 原始错误**绝不透前端**（follow 现有 errorHandler，5xx 不泄露内部细节）。

---

## 5. 落地步骤（供实现计划参考）

**后端（兜底先行——它是 LLM 输出的参照）：**

1. `.env.example` + `.env`：加 `DEEPSEEK_API_KEY`（空走规则版）。
2. `server/lib/planTemplate.js`（新）：规则兜底，输出新 plan 结构 + 单测。
3. `server/lib/planSchema.js`（新）：校验 + 规范化 LLM 返回 + 单测。
4. `server/lib/deepseek.js`（新）：fetch 封装 + 20s 超时 + 一次重试 + json_object。
5. `server/services/planService.js`（新）：编排 + 静默回落 + 单测（mock fetch）。
6. `server/lib/validate.js`：加 `validatePlanRequest`（body 有 idea）。
7. `server/routes/plan.js`（新）+ `app.js` 挂 `/api/plan`；`server-routes` 加 plan 冒烟。

**前端：**

8. `api.js`：加 `apiGeneratePlan`。
9. `planGen.js`：改 async + `localTemplatePlan` 前端兜底 + 单测改造。
10. `dossier.js`：`normalizeDossier` 补新字段。
11. `StagePlan.vue`：loading + 分区表单（三阶段任务编辑）+ 来源提示。
12. `StageTrack.vue`：track 任务勾选块 + 进度条。
13. 相关组件/数据层单测。

**收尾：**

14. 全量 `vitest run` 不回归 + `vite build` 通过 + 手动走「填 idea → 生成方案（有 key 得 AI、断网得模板）→ 编辑任务 → 进实践中勾选看进度」闭环。
