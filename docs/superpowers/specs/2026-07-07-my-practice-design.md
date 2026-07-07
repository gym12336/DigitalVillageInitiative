# 「我的实践」子目录设计文档

- 日期：2026-07-07
- 落地：现有「乡村实践」栏目下新增子目录「我的实践」
- 定位：把设计文档《数乡计划》「三、我们要做什么」的三阶段 AI 实践智能体落成一个可演示的前端工作台
- 关联：[数乡计划内容规划](../../../设计文档.md)、[成果可视化生成工具设计](../../../2026-07-06-practice-result-visualizer-design.md)

---

## 1. 目标与范围

在「乡村实践」栏目下新增子目录「我的实践」，用一份贯穿始终的**实践档案**把一次实践的三个阶段串成一条线：

- **实践前（帮策划）**：队员说 idea → 检索全站已有资源给建议 → 生成实践方案初稿。
- **实践中（督进度）**：登记实地采集的指标与材料 → 对照方案分析缺口、提醒补齐。
- **实践后（出成果）**：从档案里的结构化数据生成可视化成果卡；提供进入独立「成果搭建台」的入口。

### 本期边界（明确的取舍）

- **纯前端 Demo**：不建后端。AI 应答（检索、方案生成、缺口分析）走**规则版纯函数**，为将来接真实 LLM API 预留同样的返回契约，日后只需替换函数实现。
- **数据持久化**：实践档案存 localStorage，跨刷新、跨重开浏览器保留。
- **上传处理**：只登记材料元数据（名称/类型/备注）与手填指标，不存文件实体，避免撑爆 localStorage。
- **出成果做轻量版**：本期用手填指标生成几张前端可视化成果卡（帮扶前后对比、KPI 卡组、足迹时间线、人物墙）。深度的「意图 → Spec 编译器 + 渲染引擎」是[独立项目](../../../2026-07-06-practice-result-visualizer-design.md)，本期只放一个「进入成果搭建台 DIY」占位入口指向它，不在本次实现。
- **检索来源**：覆盖乡村百科（villages）、实践成果（practice）、乡村之声需求（voice）、实践攻略模板（guide）四类站内静态数据。

### 成功标准

- 导航「乡村实践」悬浮弹出「我的实践」子目录，路由 `/practice/mine` 可达。
- 能新建实践档案，走完「说 idea → 采纳检索卡片 → 生成方案 → 登记指标/材料 → 看缺口 → 生成成果卡」完整闭环。
- 刷新后档案仍在。
- 四个核心纯函数有 Vitest 单测，现有测试基线不回归。

---

## 2. 整体架构

在 `practice` 模块下新增 `mine/` 子目录。视图组件只管展示与交互，核心逻辑抽成纯函数，符合项目「设计先行 + 测试驱动 + 核心逻辑人工可讲解」的既有规范。

```
src/modules/practice/mine/
├── MyPracticeView.vue      # 工作台外壳：步骤条(实践前→中→后) + 档案切换/新建
├── StagePlan.vue           # 实践前：说 idea → 检索卡片 → 生成方案初稿
├── StageTrack.vue          # 实践中：登记材料/指标 → 对照方案查缺
├── StageResult.vue         # 实践后：档案 → 生成可视化成果卡 + 搭建台入口
├── dossier.js              # ★实践档案模型 + localStorage 读写（纯函数，可测）
├── retrieval.js            # ★懂平台检索：跨 4 栏目搜索，返回可跳转卡片（纯函数，可测）
├── planGen.js              # 规则版方案初稿生成（纯函数，可测）
└── gapAnalysis.js          # 对照方案分析缺口（纯函数，可测）
```

路由挂在 `src/modules/practice/routes.js`，新增 `/practice/mine`。导航子菜单在 `src/modules.config.js` 给 `practice` 栏目补 `children`（`SiteHeader.vue` 已支持悬浮子菜单，无需改组件）。

### 单元边界

- `dossier.js`：档案的读、写、增、删、更新阶段；对 localStorage 的唯一入口。视图不直接碰 localStorage。
- `retrieval.js`：输入 idea 字符串 + 站内数据源，输出统一卡片数组。不依赖 Vue、不依赖 DOM。
- `planGen.js`：输入 idea + 检索命中，输出方案初稿对象。
- `gapAnalysis.js`：输入档案，输出缺口提醒清单。
- 三个视图组件各自负责一个阶段的 UI，通过 props/emit 与外壳交换当前档案。

---

## 3. 数据模型（实践档案 dossier）

一份档案 = 贯穿三阶段的一条主线。所有档案存 localStorage，key 为 `sx.mine.dossiers`（数组）。

```js
{
  id,                                // 唯一 id（时间戳 + 随机后缀）
  title,                             // 档案标题（默认由 idea 摘要生成，可改）
  village, province,                 // 目标村庄 / 省份
  idea,                              // 队员最初输入的 idea 原文
  plan: {                            // 阶段一产出，可继续编辑
    goal,                            // 目标
    topic,                           // 选题
    targetVillage,                   // 目标村
    metrics: [{ name, unit }],       // 计划采集的指标
    expected                         // 预期成果
  },
  refs: [                            // 检索到并「采纳」的全站资源（可跳转）
    { source, id, title, sub, path }
  ],
  collected: {                       // 阶段二登记
    metricValues: [{ name, before, after, unit }],  // 手填前后指标
    materials: [{ type, name, note }],               // 材料元数据，不存文件实体
    people: [{ name, role, quote }]                  // 人物访谈记录
  },
  stage,                             // 'plan' | 'track' | 'result'，记录进度
  createdAt, updatedAt
}
```

