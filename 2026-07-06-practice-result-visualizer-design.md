# 数乡计划 · AI 意图驱动的乡村实践成果可视化生成工具 设计文档

- 日期:2026-07-06
- 状态:草案,待 Day 1 选题终审。目标评级:竞赛/高难度创新级
- 用途:2026 暑期实训自主命题项目 + 软件创新大赛
- 关联:延续 [数乡平台设计](2026-07-02-shuxiang-platform-design.md)、[后端化设计](2026-07-03-shuxiang-backend-design.md)、[AI 融合方向](2026-07-05-shuxiang-ai-topic-design.md);落地于现有「乡村实践」栏目

---

## 1. 定位、用户与创新落点

### 一句话定位

> 给三下乡实践队用的 **AI 意图驱动的成果可视化生成工具**:队员上传采集回来的材料 + 用自然语言说"我想突出什么",AI 不套模板,而是**现场编排一套「可视化组合语法(Spec)」**,由手写渲染引擎落地成可展示、可 DIY 微调的成果页。

### 用户角色 → 需求 → 痛点

| 角色 | 需求 | 痛点 |
|------|------|------|
| 实践队(生产者) | 把零散材料变成能展示的成果 | 纯模板千队一面 / 专业设计工具太难,中间没工具 |
| 村庄/村干部(受益者) | 让"这支队带来的改变"被看见、留得下 | 成效说不清、留不下 |
| 后续队 + 评审方(消费者) | 承接、对比、验证成效 | 成果散在各队 PPT,无法沉淀 |

**真痛点一句话**:三下乡"重形式轻沉淀"——每年海量团队下乡,产出的成果展示要么套死模板千队一面,要么做不出来。

### 创新落点:应用创新,用技术深度支撑

- **应用创新(差异化功能)**:意图驱动的**生成式可视化**——AI 按队伍的具体数据和意图,把可视化**原子零件**(图表类型 / 坐标轴 / 数据映射 / 标注 / 对比基线 / 配色 / 叙事块 / 布局槽)现拼成模板库里不存在的新形态。市面上针对三下乡成果的这种工具没有对标。
- **技术深度(禁飞区脊梁)**:基于 **Grammar of Graphics(图形语法,Vega-Lite / ggplot 思想)**,手写两个核心——「自然语言意图 → 可视化 Spec 编译器」和「Spec → 渲染引擎」。二者可单测、可逐行讲、效果可衡量。

### 守住的边界(否则滑向不可控)

AI 的组合发生在**手写的语法 Schema 内**——哪些零件、怎么拼由 Schema 约束,AI 只在这个受限语法空间自由组合。它**不吐可执行代码**(那会崩、有注入风险、且没法做禁飞区),只吐结构化 Spec。**"约束下的自由组合"**:比选择题丰富,比生成代码可控。

---

## 2. 两阶段拆分

老师要求分两步:第一阶段按实训 PPT 打底,第二阶段按评审意见选点做深。

### 第一阶段(实训,12 天)—— 能跑通的最小闭环

> 材料上传 → AI 抽取结构化成果 → **AI 生成可视化 Spec(约束语法内的组合)** → 手写引擎渲染成页 → 队员 DIY 微调 → 存库展示。

满足实训全部硬要求:AI 深度嵌入核心业务(非外挂问答)、有可手写讲解的禁飞区、有可视化产出。**Spec 编译器 + 渲染引擎**是脊梁。

### 第二阶段(比赛冲顶,预留)—— 沿评审意见做深

语法层稳定后,升级到 **Generative UI**:AI 直接生成可执行的可视化组件(不再局限于预设零件),把"约束组合"推向"自由生成",作为答辩技术纵深亮点。这是**演进**不是重写——第一阶段的 Spec 就是它的中间表示。

---

## 3. 整体架构

落在现有「乡村实践」栏目下:

