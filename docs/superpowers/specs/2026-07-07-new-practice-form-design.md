# 「新建实践」建档表单页设计文档

- 日期：2026-07-07
- 落地：「我的实践」子目录下新增独立建档表单页
- 定位：把「新建实践」从「弹出空档案直接进工作台」改为「先填概要表单页 → 提交后进工作台」
- 关联：[我的实践设计](./2026-07-07-my-practice-design.md)

---

## 1. 目标与范围

用户点击「我的实践」列表页的「+ 新建实践」后，进入一个建档表单页，先填写实践概要（实践队名称、目标地、实践主题、起止时间、idea），提交后才创建档案并进入三阶段工作台。

### 解决的问题

现状 `onNew` 直接建一个空档案（`idea: ''`）并打开工作台，带来三个痛点：

- **标题永远是「未命名实践」**：建档时无信息可摘要，后续 StagePlan 只回填 idea 不回填 title，列表卡片始终显示「未命名实践」。
- **连点堆空卡**：每点一次新建就多一张空档案，列表很快变脏。
- **刷新丢失**：无独立 URL，建档态刷新即回到列表。

建档表单页让「只有提交才建档」，一并解决以上三点。

### 本期边界

- 纯前端，无后端。建档仍走 `dossier.js` 的 localStorage 持久化。
- 表单校验放在视图内，不抽独立纯函数（逻辑很薄，与现有 guide/voice 视图惯例一致）。
- 不做草稿自动保存：填表中途离开即丢弃，不建档。

### 成功标准

- 列表页「+ 新建实践」跳转到 `/practice/mine/new` 表单页。
- 填完必填项提交 → 创建档案（标题自动生成）→ 跳进该档案工作台的「实践前」。
- 取消 → 返回列表，不产生空档案。
- 新档案在列表卡片上立即显示队名、目标地、主题、时间段。
- `createDossier` 扩展后有单测覆盖新字段映射；全量测试不回归。

---

## 2. 数据模型

复用现有 `dossier` 结构，仅新增三个字段。建档页字段映射：

| 建档页字段 | 存到档案 | 必填 | 说明 |
|---|---|---|---|
| 实践队名称 | `teamName`（新增） | 是 | 队伍标识 |
| 目标地 | `village` + `plan.targetVillage` | 是 | 复用现有字段，两处同时写入保持一致 |
| 实践主题 | `plan.topic` | 是 | 复用现有选题字段 |
| 开始时间 | `startDate`（新增） | 否 | ISO 日期串（`YYYY-MM-DD`），可空 |
| 结束时间 | `endDate`（新增） | 否 | ISO 日期串，可空 |
| idea | `idea` | 否 | 复用现有字段 |
| （自动生成） | `title` | — | 默认 = `队名·主题`（如「浙大团·非遗文化挖掘」），进工作台后可在「实践前」编辑 |

`createDossier(opts)` 扩展接收 `teamName / village / province / topic / startDate / endDate / idea`，默认值保证不破坏已有调用（现有 `addDossier({ idea: '' })` 等仍可用）。

新档案初始结构（示例）：

```js
{
  id, title: '浙大团·非遗文化挖掘',
  teamName: '浙大团',
  village: '陈家铺村', province: '',
  idea: '',
  plan: { goal: '', topic: '非遗文化挖掘', targetVillage: '陈家铺村', metrics: [], expected: '' },
  refs: [],
  collected: { metricValues: [], materials: [], people: [] },
  startDate: '2026-07-10', endDate: '2026-07-20',
  stage: 'plan',
  createdAt, updatedAt
}
```

### 标题生成规则

- 队名与主题都有 → `队名·主题`
- 只有队名 → `队名`
- 只有主题 → `主题`
- 都无（不会发生，两者必填）→ 回落到现有 `titleFromIdea(idea)` 逻辑

---

## 3. 组件与路由

采用**独立路由页**方案（相比模态框：URL 可回退、刷新不丢、只有提交才建档）。

```
src/modules/practice/mine/
├── NewPracticeView.vue   # 新增：建档表单页（纯表单，提交组装概要交给 dossier.js）
├── MyPracticeView.vue    # 改：onNew 从「建档并打开」改为「跳转 /practice/mine/new」
└── dossier.js            # 改：createDossier 扩展接收概要字段 + 标题生成规则
```

- [routes.js](../../../src/modules/practice/routes.js)：新增 `{ path: '/practice/mine/new', name: 'practice-mine-new', component: NewPracticeView }`。
- [MyPracticeView.vue](../../../src/modules/practice/mine/MyPracticeView.vue)：`onNew` 改为 `router.push('/practice/mine/new')`；列表↔工作台的 `openedId` 打开逻辑保留不动。
- [NewPracticeView.vue](../../../src/modules/practice/mine/NewPracticeView.vue)：
  - 表单字段：队名（text）、目标地（text）、主题（text）、开始/结束（两个原生 `<input type="date">`）、idea（textarea）。
  - 提交：校验通过 → `addDossier(概要)` → `router.push('/practice/mine')` 并让工作台打开该新档案。
  - 取消：`router.push('/practice/mine')`。

### 新档案如何在跳回后自动打开

`MyPracticeView` 的 `openedId` 目前是组件内 ref。建档提交后要让列表页直接进入新档案工作台，用 **query 参数**传递：提交后 `router.push({ path: '/practice/mine', query: { open: newId } })`，`MyPracticeView` 在 `onMounted` 读取 `route.query.open`，若存在则 `openedId.value = 该 id`。这样刷新工作台也能靠 URL 恢复（顺带修掉原设计里工作台刷新丢失的小问题）。

---

## 4. 表单校验、边界、错误处理

**校验（提交时触发，视图内实现）：**

- 队名 / 目标地 / 主题任一为空 → 对应字段下显示红字提示，阻止提交。
- 结束时间早于开始时间 → 时间行显示提示，阻止提交。
- 只填开始或只填结束 → 允许（时间整体可选）。

**边界：**

- 目标地同时写 `village` 与 `plan.targetVillage`，避免两处不一致。
- 取消建档不调用 `addDossier`，不产生空档案。
- `route.query.open` 指向的 id 不存在（如手动改 URL）→ `openedId` 保持空，正常显示列表，不报错。

**错误处理：**

- localStorage 写入仍由 `dossier.js` 内部 try/catch 兜底（沿用现有实现），写失败静默降级。

---

## 5. 测试

- `dossier.js` 扩展 `createDossier` 后，在现有 [mine-dossier.test.js](../../../src/__tests__/mine-dossier.test.js) 新增：
  - 传入 `teamName / village / topic / startDate / endDate` → 断言正确落到 `teamName`、`village`、`plan.targetVillage`、`plan.topic`、`startDate`、`endDate`。
  - 标题生成：队名+主题 → `队名·主题`；仅队名 → `队名`；仅主题 → `主题`。
- 表单校验逻辑耦合视图且很薄，不单独抽纯函数、不加组件测试（项目惯例只测纯函数）。
- 全量 `vitest run` 不回归 + `vite build` 通过。

---

## 6. 落地步骤（供实现计划参考）

1. `dossier.js`：扩展 `createDossier` 接收概要字段 + 标题生成规则；补单测。
2. `NewPracticeView.vue`：建档表单页 + 校验。
3. `routes.js`：新增 `/practice/mine/new`。
4. `MyPracticeView.vue`：`onNew` 改跳转；`onMounted` 读 `route.query.open` 自动打开新档案。
5. 全量跑测 + `vite build` + 手动走一遍「新建 → 填表 → 提交 → 进工作台」闭环。
