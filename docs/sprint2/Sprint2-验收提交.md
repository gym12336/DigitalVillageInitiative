---

## 门禁 1 · 测试覆盖

### 1.1 总体结果

- 测试规模：**69 个测试文件、507 个测试用例，全部通过**。
- 运行命令：`npx vitest run`（Vitest 2.1.9 + jsdom 环境）。

覆盖率（`npx vitest run --coverage`，v8 provider）：

| 指标 | 覆盖率 | 计数 |
|---|---|---|
| Statements（语句） | **82.65%** | 11430 / 13828 |
| Branches（分支） | **74.27%** | 1054 / 1419 |
| Functions（函数） | 39.75% | 198 / 498 |
| Lines（行） | **82.65%** | 11430 / 13828 |

### 1.2 核心函数覆盖率（门禁要求 ≥60%）

门禁要求"核心函数单元测试覆盖率 ≥60%"。这里的"核心函数"指业务逻辑层（数据处理、检索、地图换算、校验等纯函数与服务），不含 UI 组件的内联事件处理器。

- **核心逻辑层 `src/lib`：Lines 94.97% / Functions 96.29% / Branches 83.05%** —— 远超门禁线。
  - 该层含：地图下钻 `mapDrill.js`、地理数据加载 `geoLoader.js`、村庄数据 `villages.js`、乡村百科 `encyclopedia.js` 等。
- 服务端逻辑层 `server/lib`、`server/services`（校验、邀请码、文件解析、方案生成、ZIP 导入等）均有专门单测覆盖，见 `src/__tests__/server-*.test.js`（共 20+ 个 server 测试文件）。

### 1.3 关于 Functions 覆盖率偏低的说明

整体语句/行覆盖率 82.65%，全面超过 60% 门禁。整体 Functions 只有 39.75%，是因为分母里含了大量 Vue 组件的内联事件处理函数——这些是 UI 交互，我们通过组件挂载测试覆盖它们的行为，而不是逐个函数单测。门禁真正关注的核心逻辑层，单独看 `src/lib` 达到了 94.97% 行覆盖、96.29% 函数覆盖，这才是核心函数覆盖率的真实水平。

### 1.4 复现方式

```bash
cd DigitalVillageInitiative
npm install
npx vitest run              # 507 tests 全部通过
npx vitest run --coverage   # 末尾打印覆盖率汇总表
```

---

## 门禁 3 · 边界处理（5 个极端输入场景）

以下 5 个场景覆盖五类极端输入，**每个都有自动化测试守护并已通过**（不是临时手测）。

| # | 场景类别 | 极端输入 | 系统行为 | 对应测试 |
|---|---|---|---|---|
| 1 | 空值 | 用户提交空白 `idea`（全是空格） | 校验层 trim 后判空 → 返回 400 拒绝，不进入 AI 生成 | `server-validate.test.js::validatePlanRequest > 空白 idea 报 400` |
| 2 | 超长文本 | `idea` 超过长度上限 | 返回 400 拒绝，防止超长内容打爆下游 | `server-validate.test.js::validatePlanRequest > idea 超长报 400` |
| 3 | 超大 payload | 档案 payload 序列化后超体积上限 | 返回 400 拒绝，防止大对象写库 | `server-validate.test.js::validateDossier > 超大 payload 报 400` |
| 4 | 数量超限 | 上传 ZIP 内文件数超过上限 | 抛 413（Payload Too Large），整包拒绝 | `server-zipImport.test.js::importZip > 文件数超限 → 抛 413` |
| 5 | 损坏输入 | 上传无法解压的损坏 zip（`loadAsync` 抛错） | 捕获后返回 400，不让服务崩溃 | `server-zipImport.test.js::importZip > 损坏 zip → 400` |

### 补充边界（同样有测试）

- **非法枚举降级**：`validateDossier` 收到非法 `stage` 值 → 回落到默认 `plan`，不报错。
- **邀请码碰撞上限**：`makeUniqueInviteCode` 反复碰撞到达重试上限 → 抛错而非死循环（`server-inviteCode.test.js`）。
- **空 ZIP 包**：解压后无有效文件 → 抛 400。
- **单文件失败不中断整包**：ZIP 内某文件存盘失败 → 记为 skipped 继续处理其余文件。

### 设计说明

边界处理不是事后补的，而是校验层（`server/lib/validate.js`）和服务层（`zipImportService`）本身就按"拒绝非法输入、损坏输入不崩溃"的原则设计，并且每一类都有对应单测。例如损坏的 zip 会被 try/catch 兜住返回 400，而不是 500 崩服务。