```
DigitalVillageInitiative/
├── src/modules/practice/
│   ├── ResultStudioView.vue     # 成果搭建台(上传→意图输入→DIY微调)
│   ├── ResultView.vue           # 成果展示页(渲染引擎输出)
│   ├── vizgrammar/              # ★可视化语法(前端渲染引擎)
│   │   ├── schema.js            #   语法 Schema 定义:有哪些原子零件、怎么拼
│   │   ├── renderer.js          # ★禁飞区②:Spec → ECharts 配置的渲染引擎
│   │   └── validate.js          #   Spec 结构校验(防 AI 输出污染)
│   └── result-charts.js         # 图表数据组装纯函数(可单测)
├── server/
│   ├── ai/
│   │   ├── extract.js           # 材料 → 结构化成果(LLM 编排)
│   │   ├── compile.js           # ★禁飞区①:自然语言意图 → 可视化 Spec 编译器
│   │   └── narrate.js           # AIGC 叙事文案生成
│   ├── parse/                   # Word/PDF/Excel 解析 → 文本+表格
│   ├── routes/result.js         # 成果接口
│   └── middleware/auth.js       # ★禁飞区③:JWT 鉴权
└── .agent/                      # conventions.md + architecture.md + decisions.md
```

### 三个禁飞区(手写、逐行讲)

1. `server/ai/compile.js` — **意图 → Spec 编译器**:把自然语言 + 数据映射成受约束的语法组合,核心创新算法。
2. `src/modules/practice/vizgrammar/renderer.js` — **Spec → 渲染引擎**:把语法 Spec 落成实际图表,与 compile 配对的另一半。
3. `server/middleware/auth.js` — JWT 鉴权。

**关键点**:`schema.js` 定义的语法空间同时约束 compile 的输出和 renderer 的输入——AI 只能在这个 Schema 内组合,保证可控可测,也是 compile / renderer 解耦的接口。

---

## 4. 数据流 + 可视化语法 Spec

### 端到端数据流

```
① 上传        队员传材料(调研报告 Word/PDF + 数据表 Excel/CSV + 活动照片)
     ↓        parse/ 解析成纯文本 + 表格
② 抽取        extract.js 调 LLM,把文本/表格抽成【结构化成果数据】
     ↓        → metrics(指标)/ before_after(前后值)/ timeline / people / photos
③ 意图        队员用自然语言说想法:"突出帮扶后收入翻倍,配张前后对比"
     ↓        (或不说,走 AI 默认编排)
④ 编译 ★      compile.js:意图 + 结构化数据 + schema → 生成【可视化 Spec】
     ↓        AI 只在 schema 允许的原子零件里组合
⑤ 校验        validate.js:Spec 结构是否合法(防 AI 输出污染)
     ↓
⑥ 渲染 ★      renderer.js:Spec → ECharts 配置 + 布局 → 落成实际页面
     ↓
⑦ DIY         队员在页面上拖拽/换轴/改文案 → 直接改 Spec → 重渲染(人在回路)
     ↓
⑧ 存库/展示   Spec + 结构化数据存库,ResultView 渲染
```

### 核心契约:可视化 Spec(compile 输出 / renderer 输入)

Spec 不是"模板 ID",是一棵**用原子零件拼出来的组合树**:

```json
{
  "layout": { "type": "grid", "slots": ["hero", "body-left", "body-right"] },
  "blocks": [
    {
      "slot": "hero",
      "kind": "chart",
      "mark": "dumbbell",
      "encoding": {
        "y": { "field": "指标名", "from": "before_after" },
        "x1": { "field": "前值" }, "x2": { "field": "后值" }
      },
      "annotations": [
        { "at": "收入", "text": "翻倍", "emphasis": true }
      ],
      "palette": "earth-green"
    },
    {
      "slot": "body-left",
      "kind": "narrative",
      "source": "narrate",
      "prompt_hint": "强调帮扶前后收入变化"
    }
  ]
}
```

### 为什么这个契约是设计的关键

- `schema.js` 定义**合法的 mark / encoding / annotation / layout 取值集合**——这是"约束下的自由组合"里的**约束边界**。
- `compile.js`(禁飞区①)= 把自然语言意图和数据**编译**成一棵符合 schema 的 Spec 树。NL→结构化的核心算法,可单测(给定意图+数据,断言输出 Spec 的关键字段;断言输出必过 schema 校验)。
- `renderer.js`(禁飞区②)= 遍历 Spec 树,把每个原子零件翻译成 ECharts 配置和布局。**纯函数、可单测**(给定 Spec,断言输出的 ECharts option 结构)。
- 二者靠 schema 解耦:改 compile 不影响 renderer,只要都守着 schema。**DIY 微调本质就是直接编辑这棵 Spec 树。**

### 第二阶段升级路径