`source` 取值：`'village' | 'result' | 'demand' | 'guide'`，对应四个检索来源。

---

## 4. 检索逻辑（retrieval.js）

规则版实现，为将来接真实 LLM 预留同样的输入输出契约。

**输入**：`idea` 字符串、四个数据源（villages、practice.results、voice.demands、guide）。
**输出**：统一卡片数组 `{ source, id, title, sub, path, score }`，按 score 降序，各来源取 top N。

**匹配策略**：

- 对 idea 做分词/关键词提取（简单按标点与空白切分 + 去停用词）。
- 对每个数据源逐条打分：标题/摘要命中关键词加分；类型或标签命中加分（如 idea 含「竹编/文化」→ 命中 villages 的 `tags.文化类`、practice 的 `type=文化挖掘`、voice 的 `type=文化挖掘`）；村庄名精确命中额外加分。
- `path` 指向对应详情页：village → `/villages/:id`，result → `/practice`（成果详情下期），demand → `/voice`，guide → `/guide`。

**联动示例**：idea「去陈家铺村帮村民把竹编卖出去」会同时命中 villages 的陈家铺村档案、practice 的竹编调研成果、voice 的竹编品牌设计需求——三处联动正是「懂平台」的直观体现。

无命中时返回空数组，视图提示「站内没有相关资源，可联网搜索补充」（占位）。

---

## 5. 三阶段交互

### 实践前（StagePlan.vue）

1. 输入框写 idea。
2. 点「检索平台资源」→ 调 `retrieval.js` → 弹相关卡片（相似村庄档案、往届类似成果、乐镇真实需求、可用调研模板）。卡片可点击跳转对应详情页。
3. 每张卡有「采纳」按钮，采纳的卡进档案 `refs`。
4. 点「生成方案初稿」→ `planGen.js` 依据 idea + 检索命中的类型，产出目标村 / 选题 / 建议指标 / 预期成果，写入 `plan`。
5. 方案各字段可继续手动编辑，随时保存回档案。

### 实践中（StageTrack.vue）

1. 展示 `plan.metrics` 作为「计划采集的指标」核对表。
2. 手填指标前后值（`collected.metricValues`）、登记材料清单（名称/类型/备注，`collected.materials`）、录人物访谈（`collected.people`）。
3. `gapAnalysis.js` 对照方案实时算「还缺什么」：
   - 计划指标里 before/after 未填全的；
   - 材料数量偏少（低于阈值提醒）；
   - 人物访谈数量建议（如少于 2 位提示补充）。
4. 缺口以清单 + 提醒文案呈现，参照设计文档举例风格。

### 实践后（StageResult.vue）

1. 读档案结构化数据，AI 打底生成可视化成果卡：
   - **帮扶前后对比**：用 `metricValues` 的 before/after 渲染对比条 + 涨跌标注；
   - **KPI 卡组**：关键指标数字卡；
   - **足迹时间线**：由材料/事件按登记顺序串成；
   - **人物故事墙**：由 `collected.people` 生成卡片墙。
2. 成果卡用纯前端组件渲染（复用全站暖绿主题与现有卡片样式，视需要引 ECharts）。
3. 下方「进入成果搭建台 DIY」入口，指向[独立可视化项目](../../../2026-07-06-practice-result-visualizer-design.md)，本期为占位（toast 或占位页说明）。

---

## 6. 错误处理与空态

- **localStorage 读写**：`dossier.js` 包 try/catch，读到损坏 JSON 时降级为空数组并不抛错，保证不白屏。
- **无档案**：工作台引导「新建实践」。
- **检索无命中**：提示「站内没有相关资源，可联网搜索补充」（联网为占位）。
- **方案未生成就进阶段二/三**：阶段间不强制阻断，但缺数据的成果卡显示空态提示「先在实践前/中补充数据」。
- **写操作**：所有对档案的修改统一经 `dossier.js`，写后即持久化，避免多处直接操作 localStorage 造成状态不一致。

---

## 7. 测试

沿用现有 `src/__tests__` Vitest 基线，新增核心纯函数单测，现有测试不回归：

- `retrieval.js`：给定 idea（含「竹编/文化」关键词）断言命中来源含 village/result/demand；给定无关 idea 断言空或低分；断言村庄名精确命中排序靠前。
- `planGen.js`：给定 idea + 检索命中，断言产出 `plan` 的关键字段（targetVillage、metrics 非空、expected 存在）。
- `gapAnalysis.js`：构造缺指标/缺材料/缺人物的档案，断言各自产出对应缺口条目；构造完整档案断言无缺口。
- `dossier.js`：读写往返一致；损坏数据降级为空；增删改阶段流转正确。

LLM 相关本期不涉及真实调用，无需 mock API。

---

## 8. 落地步骤（供实现计划参考）

1. `dossier.js` + 单测（档案模型与持久化先行）。
2. `retrieval.js` + 单测（检索契约）。
3. `planGen.js`、`gapAnalysis.js` + 单测。
4. `MyPracticeView.vue` 外壳 + 路由 + 导航 children。
5. `StagePlan.vue` / `StageTrack.vue` / `StageResult.vue` 三阶段视图。
6. 成果卡可视化组件（视需要引 ECharts）。
7. 全量跑测 + 手动走完整闭环验证。