---

## 门禁 4 · 性能检查

首页加载 <3s、API 响应 <500ms。测量步骤与截图如下。

### 4.1 首页加载时间

1. 构建生产包并预览：
   ```bash
   npm run build
   npm run preview
   ```
2. 打开 Chrome，DevTools → Network 面板，勾选 **Disable cache**。
3. 硬刷新首页（Ctrl+Shift+R），记录底部 **DOMContentLoaded** 与 **Load** 时间。
4. 截图保存至本文件夹（命名 `perf-首页加载.png`），确认 <3s。

### 4.2 API 响应时间（已实测）

启动后端 `npm run server`（3001 端口）后，用 curl 计时：
```bash
curl -o /dev/null -s -w "time_total=%{time_total}s\n" "http://localhost:3001/api/villages?page=1&pageSize=30"
curl -o /dev/null -s -w "time_total=%{time_total}s\n" "http://localhost:3001/api/villages/meta"
```

**实测结果**（2026-07-14，本机 SQLite）：

| 接口 | 首次请求（冷启动） | 稳定后（连续 3 次） |
|---|---|---|
| `/api/villages?page=1&pageSize=30` | 21.4 ms | 6–8 ms |
| `/api/villages/meta` | 43.6 ms | 7 ms |

两个接口均为 HTTP 200，响应时间最高 43.6 ms，**远低于 500 ms 门禁**（约为门禁线的 1/10）。

> 建议现场演示时补一张 curl 输出截图 `perf-api响应.png` 作为证据留档。

### 4.3 截图清单

![image-20260715025113948](C:\Users\LENOVO\AppData\Roaming\Typora\typora-user-images\image-20260715025113948.png)

---

## 门禁 6 · 代码讲解要点

全组成员逐行讲解自己负责模块的准备提纲。

### gym（高一鸣）负责模块

**A. 成果搭建组件族（CompareBars / KpiGrid / TimelineView / PeopleWall）**
- 职责：把采集到的结构化数据（指标对比、KPI、时间线、人物墙）渲染成成果卡片。
- 关键决策：从原 `ResultCards` 大组件里**抽取为 4 个独立小组件**，各自单一职责、可独立测试（对应 5 个组件测试文件）。原因：`ResultCards` 越长越难维护，拆分后每个组件能单独讲清"输入什么 props、渲染成什么"。
- 数据流：`StageTrack` 采集 → `state`（reactive）→ computed 分组 → 传给各卡片组件。

**B. StageTrack 预览/编辑双模式 Tab（`StageTrack.vue`）**
- 职责：实践中工作台，右栏 7 个 Tab（素材/影像/数据/人物/足迹/发现/综述），每 Tab 有预览/编辑两种模式。
- 关键决策：预览模式复用成果卡片组件（所见即所得），编辑模式用表单。预览模式**按 category 分组**，与编辑模式的分组方式保持一致（提交 `46b5cbf` 修的就是两种模式分组不一致的 bug）。
- 数据流：`props.dossier` → `clone()` 进本地 `state` → `save()` 时 emit `update` 让父组件落库。

**C. 本次质量门禁修复（3 个测试文件）**
- `tianditu.js` 天地图 v2 契约修复：见 AI 反思日志第 1 条。
- 两个测试环境/结构对齐修复：见 AI 反思日志第 2、3 条。

### alice（李子健）负责模块

**map3d 三维地图预览模块**（`src/modules/builder/editor/map3d/`）
- 职责：成果搭建台里的 3D 地图组件——天地图搜索定位、缩略图拖拽平移、独立预览页渲染。
- 关键文件与讲解要点见 [代码走查记录.md](代码走查记录.md)（gym 已对该模块做交叉 Review，含对每个文件的理解）。
- 建议 alice 重点准备讲解：`panMath.js` 的 Web Mercator 像素→经纬度换算公式、`buildAndOpen` 跨标签页状态传递机制。

---

## 加分挑战 · 架构重构

完成 AI 抗性挑战中的「架构重构挑战」：选项目中圈复杂度最高的函数 `calcLayoutSlots`（多组件框布局计算），把 12 分支巨型 switch 重构为数据驱动分派。

- **圈复杂度 CC 37 → 2，降幅 95%**（远超挑战要求的 50%）。
- **行为不变**：先写 21 个黄金回归测试锁定重构前输出，重构后逐字节一致；全量回归 528 个测试全绿。
- 详细前后对比见 [架构重构挑战.md](架构重构挑战.md)。