Spec 树就是通往 Generative UI 的中间表示——阶段二让 AI 生成的不再局限于 schema 内的 mark,而是能吐出新的渲染单元,Spec 结构不变,renderer 扩展成能装载生成组件。演进平滑。

---

## 5. 数据模型

### practice_results 表(在后端化设计基础上增补)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| village / school / team | TEXT | 村庄 / 高校 / 团队 |
| structured | TEXT | AI 抽取的结构化成果 JSON(metrics/before_after/timeline/people/photos) |
| viz_spec | TEXT | 可视化 Spec JSON(compile 产出,DIY 后覆盖) |
| narrative | TEXT | AIGC 叙事文案 JSON |
| status | TEXT | `draft`/`reviewed`/`published` |
| created_by / created_at | - | 审计字段 |

原始材料存 `server/uploads/`,表里只存相对路径。核心新意在 `viz_spec` 一列——它就是可 DIY 的那棵组合树。

---

## 6. API 接口

统一错误格式 `{ error }` + HTTP 状态码。

- `POST /api/result/upload` — 上传材料(multipart:文档 + 照片)。需登录。
- `POST /api/result/:id/extract` — 触发解析 + AI 抽取,返回结构化成果。需登录。
- `POST /api/result/:id/compile` — 传入自然语言意图,返回可视化 Spec(禁飞区①产出)。需登录。
- `PUT /api/result/:id/spec` — 保存 DIY 微调后的 Spec。需登录。
- `POST /api/result/:id/narrate` — 生成/重写叙事文案。需登录。
- `GET /api/result/:id` — 读取成果(Spec + 数据,供渲染)。公开。

---

## 7. 对齐实训硬性要求

### AI 禁飞区(3 个手写核心,验收逐行讲解)

1. **意图 → Spec 编译器**(`server/ai/compile.js`):自然语言意图 + 结构化数据 → 符合 schema 的可视化 Spec 组合。
2. **Spec → 渲染引擎**(`src/modules/practice/vizgrammar/renderer.js`):遍历 Spec 树,翻译成 ECharts 配置与布局,纯函数。
3. **认证授权模块**(`server/middleware/auth.js`):JWT 签发校验。

### 5 项必须人工产出(设计先行)

架构设计(第 3 节)/ 接口设计(第 6 节)/ 数据模型(第 5 节)/ 测试用例(第 8 节)/ 部署方案(后端化设计第 8 节)。

### .agent 项目记忆

`.agent/` 维护 conventions.md + architecture.md + decisions.md。

### AI 使用日志

每 Sprint 末提交 AI 使用反思(哪段 AI 生成、如何审查修正、发现的问题)。

---

## 8. 测试

现有 Vitest 基线不回归。禁飞区可单测是本设计的最大优点:

- `compile.js`:给定意图 + 结构化数据,断言输出 Spec 的 mark/encoding 关键字段;断言输出必过 schema 校验。LLM 调用 mock,不耗真实额度。
- `renderer.js`:纯函数,给定 Spec 断言输出的 ECharts option 结构。
- `validate.js`:合法 / 非法 Spec 的边界用例。
- 纯函数:文档分块、图表数据组装(`result-charts.js`)抽出单测。
- 前端:上传 / DIY 微调 / 渲染用 mock fetch 单测。

---

## 9. 12 天 3 Sprint 排期

- **Day 1-3**:选题终审 + 架构/接口/数据模型/schema 定稿 + Git/DevOps。
- **Sprint 1(Day 4-6)**:上传 + 文档解析 + AI 结构化抽取跑通。
- **Sprint 2(Day 7-9)**:schema + compile 编译器 + renderer 渲染引擎(禁飞区双核,第一阶段脊梁)。
- **Sprint 3(Day 10-11)**:DIY 微调交互 + AIGC 叙事 + 打磨 + 代码走查。
- **Day 12**:项目演示 + 现场测试 + 答辩。
- **第二阶段(比赛,预留)**:Generative UI 升级,独立周期。

---

## 10. 安全说明

- LLM API Key、JWT 密钥经环境变量注入,不入库不进仓库。
- 上传接口限文件类型与大小、需登录。
- 上传文档内容喂给 LLM 前做长度限制。
- **AI 只吐 Spec 不吐可执行代码**;Spec 经 `validate.js` 结构校验,防注入与格式污染——这既是安全设计,也是"约束下自由组合"的技术保证。
- 密码 bcrypt 哈希,写接口全经 JWT 鉴权。
